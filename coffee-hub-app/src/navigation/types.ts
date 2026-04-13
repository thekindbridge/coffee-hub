import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  ADMIN_ROUTES,
  DELIVERY_ROUTES,
  ROOT_ROUTES,
  TAB_ROUTES,
} from '../constants/routes';

export type MainTabParamList = {
  [TAB_ROUTES.HOME]: undefined;
  [TAB_ROUTES.MENU]: undefined;
  [TAB_ROUTES.OFFERS]: undefined;
  [TAB_ROUTES.ORDERS]: undefined;
  [TAB_ROUTES.PROFILE]: { openEdit?: boolean } | undefined;
};

export type RootStackParamList = {
  [ROOT_ROUTES.MAIN_TABS]: NavigatorScreenParams<MainTabParamList> | undefined;
  [ROOT_ROUTES.CART]: undefined;
  [ROOT_ROUTES.CHECKOUT_DETAILS]: undefined;
};

export type AdminStackParamList = {
  [ADMIN_ROUTES.DASHBOARD]: undefined;
  [ADMIN_ROUTES.MENU_MANAGEMENT]: undefined;
  [ADMIN_ROUTES.OFFERS_MANAGEMENT]: undefined;
  [ADMIN_ROUTES.ORDERS_MANAGEMENT]: undefined;
  [ADMIN_ROUTES.PROFILE]: undefined;
};

export type DeliveryTabParamList = {
  [DELIVERY_ROUTES.DASHBOARD]: undefined;
  [DELIVERY_ROUTES.MAP]: { orderDocId?: string } | undefined;
  [DELIVERY_ROUTES.ORDERS]: undefined;
  [DELIVERY_ROUTES.EARNINGS]: undefined;
  [DELIVERY_ROUTES.PROFILE]: undefined;
};

export type DeliveryStackParamList = {
  [DELIVERY_ROUTES.TABS]: NavigatorScreenParams<DeliveryTabParamList> | undefined;
  [DELIVERY_ROUTES.ORDER_DETAILS]: { orderDocId: string };
};
