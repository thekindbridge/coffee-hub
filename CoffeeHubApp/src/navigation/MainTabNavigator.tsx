import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ROUTES } from '../constants/routes';
import { palette } from '../constants/theme';
import { CartScreen } from '../screens/CartScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: palette.surface,
        },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        sceneStyle: {
          backgroundColor: palette.background,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen component={HomeScreen} name={ROUTES.Home} options={{ title: 'Home' }} />
      <Tab.Screen component={CartScreen} name={ROUTES.Cart} options={{ title: 'Cart' }} />
      <Tab.Screen component={OrdersScreen} name={ROUTES.Orders} options={{ title: 'Orders' }} />
      <Tab.Screen
        component={ProfileScreen}
        name={ROUTES.Profile}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
