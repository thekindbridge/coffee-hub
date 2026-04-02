import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AdminStackParamList } from '../../navigation/types';
import { ADMIN_ROUTES } from '../../constants/routes';
import {
  AdminProfileScreen,
  MenuManagementScreen,
  OffersManagementScreen,
  OrderManagementScreen,
  OverviewScreen,
} from '../screens';

const Tab = createBottomTabNavigator<AdminStackParamList>();

const getTabIcon = (
  routeName: keyof AdminStackParamList,
  focused: boolean,
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case ADMIN_ROUTES.DASHBOARD:
      return focused ? 'grid' : 'grid-outline';
    case ADMIN_ROUTES.MENU_MANAGEMENT:
      return focused ? 'restaurant' : 'restaurant-outline';
    case ADMIN_ROUTES.ORDERS_MANAGEMENT:
      return focused ? 'receipt' : 'receipt-outline';
    case ADMIN_ROUTES.OFFERS_MANAGEMENT:
      return focused ? 'pricetags' : 'pricetags-outline';
    case ADMIN_ROUTES.PROFILE:
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
};

export const AdminNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName={ADMIN_ROUTES.DASHBOARD}
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#0D0D0D',
        },
        tabBarActiveTintColor: '#C48A5A',
        tabBarInactiveTintColor: '#7E736C',
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            color={color}
            name={getTabIcon(route.name, focused)}
            size={size}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          paddingBottom: 3,
        },
        tabBarStyle: {
          backgroundColor: '#16110D',
          borderTopColor: 'rgba(196, 138, 90, 0.18)',
          borderTopWidth: 1,
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
        },
      })}
    >
      <Tab.Screen
        name={ADMIN_ROUTES.DASHBOARD}
        component={OverviewScreen}
        options={{ tabBarLabel: 'Overview' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.MENU_MANAGEMENT}
        component={MenuManagementScreen}
        options={{ tabBarLabel: 'Menu' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.ORDERS_MANAGEMENT}
        component={OrderManagementScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.OFFERS_MANAGEMENT}
        component={OffersManagementScreen}
        options={{ tabBarLabel: 'Offers' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.PROFILE}
        component={AdminProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
