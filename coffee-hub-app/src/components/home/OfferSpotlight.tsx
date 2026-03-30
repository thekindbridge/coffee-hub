import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import type { Offer } from '../../types';

type OfferSpotlightProps = {
  offer: Offer | null;
};

export function OfferSpotlight({ offer }: OfferSpotlightProps) {
  if (!offer) {
    return null;
  }

  return (
    <View style={styles.section}>
      <LinearGradient
        colors={['#6A432F', '#4C2D1D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Feather name="tag" size={18} color={COLORS.accentStrong} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Today&apos;s pour</Text>
          <Text style={styles.title} numberOfLines={1}>{offer.title}</Text>
          <Text style={styles.description} numberOfLines={1}>{offer.description}</Text>
        </View>

        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{offer.couponCode}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(240, 200, 156, 0.18)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFCC8A',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(245, 237, 227, 0.78)',
  },
  codeBadge: {
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(19, 14, 12, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: COLORS.inkInverse,
  },
});
