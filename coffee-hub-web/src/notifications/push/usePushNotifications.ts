import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserRole } from '../../features/app/types';
import {
  detectFirebaseMessagingSupport,
  getDeviceToken,
  subscribeToMessagingForeground,
} from '../../services/firebase/firebaseMessaging';
import { getCurrentUserIdToken } from '../../services/auth/authService';
import {
  checkNotificationPermission,
  requestNotificationPermission as requestPlatformNotificationPermission,
} from '../../services/platform/permissionService';
import {
  playRoleNotificationEffect,
  resolveNotificationRole,
  subscribeToNativePushNotifications,
} from '../../services/platform/notificationService';
import { storageAdapter } from '../../services/platform/storageAdapter';
import {
  buildForegroundNotificationFromRoute,
  buildNotificationDeduplicationKey,
  resolveNotificationRouteData,
} from './notificationRouter';
import {
  buildPushRegistrationSignature,
  getCachedPushToken,
  getPushRegistrationPlatform,
  getPushRuntime,
  inferDeviceName,
  syncPushRegistration,
} from './pushTokenService';
import type {
  ForegroundPushNotification,
  PushPermissionState,
} from './notificationTypes';

type UsePushNotificationsParams = {
  isAuthReady: boolean;
  isDeliveryAgent: boolean;
  isLoggedIn: boolean;
  currentUserId: string;
  currentUserPhone: string;
  role: UserRole;
};

type PushNotificationsState = {
  permissionState: PushPermissionState;
  isSupported: boolean;
  isSyncing: boolean;
  syncError: string;
  isPermissionBannerVisible: boolean;
  foregroundNotification: ForegroundPushNotification | null;
  requestPermission: () => Promise<void>;
  dismissPermissionBanner: () => void;
  dismissForegroundNotification: () => void;
};

const PUSH_PROMPT_DISMISS_KEY = 'coffee_hub_push_prompt_dismissed';
const FOREGROUND_NOTIFICATION_DEDUP_MS = 15000;

const getPromptDismissKey = (currentUserId: string) =>
  currentUserId
    ? `${PUSH_PROMPT_DISMISS_KEY}:${currentUserId}`
    : PUSH_PROMPT_DISMISS_KEY;

const toPushPermissionState = (
  permissionState: Awaited<ReturnType<typeof checkNotificationPermission>>,
): PushPermissionState => {
  if (
    permissionState === 'granted' ||
    permissionState === 'denied' ||
    permissionState === 'default'
  ) {
    return permissionState;
  }

  if (permissionState === 'unsupported') {
    return 'unsupported';
  }

  return 'default';
};

const toRegistrationPermission = (
  permissionState: PushPermissionState,
) => {
  if (
    permissionState === 'granted' ||
    permissionState === 'denied' ||
    permissionState === 'default'
  ) {
    return permissionState;
  }

  return null;
};

export const usePushNotifications = ({
  currentUserId,
  currentUserPhone,
  isAuthReady,
  isDeliveryAgent,
  isLoggedIn,
  role,
}: UsePushNotificationsParams): PushNotificationsState => {
  const runtime = getPushRuntime();
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    runtime === 'browser' && typeof Notification !== 'undefined'
      ? Notification.permission
      : 'default',
  );
  const [isSupported, setIsSupported] = useState(runtime === 'android');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [foregroundNotification, setForegroundNotification] =
    useState<ForegroundPushNotification | null>(null);
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] =
    useState(false);
  const lastSyncedRegistrationRef = useRef('');
  const recentNotificationKeysRef = useRef(new Map<string, number>());
  const resolvedNotificationRole = resolveNotificationRole(role);

  void currentUserPhone;
  void isDeliveryAgent;

  useEffect(() => {
    let isMounted = true;

    const detectSupport = async () => {
      try {
        if (runtime === 'android') {
          const nextPermissionState = await checkNotificationPermission();
          if (!isMounted) {
            return;
          }

          setIsSupported(true);
          setPermissionState(toPushPermissionState(nextPermissionState));
          setSyncError('');
          return;
        }

        if (runtime !== 'browser') {
          if (!isMounted) {
            return;
          }

          setIsSupported(false);
          setPermissionState('unsupported');
          return;
        }

        const browserSupported = await detectFirebaseMessagingSupport();
        if (!isMounted) {
          return;
        }

        setIsSupported(browserSupported);
        setPermissionState(
          browserSupported && typeof Notification !== 'undefined'
            ? Notification.permission
            : 'unsupported',
        );
      } catch (error) {
        console.error('Failed to detect notification support', error);
        if (!isMounted) {
          return;
        }

        setIsSupported(false);
        setPermissionState('unsupported');
      }
    };

    void detectSupport();

    return () => {
      isMounted = false;
    };
  }, [runtime]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId || !isSupported) {
      lastSyncedRegistrationRef.current = '';
      return;
    }

    setIsPermissionBannerDismissed(
      storageAdapter.read(getPromptDismissKey(currentUserId)) === 'true',
    );
  }, [currentUserId, isAuthReady, isLoggedIn, isSupported]);

  useEffect(() => {
    if (!isSupported || !isLoggedIn) {
      setForegroundNotification(null);
      return undefined;
    }

    const shouldHandleForegroundNotification = (dedupeKey: string) => {
      const now = Date.now();

      Array.from(recentNotificationKeysRef.current.entries()).forEach(([key, timestamp]) => {
        if (timestamp + FOREGROUND_NOTIFICATION_DEDUP_MS < now) {
          recentNotificationKeysRef.current.delete(key);
        }
      });

      const previousTimestamp = recentNotificationKeysRef.current.get(dedupeKey);
      if (previousTimestamp && previousTimestamp + FOREGROUND_NOTIFICATION_DEDUP_MS > now) {
        return false;
      }

      recentNotificationKeysRef.current.set(dedupeKey, now);
      return true;
    };

    const navigateToNotification = (nextUrl: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl === nextUrl) {
        return;
      }

      window.location.assign(nextUrl);
    };

    if (runtime === 'android') {
      let cleanup: (() => Promise<void>) | undefined;
      let isDisposed = false;

      void subscribeToNativePushNotifications({
        onToken: async token => {
          const normalizedToken = token.trim();
          if (!normalizedToken) {
            return;
          }

          const nextSignature = buildPushRegistrationSignature('granted', normalizedToken);
          if (lastSyncedRegistrationRef.current === nextSignature) {
            return;
          }

          setIsSyncing(true);
          setSyncError('');
          try {
            const idToken = await getCurrentUserIdToken();
            await syncPushRegistration({
              deviceName: inferDeviceName(runtime),
              idToken,
              permission: 'granted',
              platform: getPushRegistrationPlatform(runtime),
              token: normalizedToken,
              tokenType: 'fcm',
            });
            if (!isDisposed) {
              lastSyncedRegistrationRef.current = nextSignature;
            }
          } catch (error) {
            console.error('Failed to sync native push token', error);
            if (!isDisposed) {
              setSyncError(
                error instanceof Error
                  ? error.message
                  : 'Unable to enable notifications right now.',
              );
            }
          } finally {
            if (!isDisposed) {
              setIsSyncing(false);
            }
          }
        },
        onRegistrationError: error => {
          console.error('Native push registration failed', error);
          if (!isDisposed) {
            setSyncError(error.message);
          }
        },
        onNotificationReceived: notification => {
          const routeData = resolveNotificationRouteData({
            body: notification.body,
            data: (notification.data || {}) as Record<string, unknown>,
            link: notification.link,
            title: notification.title,
            url: notification.data?.url,
          });
          const dedupeKey = buildNotificationDeduplicationKey(routeData);
          if (!shouldHandleForegroundNotification(dedupeKey)) {
            return;
          }

          const nextNotification = buildForegroundNotificationFromRoute(routeData);
          setForegroundNotification(nextNotification);

          void playRoleNotificationEffect({
            body: nextNotification.body,
            role: resolvedNotificationRole,
            tag: nextNotification.tag,
            title: nextNotification.title,
            url: nextNotification.url,
          });
        },
        onNotificationAction: notification => {
          const routeData = resolveNotificationRouteData({
            body: notification.body,
            data: (notification.data || {}) as Record<string, unknown>,
            link: notification.link,
            title: notification.title,
            url: notification.data?.url,
          });

          navigateToNotification(routeData.url);
        },
      }).then(nextCleanup => {
        if (isDisposed) {
          void nextCleanup();
          return;
        }

        cleanup = nextCleanup;

        if (permissionState === 'granted') {
          void requestPlatformNotificationPermission()
            .then(nextPermission => {
              if (!isDisposed) {
                setPermissionState(toPushPermissionState(nextPermission));
              }
            })
            .catch(error => {
              console.error('Failed to refresh native push registration', error);
              if (!isDisposed) {
                setSyncError('Unable to refresh notifications right now.');
              }
            });
        }
      }).catch(error => {
        console.error('Failed to subscribe to native push notifications', error);
      });

      return () => {
        isDisposed = true;
        if (cleanup) {
          void cleanup();
        }
      };
    }

    return subscribeToMessagingForeground(payload => {
      if (!payload) {
        return;
      }

      if (!payload.title.trim() && !payload.body.trim()) {
        return;
      }

      const routeData = resolveNotificationRouteData({
        body: payload?.body,
        data: payload ? { ...payload, url: payload.url } : null,
        title: payload?.title,
        url: payload?.url,
      });
      const dedupeKey = buildNotificationDeduplicationKey(routeData);
      if (!shouldHandleForegroundNotification(dedupeKey)) {
        return;
      }

      setForegroundNotification(buildForegroundNotificationFromRoute(routeData));
    });
  }, [
    isLoggedIn,
    isSupported,
    permissionState,
    resolvedNotificationRole,
    runtime,
  ]);

  useEffect(() => {
    if (runtime !== 'android' || !isLoggedIn) {
      return;
    }

    let isDisposed = false;
    const resumeListener = CapacitorApp.addListener('resume', () => {
      void checkNotificationPermission()
        .then(nextPermission => {
          if (isDisposed) {
            return;
          }

          const normalizedPermission = toPushPermissionState(nextPermission);
          setPermissionState(normalizedPermission);

          if (normalizedPermission === 'granted') {
            return requestPlatformNotificationPermission().then(refreshedPermission => {
              if (!isDisposed) {
                setPermissionState(toPushPermissionState(refreshedPermission));
              }
            });
          }

          return undefined;
        })
        .catch(error => {
          console.error('Failed to refresh native push token after resume', error);
          if (!isDisposed) {
            setSyncError('Unable to refresh notifications right now.');
          }
        });
    });

    return () => {
      isDisposed = true;
      void resumeListener.then(listener => listener.remove());
    };
  }, [isLoggedIn, runtime]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId || !isSupported) {
      return;
    }

    if (permissionState !== 'granted') {
      const nextPermission = toRegistrationPermission(permissionState);
      if (!nextPermission) {
        return;
      }

      let isCancelled = false;

      const clearServerRegistration = async () => {
        const tokenToDeactivate = getCachedPushToken();
        const nextSignature = buildPushRegistrationSignature(
          nextPermission,
          tokenToDeactivate,
        );
        if (lastSyncedRegistrationRef.current === nextSignature) {
          return;
        }

        setIsSyncing(true);
        setSyncError('');

        try {
          const idToken = await getCurrentUserIdToken();
          await syncPushRegistration({
            deviceName: inferDeviceName(runtime),
            idToken,
            permission: nextPermission,
            platform: getPushRegistrationPlatform(runtime),
            token: tokenToDeactivate,
            tokenType: 'fcm',
          });

          if (!isCancelled) {
            lastSyncedRegistrationRef.current = nextSignature;
          }
        } catch (error) {
          console.error('Failed to clear push registration', error);
          if (!isCancelled) {
            setSyncError(
              error instanceof Error
                ? error.message
                : 'Unable to update notifications right now.',
            );
          }
        } finally {
          if (!isCancelled) {
            setIsSyncing(false);
          }
        }
      };

      void clearServerRegistration();

      return () => {
        isCancelled = true;
      };
    }

    if (runtime !== 'browser') {
      return;
    }

    let isCancelled = false;

    const syncBrowserRegistration = async () => {
      setIsSyncing(true);
      setSyncError('');

      try {
        const token = await getDeviceToken();
        const nextSignature = buildPushRegistrationSignature('granted', token);
        if (!token || isCancelled || lastSyncedRegistrationRef.current === nextSignature) {
          return;
        }

        const idToken = await getCurrentUserIdToken();
        await syncPushRegistration({
          deviceName: inferDeviceName(runtime),
          idToken,
          permission: 'granted',
          platform: getPushRegistrationPlatform(runtime),
          token,
          tokenType: 'fcm',
        });

        if (!isCancelled) {
          lastSyncedRegistrationRef.current = nextSignature;
        }
      } catch (error) {
        console.error('Failed to sync browser push registration', error);
        if (!isCancelled) {
          setSyncError(
            error instanceof Error
              ? error.message
              : 'Unable to enable notifications right now.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsSyncing(false);
        }
      }
    };

    void syncBrowserRegistration();

    return () => {
      isCancelled = true;
    };
  }, [
    currentUserId,
    isAuthReady,
    isLoggedIn,
    isSupported,
    permissionState,
    runtime,
  ]);

  const requestPermission = async () => {
    if (!isSupported) {
      setPermissionState('unsupported');
      return;
    }

    try {
      setSyncError('');
      const nextPermission = await requestPlatformNotificationPermission();
      const normalizedPermission = toPushPermissionState(nextPermission);
      setPermissionState(normalizedPermission);

      if (normalizedPermission === 'granted') {
        storageAdapter.remove(getPromptDismissKey(currentUserId));
        setIsPermissionBannerDismissed(false);
      }
    } catch (error) {
      console.error('Notification permission request failed', error);
      setSyncError('Unable to request notification permission right now.');
    }
  };

  const dismissPermissionBanner = () => {
    setIsPermissionBannerDismissed(true);
    storageAdapter.write(getPromptDismissKey(currentUserId), 'true');
  };

  const isPermissionBannerVisible = useMemo(
    () =>
      isLoggedIn &&
      isSupported &&
      permissionState === 'default' &&
      !isPermissionBannerDismissed,
    [isLoggedIn, isPermissionBannerDismissed, isSupported, permissionState],
  );

  return {
    permissionState,
    isSupported,
    isSyncing,
    syncError,
    isPermissionBannerVisible,
    foregroundNotification,
    requestPermission,
    dismissPermissionBanner,
    dismissForegroundNotification: () => setForegroundNotification(null),
  };
};
