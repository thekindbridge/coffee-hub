import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScalePressable } from '../components/ui/ScalePressable';
import { TAB_ROUTES } from '../constants/routes';
import { CustomerAppShell } from './CustomerAppShell';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme';
import {
  CUSTOMER_TAB_BAR_BOTTOM_MARGIN,
  CUSTOMER_TAB_BAR_HEIGHT,
  CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN,
  getCustomerPalette,
} from '../components/customer/designSystem';
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

function TabBarButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  style,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onLongPress={onLongPress}
      onPress={onPress}
      scaleTo={0.96}
      style={style}
      testID={testID}
    >
      {children}
    </ScalePressable>
  );
}

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
  const palette = getCustomerPalette(theme);
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
        focused ? styles.iconWrapFocused : null,
        {
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      {focused ? (
        <LinearGradient
          colors={palette.ctaGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Ionicons
        name={getTabBarIcon(routeName, focused)}
        size={22}
        color={focused ? palette.background : color}
      />
    </Animated.View>
  );
}

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const tabBarBottom = insets.bottom + CUSTOMER_TAB_BAR_BOTTOM_MARGIN;
  const tabBarHeight = CUSTOMER_TAB_BAR_HEIGHT;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarButton: props => <TabBarButton {...props} />,
        tabBarIcon: ({ color, focused, size }) => (
          <TabIcon
            color={color}
            focused={focused}
            routeName={route.name}
          />
        ),
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              tint={theme.isDark ? 'dark' : 'light'}
              intensity={theme.isDark ? 82 : 92}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: theme.isDark
                    ? palette.surfaceGlassStrong
                    : 'rgba(255, 249, 244, 0.72)',
                },
              ]}
            />
            <LinearGradient
              pointerEvents="none"
              colors={theme.isDark
                ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.05)', 'rgba(15, 10, 7, 0.22)']
                : ['rgba(255, 255, 255, 0.52)', 'rgba(255, 255, 255, 0.14)', 'rgba(75, 46, 43, 0.05)']}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          left: CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN,
          right: CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN,
          bottom: tabBarBottom,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 24,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: 8,
          overflow: 'hidden',
          shadowColor: palette.cocoa,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: theme.isDark ? 0.2 : 0.14,
          shadowRadius: 28,
          elevation: 14,
        },
        tabBarItemStyle: {
          paddingTop: 0,
          paddingBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
        },
        sceneStyle: {
          backgroundColor: palette.background,
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
    minWidth: 38,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  iconWrapFocused: {
    minWidth: 44,
  },
});
