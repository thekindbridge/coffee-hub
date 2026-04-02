import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Offer } from '../../types';

type OfferCardProps = {
  offer: Offer;
};

const getDiscountLabel = (offer: Offer) => (
  offer.discountType === 'percentage'
    ? `${offer.discountValue}% OFF`
    : `FLAT Rs ${offer.discountValue} OFF`
);

export function OfferCard({ offer }: OfferCardProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <LinearGradient
      colors={theme.gradients.accent}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, theme.shadows.card]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconBadge}>
            <Ionicons name="pricetag-outline" size={16} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.title}>{offer.title}</Text>
        </View>

        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{getDiscountLabel(offer)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{offer.description}</Text>

      <View style={styles.footerRow}>
        <View style={styles.couponPill}>
          <Text style={styles.couponText}>{offer.couponCode}</Text>
        </View>

        <View style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Auto apply at checkout</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    color: theme.colors.onPrimary,
  },
  discountBadge: {
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: theme.colors.onPrimary,
  },
  description: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: 'rgba(248, 244, 239, 0.88)',
  },
  footerRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  couponPill: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  couponText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.onPrimary,
  },
  applyButton: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  applyButtonText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
});
