import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { palette, spacing } from '../constants/theme';
import { useCart } from '../hooks';

export function CartScreen() {
  const { clearCart, itemCount, subtotal } = useCart();

  return (
    <ScreenLayout
      subtitle="Cart state already lives in a dedicated store so checkout can be added later without rewriting screen structure."
      title="Cart"
    >
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.title}>
            {itemCount === 0 ? 'Your cart is empty.' : `${itemCount} item(s) ready for checkout.`}
          </Text>
          <Text style={styles.body}>Subtotal: Rs. {subtotal.toFixed(2)}</Text>
        </AppCard>
        <AppButton
          disabled={itemCount === 0}
          label="Clear Cart"
          onPress={clearCart}
          variant="secondary"
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
