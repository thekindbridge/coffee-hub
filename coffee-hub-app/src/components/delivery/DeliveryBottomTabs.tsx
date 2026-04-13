import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useTheme } from '../../theme';
import { ScalePressable } from '../ui/ScalePressable';
import { getDeliveryPalette, getDeliveryShadow } from './designSystem';

type DeliveryTabButton = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  routeName: string;
  visualId: 'home' | 'map' | 'earnings' | 'orders' | 'profile';
};

const TAB_BUTTONS: DeliveryTabButton[] = [
  {
    icon: 'home',
    label: 'Home',
    routeName: DELIVERY_ROUTES.DASHBOARD,
    visualId: 'home',
  },
  {
    icon: 'map',
    label: 'Map',
    routeName: DELIVERY_ROUTES.MAP,
    visualId: 'map',
  },
  {
    icon: 'wallet',
    label: 'Earnings',
    routeName: DELIVERY_ROUTES.EARNINGS,
    visualId: 'earnings',
  },
  {
    icon: 'receipt',
    label: 'Orders',
    routeName: DELIVERY_ROUTES.ORDERS,
    visualId: 'orders',
  },
  {
    icon: 'person',
    label: 'Profile',
    routeName: DELIVERY_ROUTES.PROFILE,
    visualId: 'profile',
  },
];

const ACTIVE_VISUAL_BY_ROUTE: Record<string, DeliveryTabButton['visualId']> = {
  [DELIVERY_ROUTES.DASHBOARD]: 'home',
  [DELIVERY_ROUTES.EARNINGS]: 'earnings',
  [DELIVERY_ROUTES.MAP]: 'map',
  [DELIVERY_ROUTES.ORDERS]: 'orders',
  [DELIVERY_ROUTES.PROFILE]: 'profile',
};

export function DeliveryBottomTabs({
  navigation,
  state,
}: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const activeRouteName = state.routes[state.index]?.name || DELIVERY_ROUTES.DASHBOARD;
  const activeVisualId = ACTIVE_VISUAL_BY_ROUTE[activeRouteName] || 'home';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottom, 12) }]}>
      <View style={[styles.shadowWrap, getDeliveryShadow(theme)]}>
        <View style={styles.surface}>
          <BlurView
            tint={theme.isDark ? 'dark' : 'light'}
            intensity={88}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.overlay,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(32, 24, 21, 0.82)'
                  : 'rgba(255, 250, 245, 0.86)',
              },
            ]}
          />

          <View style={styles.row}>
            {TAB_BUTTONS.map(button => {
              const isFocused = button.visualId === activeVisualId;

              return (
                <ScalePressable
                  key={button.visualId}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  onPress={() => {
                    navigation.navigate(button.routeName as never);
                  }}
                  scaleTo={0.96}
                  style={styles.button}
                >
                  {isFocused ? (
                    <LinearGradient
                      colors={palette.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activePill}
                    >
                      <Ionicons name={button.icon} size={18} color={palette.background} />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={`${button.icon}-outline` as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={palette.textMuted}
                      />
                    </View>
                  )}

                  <Text style={[styles.label, isFocused ? styles.labelActive : null]}>
                    {button.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  shadowWrap: {
    borderRadius: 30,
  },
  surface: {
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  overlay: {
    opacity: 0.96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 82,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  iconWrap: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    minWidth: 52,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8F827C',
  },
  labelActive: {
    color: '#F2DFD7',
  },
});
