import { Feather } from '@expo/vector-icons';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { ROUTES } from '../constants/routes';
import { palette, radius, spacing } from '../constants/theme';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type OrdersScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function OrdersScreen() {
  const navigation = useNavigation<OrdersScreenNavigationProp>();

  return (
    <ScreenLayout
      eyebrow="Order tracking"
      subtitle="Keep every Coffee Hub order in one place, from fresh confirmations to doorstep delivery."
      title="Orders"
    >
      <View style={styles.content}>
        <AppCard style={styles.emptyCard} variant="raised">
          <View style={styles.emptyIconShell}>
            <Feather color={palette.secondary} name="clock" size={28} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyBody}>
            Your recent orders will appear here with status updates, totals, and delivery progress.
          </Text>
          <AppButton
            icon={<Feather color={palette.textPrimary} name="arrow-right" size={16} />}
            label="Browse Menu"
            onPress={() => navigation.navigate(ROUTES.Menu)}
          />
        </AppCard>

        <AppCard variant="soft">
          <Text style={styles.sectionTitle}>What you will see here</Text>
          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Feather color={palette.highlight} name="truck" size={16} />
              <Text style={styles.featureText}>Live progress from kitchen to delivery</Text>
            </View>
            <View style={styles.featureRow}>
              <Feather color={palette.highlight} name="repeat" size={16} />
              <Text style={styles.featureText}>Easy reorders for your favorite items</Text>
            </View>
            <View style={styles.featureRow}>
              <Feather color={palette.highlight} name="file-text" size={16} />
              <Text style={styles.featureText}>Clear totals, timestamps, and payment details</Text>
            </View>
          </View>
        </AppCard>

        <View style={styles.previewList}>
          {[0, 1].map(index => (
            <AppCard key={index} style={styles.previewCard} variant="soft">
              <View style={styles.previewHeader}>
                <View>
                  <View style={styles.previewLineShort} />
                  <View style={styles.previewLineMedium} />
                </View>
                <View style={styles.previewPill} />
              </View>
              <View style={styles.previewLineLong} />
              <View style={styles.previewFooter}>
                <View style={styles.previewLineShort} />
                <View style={styles.previewLineShort} />
              </View>
            </AppCard>
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyIconShell: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  featureList: {
    rowGap: spacing.md,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureText: {
    color: palette.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  previewList: {
    rowGap: spacing.md,
  },
  previewCard: {
    gap: spacing.md,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewPill: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 28,
    width: 74,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLineShort: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 12,
    width: 88,
  },
  previewLineMedium: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 12,
    marginTop: spacing.sm,
    width: 132,
  },
  previewLineLong: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 12,
    width: '86%',
  },
});
