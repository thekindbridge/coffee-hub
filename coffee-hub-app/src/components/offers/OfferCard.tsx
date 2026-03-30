import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
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
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconBadge}>
            <Ionicons name="pricetag" size={16} color={COLORS.text} />
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

        <Pressable disabled style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 74, 45, 0.18)',
    backgroundColor: COLORS.secondary,
    padding: SPACING.md,
    shadowColor: COLORS.shadowStrong,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 0,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    color: COLORS.text,
  },
  discountBadge: {
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.text,
  },
  description: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: 'rgba(38, 21, 14, 0.76)',
  },
  footerRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  couponPill: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  couponText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
  },
  applyButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
  },
});
