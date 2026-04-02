import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Offer } from '../../types';

type OfferSpotlightProps = {
  offer: Offer | null;
};

export function OfferSpotlight({ offer }: OfferSpotlightProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!offer) {
    return null;
  }

  return (
    <View style={styles.section}>
      <LinearGradient
        colors={theme.gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, theme.shadows.soft]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="pricetag-outline" size={18} color={theme.colors.onPrimary} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Today&apos;s reward</Text>
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.72)',
  },
  title: {
    marginTop: 4,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  description: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: 'rgba(248, 244, 239, 0.78)',
  },
  codeBadge: {
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(15, 10, 8, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  codeText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: theme.colors.onPrimary,
  },
});
