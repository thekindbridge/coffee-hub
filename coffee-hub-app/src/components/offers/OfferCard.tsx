import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Offer } from '../../types';
import { ScalePressable } from '../ui/ScalePressable';
import { getCustomerPalette } from '../customer/designSystem';

type OfferCardProps = {
  actionLabel?: string;
  isApplied?: boolean;
  onApply?: (offer: Offer) => void;
  offer: Offer;
  tagLabel?: string;
};

const getDiscountLabel = (offer: Offer) => (
  offer.discountType === 'percentage'
    ? `${offer.discountValue}% OFF`
    : `FLAT Rs ${offer.discountValue} OFF`
);

export function OfferCard({
  actionLabel = 'Apply',
  isApplied = false,
  onApply,
  offer,
  tagLabel = 'Limited',
}: OfferCardProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <LinearGradient
      colors={palette.offerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, theme.shadows.card]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{tagLabel}</Text>
          </View>
          <Text style={styles.title}>{offer.title}</Text>
        </View>

        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{getDiscountLabel(offer)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{offer.description}</Text>

      <Text style={styles.discountHighlight}>
        {offer.discountType === 'percentage'
          ? `${offer.discountValue}%`
          : `Rs ${offer.discountValue}`}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.couponPill}>
          <Ionicons name="ticket-outline" size={14} color="rgba(248, 244, 239, 0.82)" />
          <Text style={styles.couponText}>{offer.couponCode}</Text>
        </View>

        <ScalePressable
          accessibilityRole={onApply ? 'button' : undefined}
          disabled={!onApply}
          onPress={() => {
            if (onApply) {
              onApply(offer);
            }
          }}
          style={styles.applyButtonWrap}
        >
          <View style={styles.applyButton}>
            <Text style={styles.applyButtonText}>
              {isApplied ? 'Applied' : actionLabel}
            </Text>
          </View>
        </ScalePressable>
      </View>

      <Text style={styles.metaText}>
        Minimum order {offer.minOrderAmount > 0 ? `Rs ${offer.minOrderAmount}` : 'not required'}
      </Text>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    borderRadius: theme.radius.hero,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  tagPill: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.86)',
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
    color: 'rgba(248, 244, 239, 0.96)',
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
    color: 'rgba(248, 244, 239, 0.96)',
  },
  description: {
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: 'rgba(248, 244, 239, 0.86)',
  },
  discountHighlight: {
    fontSize: 34,
    fontWeight: '900',
    color: 'rgba(255, 244, 238, 0.98)',
  },
  footerRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  couponPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.96)',
  },
  applyButtonWrap: {
    borderRadius: theme.radius.pill,
  },
  applyButton: {
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  applyButtonText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    color: 'rgba(248, 244, 239, 0.96)',
  },
  metaText: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: 'rgba(248, 244, 239, 0.72)',
  },
});
