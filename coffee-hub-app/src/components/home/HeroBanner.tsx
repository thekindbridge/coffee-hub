import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { ScalePressable } from '../ui/ScalePressable';

const HERO_IMAGE =
  'https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg';

type HeroBannerProps = {
  activeOfferCount: number;
  isShopOpen: boolean;
  menuCount: number;
  onOpenMenu: () => void;
  onOpenOffers: () => void;
};

export function HeroBanner({
  activeOfferCount,
  isShopOpen,
  menuCount,
  onOpenMenu,
  onOpenOffers,
}: HeroBannerProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <View style={[styles.card, theme.shadows.card]}>
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.imageBackground} imageStyle={styles.image}>
          <LinearGradient
            colors={theme.gradients.hero}
            locations={[0, 0.5, 1]}
            style={styles.overlay}
          >
            <View style={styles.content}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="cafe-outline" size={14} color={theme.colors.secondary} />
                  <Text style={styles.badgeText}>Inkollu coffee kitchen</Text>
                </View>

                <View style={styles.badge}>
                  <Ionicons
                    name={isShopOpen ? 'time-outline' : 'moon-outline'}
                    size={14}
                    color={theme.colors.textInverse}
                  />
                  <Text style={styles.badgeText}>{isShopOpen ? 'Open now' : 'Currently closed'}</Text>
                </View>
              </View>

              <View style={styles.copyBlock}>
                <Text style={styles.eyebrow}>Premium coffee experience</Text>
                <Text style={styles.title}>Brewed slow. Delivered fast.</Text>
                <Text style={styles.subtitle}>
                  Minimal ordering, warm visuals, and local favorites curated for quick repeat orders.
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <ScalePressable
                  onPress={onOpenMenu}
                  style={styles.primaryButton}
                >
                  <Ionicons
                    name={isShopOpen ? 'bag-handle-outline' : 'grid-outline'}
                    size={16}
                    color={theme.colors.onPrimary}
                  />
                  <Text style={styles.primaryButtonText}>
                    {isShopOpen ? 'Order now' : 'Browse menu'}
                  </Text>
                </ScalePressable>

                <ScalePressable
                  onPress={onOpenOffers}
                  style={styles.secondaryButton}
                >
                  <Ionicons name="pricetag-outline" size={16} color={theme.colors.textInverse} />
                  <Text style={styles.secondaryButtonText}>Offers</Text>
                </ScalePressable>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>20-30m</Text>
                  <Text style={styles.metricLabel}>Delivery</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{menuCount}+</Text>
                  <Text style={styles.metricLabel}>Menu picks</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{activeOfferCount}</Text>
                  <Text style={styles.metricLabel}>Live rewards</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.hero,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  imageBackground: {
    minHeight: 376,
  },
  image: {
    opacity: 0.38,
  },
  overlay: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(15, 10, 8, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  copyBlock: {
    maxWidth: 300,
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
    color: theme.colors.textInverse,
  },
  subtitle: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: 'rgba(248, 244, 239, 0.86)',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
    paddingVertical: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  secondaryButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.textInverse,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textInverse,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.72)',
  },
});
