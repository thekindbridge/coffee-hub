import { persistAgentTrackingLocation } from '../services/firebase/agentTrackingService';
import {
  locationAdapter,
  type LocationAdapterError,
  type LocationPermissionState,
  type LocationRequestOptions,
} from '../services/platform/locationAdapter';
import type { DeliveryLocation } from '../types';

export type AgentTrackerPermissionState = LocationPermissionState;

export type AgentTrackerLifecycle =
  | 'idle'
  | 'starting'
  | 'watching'
  | 'restarting'
  | 'stopped'
  | 'completed'
  | 'denied'
  | 'error';

export interface AgentTrackerStatus {
  lifecycle: AgentTrackerLifecycle;
  message: string;
}

export interface AgentTrackerOptions {
  agentId: string;
  orderId: string;
  orderDocId: string;
  minimumUpdateIntervalMs?: number;
  minimumDistanceDeltaMeters?: number;
  maximumHeartbeatIntervalMs?: number;
  maximumAcceptedAccuracyMeters?: number;
  restartAfterMs?: number;
  restartDelayMs?: number;
  geolocationOptions?: LocationRequestOptions;
  onLocation?: (location: DeliveryLocation) => void;
  onStatusChange?: (status: AgentTrackerStatus) => void;
  onPermissionChange?: (permissionState: AgentTrackerPermissionState) => void;
  onError?: (errorMessage: string) => void;
}

const DEFAULT_MINIMUM_UPDATE_INTERVAL_MS = 5000;
const DEFAULT_MINIMUM_DISTANCE_DELTA_METERS = 15;
const DEFAULT_MAXIMUM_HEARTBEAT_INTERVAL_MS = 30000;
const DEFAULT_MAXIMUM_ACCEPTED_ACCURACY_METERS = 120;
const DEFAULT_RESTART_AFTER_MS = 20000;
const DEFAULT_RESTART_DELAY_MS = 4000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const calculateDistanceMeters = (
  origin: DeliveryLocation,
  destination: DeliveryLocation,
) => {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const haversine =
    (Math.sin(deltaLat / 2) ** 2) +
    (Math.cos(originLat) * Math.cos(destinationLat) * (Math.sin(deltaLng / 2) ** 2));

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const createStatus = (lifecycle: AgentTrackerLifecycle, message: string): AgentTrackerStatus => ({
  lifecycle,
  message,
});

export class AgentTracker {
  private readonly options: Required<
    Pick<
      AgentTrackerOptions,
      | 'agentId'
      | 'orderId'
      | 'orderDocId'
      | 'minimumUpdateIntervalMs'
      | 'minimumDistanceDeltaMeters'
      | 'maximumHeartbeatIntervalMs'
      | 'maximumAcceptedAccuracyMeters'
      | 'restartAfterMs'
      | 'restartDelayMs'
      | 'geolocationOptions'
    >
  > &
    Pick<
      AgentTrackerOptions,
      'onLocation' | 'onStatusChange' | 'onPermissionChange' | 'onError'
    >;

  private watchId: number | string | null = null;
  private restartTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private healthIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastPersistedLocation: DeliveryLocation | null = null;
  private lastPersistedAt = 0;
  private lastPositionSeenAt = 0;
  private writeQueue: Promise<void> = Promise.resolve();
  private permissionState: AgentTrackerPermissionState = 'unavailable';
  private hasStopped = false;

  constructor(options: AgentTrackerOptions) {
    this.options = {
      ...options,
      minimumUpdateIntervalMs:
        options.minimumUpdateIntervalMs ?? DEFAULT_MINIMUM_UPDATE_INTERVAL_MS,
      minimumDistanceDeltaMeters:
        options.minimumDistanceDeltaMeters ?? DEFAULT_MINIMUM_DISTANCE_DELTA_METERS,
      maximumHeartbeatIntervalMs:
        options.maximumHeartbeatIntervalMs ?? DEFAULT_MAXIMUM_HEARTBEAT_INTERVAL_MS,
      maximumAcceptedAccuracyMeters:
        options.maximumAcceptedAccuracyMeters ?? DEFAULT_MAXIMUM_ACCEPTED_ACCURACY_METERS,
      restartAfterMs: options.restartAfterMs ?? DEFAULT_RESTART_AFTER_MS,
      restartDelayMs: options.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS,
      geolocationOptions: options.geolocationOptions ?? {
        enableHighAccuracy: true,
        maximumAgeMs: 0,
        timeoutMs: 18000,
      },
    };
  }

  async start() {
    if (!locationAdapter.isSupported()) {
      this.permissionState = 'unsupported';
      this.emitPermission();
      this.emitStatus(createStatus('error', 'Geolocation is not supported on this device.'));
      this.emitError('Geolocation is not supported on this device.');
      return false;
    }

    this.hasStopped = false;
    this.emitStatus(createStatus('starting', 'Checking location permission...'));
    await this.syncPermissionState();

    if (this.permissionState === 'denied') {
      this.emitStatus(
        createStatus('denied', 'Location access denied. Enable location permission to continue.'),
      );
      this.emitError('Location access denied.');
      return false;
    }

    await this.beginWatch('watching', 'Streaming live delivery location...');
    return this.watchId !== null;
  }

  stop() {
    this.hasStopped = true;
    this.clearWatch();
    this.clearRestartTimer();
    this.clearHealthInterval();
    this.emitStatus(createStatus('stopped', 'Delivery tracking stopped.'));
  }

  private async syncPermissionState() {
    try {
      this.permissionState = await locationAdapter.queryPermission();
      this.emitPermission();
    } catch (error) {
      console.error('Unable to query geolocation permission', error);
      this.permissionState = 'unavailable';
      this.emitPermission();
    }
  }

  private async beginWatch(lifecycle: AgentTrackerLifecycle, message: string) {
    this.clearWatch();
    this.clearRestartTimer();
    this.lastPositionSeenAt = Date.now();

    this.watchId = await locationAdapter.watchLocation({
      onLocation: location => {
        this.lastPositionSeenAt = Date.now();
        this.handleLocation(location);
      },
      onError: error => {
        this.handleLocationError(error);
      },
      options: this.options.geolocationOptions,
    });

    if (this.watchId === null) {
      this.permissionState = 'unsupported';
      this.emitPermission();
      this.emitStatus(createStatus('error', 'Unable to start live delivery tracking.'));
      this.emitError('Unable to start live delivery tracking.');
      return;
    }

    this.healthIntervalId = globalThis.setInterval(() => {
      if (this.hasStopped) {
        return;
      }

      if (Date.now() - this.lastPositionSeenAt <= this.options.restartAfterMs) {
        return;
      }

      this.scheduleRestart('GPS signal paused. Reconnecting live tracking...');
    }, Math.max(5000, Math.floor(this.options.restartAfterMs / 2)));

    this.emitStatus(createStatus(lifecycle, message));
  }

  private handleLocation(nextLocation: DeliveryLocation) {
    if (this.hasStopped) {
      return;
    }

    this.options.onLocation?.(nextLocation);

    if (
      nextLocation.accuracy &&
      nextLocation.accuracy > this.options.maximumAcceptedAccuracyMeters &&
      this.lastPersistedLocation
    ) {
      return;
    }

    const now = Date.now();
    const isFirstPersist = !this.lastPersistedLocation;
    const hasReachedUpdateInterval =
      now - this.lastPersistedAt >= this.options.minimumUpdateIntervalMs;
    const hasMovedEnough =
      isFirstPersist ||
      calculateDistanceMeters(this.lastPersistedLocation, nextLocation) >=
        this.options.minimumDistanceDeltaMeters;
    const hasHeartbeatExpired =
      now - this.lastPersistedAt >= this.options.maximumHeartbeatIntervalMs;

    if (!isFirstPersist && !hasReachedUpdateInterval) {
      return;
    }

    if (!isFirstPersist && !hasMovedEnough && !hasHeartbeatExpired) {
      return;
    }

    this.lastPersistedAt = now;
    this.lastPersistedLocation = nextLocation;

    this.writeQueue = this.writeQueue
      .then(async () => {
        await this.persistLocation(nextLocation);
      })
      .catch(error => {
        console.error('Failed to process GPS update', error);
        this.emitStatus(createStatus('error', 'Unable to update delivery tracking.'));
        this.emitError('Unable to update delivery tracking.');
      });
  }

  private async persistLocation(location: DeliveryLocation) {
    await persistAgentTrackingLocation({
      agentId: this.options.agentId,
      location,
      orderDocId: this.options.orderDocId,
      orderId: this.options.orderId,
    });
  }

  private handleLocationError(error: LocationAdapterError) {
    if (this.hasStopped) {
      return;
    }

    if (error.code === 'permission_denied') {
      this.permissionState = 'denied';
      this.emitPermission();
      this.clearWatch();
      this.clearHealthInterval();
      this.emitStatus(
        createStatus('denied', 'Location access denied. Enable location permission to continue.'),
      );
      this.emitError('Location access denied.');
      return;
    }

    const message = error.message || 'GPS temporarily unavailable.';
    this.emitStatus(createStatus('restarting', `${message} Reconnecting...`));
    this.emitError(message);
    this.scheduleRestart('GPS signal interrupted. Reconnecting live tracking...');
  }

  private scheduleRestart(message: string) {
    if (this.restartTimeoutId !== null || this.hasStopped) {
      return;
    }

    this.clearWatch();
    this.emitStatus(createStatus('restarting', message));

    this.restartTimeoutId = globalThis.setTimeout(() => {
      this.restartTimeoutId = null;
      if (this.hasStopped) {
        return;
      }

      void this.beginWatch('watching', 'Live tracking restored.');
    }, this.options.restartDelayMs);
  }

  private clearWatch() {
    if (this.watchId !== null) {
      locationAdapter.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private clearRestartTimer() {
    if (this.restartTimeoutId !== null) {
      globalThis.clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
  }

  private clearHealthInterval() {
    if (this.healthIntervalId !== null) {
      globalThis.clearInterval(this.healthIntervalId);
      this.healthIntervalId = null;
    }
  }

  private emitStatus(status: AgentTrackerStatus) {
    this.options.onStatusChange?.(status);
  }

  private emitPermission() {
    this.options.onPermissionChange?.(this.permissionState);
  }

  private emitError(message: string) {
    this.options.onError?.(message);
  }
}

export const createAgentTracker = (options: AgentTrackerOptions) => new AgentTracker(options);
