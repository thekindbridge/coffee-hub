import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { DeliveryLocation } from '../types';

export type AgentTrackerPermissionState =
  | PermissionState
  | 'unsupported'
  | 'unavailable';

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
  restartAfterMs?: number;
  restartDelayMs?: number;
  geolocationOptions?: PositionOptions;
  onLocation?: (location: DeliveryLocation) => void;
  onStatusChange?: (status: AgentTrackerStatus) => void;
  onPermissionChange?: (permissionState: AgentTrackerPermissionState) => void;
  onError?: (errorMessage: string) => void;
}

const DEFAULT_MINIMUM_UPDATE_INTERVAL_MS = 5000;
const DEFAULT_MINIMUM_DISTANCE_DELTA_METERS = 15;
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

const toDeliveryLocation = (position: GeolocationPosition): DeliveryLocation => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracy: Number.isFinite(position.coords.accuracy)
    ? Number(position.coords.accuracy.toFixed(1))
    : undefined,
});

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
      | 'restartAfterMs'
      | 'restartDelayMs'
      | 'geolocationOptions'
    >
  > &
    Pick<
      AgentTrackerOptions,
      'onLocation' | 'onStatusChange' | 'onPermissionChange' | 'onError'
    >;

  private watchId: number | null = null;
  private restartTimeoutId: number | null = null;
  private healthIntervalId: number | null = null;
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
      restartAfterMs: options.restartAfterMs ?? DEFAULT_RESTART_AFTER_MS,
      restartDelayMs: options.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS,
      geolocationOptions: options.geolocationOptions ?? {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    };
  }

  async start() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      this.permissionState = 'unsupported';
      this.emitPermission();
      this.emitStatus(createStatus('error', 'Geolocation is not supported on this device.'));
      this.emitError('Geolocation is not supported on this device.');
      return false;
    }

    this.hasStopped = false;
    this.emitStatus(createStatus('starting', 'Checking GPS permission...'));
    await this.syncPermissionState();

    if (this.permissionState === 'denied') {
      this.emitStatus(
        createStatus('denied', 'Location permission is blocked. Enable GPS permission to start delivery.'),
      );
      this.emitError('Location permission is blocked for this browser.');
      return false;
    }

    this.beginWatch('watching', 'Streaming live delivery location...');
    return true;
  }

  stop() {
    this.hasStopped = true;
    this.clearWatch();
    this.clearRestartTimer();
    this.clearHealthInterval();
    this.emitStatus(createStatus('stopped', 'Delivery tracking stopped.'));
  }

  private async syncPermissionState() {
    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      this.permissionState = 'unavailable';
      this.emitPermission();
      return;
    }

    try {
      const permissionResult = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });
      this.permissionState = permissionResult.state;
      this.emitPermission();
      permissionResult.onchange = () => {
        this.permissionState = permissionResult.state;
        this.emitPermission();
      };
    } catch (error) {
      console.error('Unable to query geolocation permission', error);
      this.permissionState = 'unavailable';
      this.emitPermission();
    }
  }

  private beginWatch(lifecycle: AgentTrackerLifecycle, message: string) {
    this.clearWatch();
    this.clearRestartTimer();
    this.lastPositionSeenAt = Date.now();

    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.lastPositionSeenAt = Date.now();
        this.handlePosition(position);
      },
      error => {
        this.handlePositionError(error);
      },
      this.options.geolocationOptions,
    );

    this.healthIntervalId = window.setInterval(() => {
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

  private handlePosition(position: GeolocationPosition) {
    if (this.hasStopped) {
      return;
    }

    const nextLocation = toDeliveryLocation(position);
    this.options.onLocation?.(nextLocation);

    const now = Date.now();
    const hasReachedUpdateInterval =
      now - this.lastPersistedAt >= this.options.minimumUpdateIntervalMs;
    const hasMovedEnough =
      !this.lastPersistedLocation ||
      calculateDistanceMeters(this.lastPersistedLocation, nextLocation) >=
        this.options.minimumDistanceDeltaMeters;

    if (!hasReachedUpdateInterval && !hasMovedEnough) {
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
    await Promise.all([
      setDoc(
        doc(db, 'agent_locations', this.options.orderId),
        {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy ?? null,
          agentId: this.options.agentId,
          orderDocId: this.options.orderDocId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, 'delivery_agents', this.options.agentId),
        {
          isActive: true,
          currentOrderId: this.options.orderId,
          currentLocation: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy ?? null,
            updatedAt: serverTimestamp(),
          },
          lastLocation: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy ?? null,
            updatedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, 'delivery_sessions', this.options.orderId),
        {
          orderId: this.options.orderId,
          orderDocId: this.options.orderDocId,
          agentId: this.options.agentId,
          status: 'active',
          updatedAt: serverTimestamp(),
          lastLocation: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy ?? null,
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true },
      ),
    ]);
  }

  private handlePositionError(error: GeolocationPositionError) {
    if (this.hasStopped) {
      return;
    }

    if (error.code === error.PERMISSION_DENIED) {
      this.permissionState = 'denied';
      this.emitPermission();
      this.clearWatch();
      this.clearHealthInterval();
      this.emitStatus(
        createStatus('denied', 'GPS permission denied. Enable location permission to continue.'),
      );
      this.emitError('GPS permission denied.');
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

    this.restartTimeoutId = window.setTimeout(() => {
      this.restartTimeoutId = null;
      if (this.hasStopped) {
        return;
      }

      this.beginWatch('watching', 'Live tracking restored.');
    }, this.options.restartDelayMs);
  }

  private clearWatch() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private clearRestartTimer() {
    if (this.restartTimeoutId !== null) {
      window.clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
  }

  private clearHealthInterval() {
    if (this.healthIntervalId !== null) {
      window.clearInterval(this.healthIntervalId);
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
