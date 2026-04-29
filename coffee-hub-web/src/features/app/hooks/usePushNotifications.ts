import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserRole } from '../types';
import {
  detectFirebaseMessagingSupport,
  getDeviceToken,
  subscribeToMessagingForeground,
  type FirebaseForegroundNotification,
  type FirebaseMessagingPermissionState,
} from '../../../services/firebase/firebaseMessaging';
import {
  type PushRegistrationPermission,
  registerPushToken,
} from '../../../services/api/notificationsService';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import {
  isNativeAndroidNotificationRuntime,
  playRoleNotificationEffect,
  resolveNotificationRole,
  subscribeToNativePushNotifications,
} from '../../../services/platform/notificationService';
import {
  checkNotificationPermission,
  requestNotificationPermission as requestPlatformNotificationPermission,
} from '../../../services/platform/permissionService';
import { storageAdapter } from '../../../services/platform/storageAdapter';

type UsePushNotificationsParams = {
  isAuthReady: boolean;
  isLoggedIn: boolean;
  currentUserId: string;
  currentUserPhone: string;
  isDeliveryAgent: boolean;
  role: UserRole;
};

type PushNotificationsState = {
  permissionState: FirebaseMessagingPermissionState;
  isSupported: boolean;
  isSyncing: boolean;
  syncError: string;
  isPermissionBannerVisible: boolean;
  foregroundNotification: FirebaseForegroundNotification | null;
  requestPermission: () => Promise<void>;
  dismissPermissionBanner: () => void;
  dismissForegroundNotification: () => void;
};

const PUSH_PROMPT_DISMISS_KEY = 'coffee_hub_push_prompt_dismissed';
const getPromptDismissKey = (currentUserId: string) =>
  currentUserId
    ? `${PUSH_PROMPT_DISMISS_KEY}:${currentUserId}`
    : PUSH_PROMPT_DISMISS_KEY;

const toFirebasePermissionState = (
  permissionState: Awaited<ReturnType<typeof checkNotificationPermission>>,
): FirebaseMessagingPermissionState => {
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
  permissionState: FirebaseMessagingPermissionState,
): PushRegistrationPermission | null => {
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
  isAuthReady,
  isLoggedIn,
  currentUserId,
  currentUserPhone,
  isDeliveryAgent,
  role,
}: UsePushNotificationsParams): PushNotificationsState => {
  const [permissionState, setPermissionState] = useState<FirebaseMessagingPermissionState>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [foregroundNotification, setForegroundNotification] =
    useState<FirebaseForegroundNotification | null>(null);
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] =
    useState(false);
  const lastSyncedRegistrationRef = useRef('');
  const resolvedNotificationRole = resolveNotificationRole(role);
  const isNativeAndroid = isNativeAndroidNotificationRuntime();

  useEffect(() => {
    let isMounted = true;

    const detectSupport = async () => {
      try {
        if (isNativeAndroid) {
          const nativePermission = await checkNotificationPermission();
          if (!isMounted) {
            return;
          }

          setIsSupported(true);
          setPermissionState(toFirebasePermissionState(nativePermission));
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
  }, [isNativeAndroid]);

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

    if (isNativeAndroid) {
      let cleanup: (() => Promise<void>) | undefined;
      let isDisposed = false;

      void subscribeToNativePushNotifications({
        onToken: async token => {
          const normalizedToken = token.trim();
          if (!normalizedToken) {
            return;
          }

          const nextSignature = `granted:${normalizedToken}`;
          if (lastSyncedRegistrationRef.current === nextSignature) {
            return;
          }

          setIsSyncing(true);
          setSyncError('');
          try {
            const idToken = await getCurrentUserIdToken();
            await registerPushToken(
              {
                permission: 'granted',
                token: normalizedToken,
                tokenType: 'fcm',
              },
              idToken,
            );
            lastSyncedRegistrationRef.current = nextSignature;
          } catch (error) {
            console.error('Failed to sync native push token', error);
            setSyncError(
              error instanceof Error
                ? error.message
                : 'Unable to enable notifications right now.',
            );
          } finally {
            setIsSyncing(false);
          }
        },
        onRegistrationError: error => {
          console.error('Native push registration failed', error);
          setSyncError(error.message);
        },
        onNotificationReceived: notification => {
          const title = `${notification.title || 'COFFEE-HUB'}`.trim();
          const body = `${notification.body || ''}`.trim();
          const url = `${notification.data?.url || notification.data?.link || '/'}`.trim() || '/';
          const tag = `${notification.tag || notification.data?.tag || ''}`.trim();

          setForegroundNotification({
            id: `${Date.now()}`,
            title,
            body,
            url,
          });

          void playRoleNotificationEffect({
            body,
            role: resolvedNotificationRole,
            tag,
            title,
            url,
          });
        },
        onNotificationAction: notification => {
          const targetUrl = `${notification.data?.url || notification.link || '/'}`.trim() || '/';
          if (typeof window !== 'undefined') {
            window.location.assign(targetUrl);
          }
        },
      }).then(nextCleanup => {
        if (isDisposed) {
          void nextCleanup();
          return;
        }

        cleanup = nextCleanup;

        if (permissionState === 'granted') {
          void requestPlatformNotificationPermission().catch(error => {
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

    return subscribeToMessagingForeground(nextNotification => {
      if (!nextNotification) {
        return;
      }

      setForegroundNotification(nextNotification);
    });
  }, [
    currentUserId,
    isLoggedIn,
    isNativeAndroid,
    isSupported,
    permissionState,
    resolvedNotificationRole,
  ]);

  useEffect(() => {
    if (!isNativeAndroid || !isLoggedIn || permissionState !== 'granted') {
      return;
    }

    let isDisposed = false;
    const resumeListener = CapacitorApp.addListener('resume', () => {
      void requestPlatformNotificationPermission().catch(error => {
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
  }, [isLoggedIn, isNativeAndroid, permissionState]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId || !isSupported) {
      return;
    }

    if (permissionState !== 'granted' || isNativeAndroid) {
      const nextPermission = toRegistrationPermission(permissionState);
      if (!nextPermission || permissionState === 'granted') {
        return;
      }

      let isCancelled = false;

      const clearServerRegistration = async () => {
        const nextSignature = `${nextPermission}:`;
        if (lastSyncedRegistrationRef.current === nextSignature) {
          return;
        }

        setIsSyncing(true);
        setSyncError('');

        try {
          const idToken = await getCurrentUserIdToken();
          await registerPushToken(
            {
              permission: nextPermission,
              token: '',
              tokenType: 'fcm',
            },
            idToken,
          );

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

    let isCancelled = false;

    const syncBrowserRegistration = async () => {
      setIsSyncing(true);
      setSyncError('');

      try {
        const token = await getDeviceToken();
        const nextSignature = `granted:${token}`;
        if (!token || isCancelled || lastSyncedRegistrationRef.current === nextSignature) {
          return;
        }

        const idToken = await getCurrentUserIdToken();
        await registerPushToken(
          {
            permission: 'granted',
            token,
            tokenType: 'fcm',
          },
          idToken,
        );

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
    isAuthReady,
    isLoggedIn,
    isNativeAndroid,
    isSupported,
    permissionState,
    currentUserId,
  ]);

  const requestPermission = async () => {
    if (!isSupported) {
      setPermissionState('unsupported');
      return;
    }

    try {
      setSyncError('');
      const nextPermission = await requestPlatformNotificationPermission();
      setPermissionState(toFirebasePermissionState(nextPermission));

      if (nextPermission === 'granted') {
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
