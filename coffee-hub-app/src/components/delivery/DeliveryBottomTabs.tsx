import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScalePressable } from '../ui/ScalePressable';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useTheme, useThemedStyles } from '../../theme';

const getTabBarIcon = (routeName: string, focused: boolean) => {
  switch (routeName) {
    case DELIVERY_ROUTES.DASHBOARD:
      return focused ? 'home' : 'home-outline';
    case DELIVERY_ROUTES.ORDERS:
      return focused ? 'receipt' : 'receipt-outline';
    case DELIVERY_ROUTES.EARNINGS:
      return focused ? 'wallet' : 'wallet-outline';
    case DELIVERY_ROUTES.PROFILE:
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
};

const getTabLabel = (routeName: string) => {
  switch (routeName) {
    case DELIVERY_ROUTES.DASHBOARD:
      return 'Home';
    case DELIVERY_ROUTES.ORDERS:
      return 'Orders';
    case DELIVERY_ROUTES.EARNINGS:
      return 'Earnings';
    case DELIVERY_ROUTES.PROFILE:
      return 'Profile';
    default:
      return routeName;
  }
};

export function DeliveryBottomTabs({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottom, 12) }]}>
      <View style={[styles.tabRow, theme.shadows.floating]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? theme.colors.onPrimary : theme.colors.textMuted;

          return (
            <ScalePressable
              key={route.key}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
              accessibilityRole="button"
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: 'tabPress',
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              scaleTo={0.96}
              style={[styles.tabButton, isFocused ? styles.tabButtonActive : null]}
            >
              <Ionicons
                color={color}
                name={getTabBarIcon(route.name, isFocused)}
                size={20}
              />
              <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null]}>
                {getTabLabel(route.name)}
              </Text>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: theme.radius.md,
    paddingHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.onPrimary,
  },
});
