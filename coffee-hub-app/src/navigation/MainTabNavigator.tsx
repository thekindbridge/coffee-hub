import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TAB_ROUTES } from '../constants/routes';
import { COLORS } from '../constants/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const getTabBarIcon = (routeName: keyof MainTabParamList, focused: boolean) => {
  switch (routeName) {
    case TAB_ROUTES.HOME:
      return focused ? 'home' : 'home-outline';
    case TAB_ROUTES.MENU:
      return focused ? 'restaurant' : 'restaurant-outline';
    case TAB_ROUTES.OFFERS:
      return focused ? 'pricetags' : 'pricetags-outline';
    case TAB_ROUTES.ORDERS:
      return focused ? 'receipt' : 'receipt-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accentStrong,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            name={getTabBarIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        sceneStyle: {
          backgroundColor: COLORS.background,
        },
      })}
    >
      <Tab.Screen
        name={TAB_ROUTES.HOME}
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.MENU}
        component={MenuScreen}
        options={{ tabBarLabel: 'Menu' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.OFFERS}
        component={OffersScreen}
        options={{ tabBarLabel: 'Offers' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ORDERS}
        component={OrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
    </Tab.Navigator>
  );
}
