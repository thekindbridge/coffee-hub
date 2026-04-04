import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { TAB_ROUTES } from '../constants/routes';
import { CustomerAppShell } from './CustomerAppShell';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const withCustomerShell = <TProps extends object>(
  ScreenComponent: React.ComponentType<TProps>,
) => function CustomerShellScreen(props: TProps) {
  return (
    <CustomerAppShell>
      <ScreenComponent {...props} />
    </CustomerAppShell>
  );
};

const HomeShellScreen = withCustomerShell(HomeScreen);
const MenuShellScreen = withCustomerShell(MenuScreen);
const OffersShellScreen = withCustomerShell(OffersScreen);
const OrdersShellScreen = withCustomerShell(OrdersScreen);
const ProfileShellScreen = withCustomerShell(ProfileScreen);

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
    case TAB_ROUTES.PROFILE:
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
};

function TabIcon({
  color,
  focused,
  routeName,
}: {
  color: string;
  focused: boolean;
  routeName: keyof MainTabParamList;
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const translateY = useRef(new Animated.Value(focused ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        bounciness: 10,
        speed: 20,
        toValue: focused ? 1 : 0.92,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        bounciness: 8,
        speed: 20,
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.iconWrap,
        {
          backgroundColor: focused ? theme.colors.tag : 'transparent',
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <Ionicons
        name={getTabBarIcon(routeName, focused)}
        size={22}
        color={color}
      />
    </Animated.View>
  );
}

export function MainTabNavigator() {
  const { theme } = useTheme();

  console.log('[MainTabNavigator] render');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused, size }) => (
          <TabIcon
            color={color}
            focused={focused}
            routeName={route.name}
          />
        ),
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 10,
          paddingBottom: 12,
          shadowColor: theme.colors.shadowStrong,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: theme.isDark ? 0.38 : 0.18,
          shadowRadius: 18,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      })}
    >
      <Tab.Screen
        name={TAB_ROUTES.HOME}
        component={HomeShellScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.MENU}
        component={MenuShellScreen}
        options={{ tabBarLabel: 'Menu' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.OFFERS}
        component={OffersShellScreen}
        options={{ tabBarLabel: 'Offers' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ORDERS}
        component={OrdersShellScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name={TAB_ROUTES.PROFILE}
        component={ProfileShellScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    minWidth: 44,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
  },
});
