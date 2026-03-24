import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';

import { ROUTES } from '../constants/routes';
import { palette } from '../constants/theme';
import { CartScreen } from '../screens/CartScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function getTabIcon(route: RouteProp<MainTabParamList, keyof MainTabParamList>) {
  switch (route.name) {
    case ROUTES.Home:
      return 'home';
    case ROUTES.Cart:
      return 'shopping-bag';
    case ROUTES.Orders:
      return 'clock';
    case ROUTES.Profile:
      return 'user';
    default:
      return 'circle';
  }
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: palette.surface,
        },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerTitleAlign: 'center',
        sceneStyle: {
          backgroundColor: palette.background,
        },
        tabBarActiveTintColor: palette.highlight,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarIcon: ({ color, focused, size }) => (
          <Feather
            color={color}
            name={getTabIcon(route)}
            size={focused ? size + 1 : size}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: 'rgba(20, 14, 12, 0.98)',
          borderTopColor: 'transparent',
          borderRadius: 24,
          bottom: 14,
          elevation: 0,
          height: 72,
          left: 16,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          right: 16,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },
        tabBarHideOnKeyboard: true,
      })}
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
