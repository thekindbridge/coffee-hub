import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AdminStackParamList } from '../../navigation/types';
import { ADMIN_ROUTES } from '../../constants/routes';
import {
  AdminDashboardScreen,
  AdminMenuScreen,
  AdminOffersScreen,
  AdminOrdersScreen,
  AdminProfileScreen,
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
          backgroundColor: '#171210',
        },
        tabBarActiveTintColor: '#E2BE98',
        tabBarInactiveTintColor: '#8F7C74',
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
          fontWeight: '800',
          paddingBottom: 3,
        },
        tabBarStyle: {
          backgroundColor: 'rgba(29, 22, 19, 0.96)',
          borderTopWidth: 0,
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          shadowColor: '#080504',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 16,
        },
      })}
    >
      <Tab.Screen
        name={ADMIN_ROUTES.DASHBOARD}
        component={AdminDashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.MENU_MANAGEMENT}
        component={AdminMenuScreen}
        options={{ tabBarLabel: 'Menu' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.ORDERS_MANAGEMENT}
        component={AdminOrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name={ADMIN_ROUTES.OFFERS_MANAGEMENT}
        component={AdminOffersScreen}
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
