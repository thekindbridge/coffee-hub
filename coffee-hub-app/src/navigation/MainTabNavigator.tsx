import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ScalePressable } from '../components/ui/ScalePressable';
import { TAB_ROUTES } from '../constants/routes';
import { CustomerAppShell } from './CustomerAppShell';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme';
import { getCustomerPalette } from '../components/customer/designSystem';
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
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.caramel,
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
                    ? 'rgba(44, 34, 31, 0.62)'
                    : 'rgba(255, 249, 244, 0.72)',
                },
              ]}
            />
            <LinearGradient
              pointerEvents="none"
              colors={theme.isDark
                ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0.12)']
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
          left: 14,
          right: 14,
          bottom: 12,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 30,
          height: 82,
          paddingTop: 12,
          paddingBottom: 12,
          overflow: 'hidden',
          shadowColor: theme.colors.shadowStrong,
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: theme.isDark ? 0.34 : 0.16,
          shadowRadius: 30,
          elevation: 18,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
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
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  iconWrapFocused: {
    minWidth: 50,
  },
});
