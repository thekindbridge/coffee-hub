import type { AccessManagerState } from '../../features/app/hooks/useAccessManager';
import type { useOrderOperations } from '../../features/orders/hooks/useOrderOperations';
import type { ProfileManagerState } from '../../features/app/hooks/useProfileManager';
import type { usePushNotifications } from '../../features/app/hooks/usePushNotifications';
import type { useRealtimeAppData } from '../../features/app/hooks/useRealtimeAppData';
import type { ShopTimingManagerState } from '../../features/app/hooks/useShopTimingManager';
import type { useInstallPrompt } from '../../features/customer/hooks/useInstallPrompt';
import type { useOffers } from '../../features/offers/hooks/useOffers';
import type { Order } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

export type SessionData = ReturnType<typeof useRealtimeAppData>;
export type PushNotificationsState = ReturnType<typeof usePushNotifications>;
export type OffersState = ReturnType<typeof useOffers>;
export type InstallPromptState = ReturnType<typeof useInstallPrompt>;
export type OrderOperations = ReturnType<typeof useOrderOperations>;

export type ShellSharedProps = {
  accessManager: AccessManagerState;
  offersState: OffersState;
  orderOperations: OrderOperations;
  profileManager: ProfileManagerState;
  pushNotifications: PushNotificationsState;
  session: SessionData;
  shopTimingManager: ShopTimingManagerState;
};

export type CustomerShellProps = {
  installPrompt: InstallPromptState;
  orderStatus: Order | null;
  setOrderStatus: Dispatch<SetStateAction<Order | null>>;
} & ShellSharedProps;
