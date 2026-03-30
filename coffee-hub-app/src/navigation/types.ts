import type { NavigatorScreenParams } from '@react-navigation/native';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';

export type MainTabParamList = {
  [TAB_ROUTES.HOME]: undefined;
  [TAB_ROUTES.MENU]: undefined;
  [TAB_ROUTES.OFFERS]: undefined;
  [TAB_ROUTES.ORDERS]: undefined;
};

export type RootStackParamList = {
  [ROOT_ROUTES.MAIN_TABS]: NavigatorScreenParams<MainTabParamList> | undefined;
  [ROOT_ROUTES.CART]: undefined;
  [ROOT_ROUTES.CHECKOUT_DETAILS]: undefined;
};
