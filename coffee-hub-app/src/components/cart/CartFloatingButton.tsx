import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePulseOnChange, useTheme, useThemedStyles } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  CUSTOMER_FLOATING_CART_BOTTOM_OFFSET,
  CUSTOMER_FLOATING_CART_MIN_HEIGHT,
  getCustomerPalette,
} from '../customer/designSystem';
import { ScalePressable } from '../ui/ScalePressable';

type CartFloatingButtonProps = {
  cartCount: number;
  total: number;
  onPress: () => void;
};

export function CartFloatingButton({
  cartCount,
  total,
  onPress,
}: CartFloatingButtonProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const pulseStyle = usePulseOnChange(cartCount);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + CUSTOMER_FLOATING_CART_BOTTOM_OFFSET }]}
    >
      <Animated.View style={pulseStyle}>
        <ScalePressable
          accessibilityRole="button"
          onPress={onPress}
          scaleTo={0.96}
          style={[styles.buttonWrap, theme.shadows.floating]}
        >
          <LinearGradient
            colors={palette.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="bag-handle" size={18} color={palette.background} />
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>
                View Cart <Text style={styles.count}>({cartCount})</Text>
              </Text>
              <Text style={styles.subtitle}>Ready for checkout</Text>
            </View>

            <Text style={styles.total}>{formatCurrency(total)}</Text>
          </LinearGradient>
        </ScalePressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: theme.spacing.md,
      right: theme.spacing.md,
      alignItems: 'flex-end',
    },
    buttonWrap: {
      alignSelf: 'flex-end',
      borderRadius: 24,
      maxWidth: 248,
      overflow: 'hidden',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      minHeight: CUSTOMER_FLOATING_CART_MIN_HEIGHT,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(23, 18, 16, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: {
      marginLeft: 10,
      marginRight: 12,
    },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.background,
    },
    count: {
      color: palette.background,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 11,
      color: 'rgba(23, 18, 16, 0.72)',
    },
    total: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.background,
    },
  });
};
