import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { palette, spacing } from '../constants/theme';

export function OrdersScreen() {
  return (
    <ScreenLayout
      subtitle="Order history will connect to the same Vercel endpoints as the web app, keeping API behavior aligned across platforms."
      title="Orders"
    >
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.heading}>No orders yet</Text>
          <Text style={styles.body}>
            This screen is ready for the next iteration when `getOrders()` is wired to the backend.
          </Text>
        </AppCard>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  heading: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
