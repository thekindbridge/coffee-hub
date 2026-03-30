import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const HERO_IMAGE =
  'https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg';

type HeroBannerProps = {
  activeOfferCount: number;
  hasStatusBanner: boolean;
  isShopOpen: boolean;
  menuCount: number;
  onOpenMenu: () => void;
  onOpenOffers: () => void;
};

export function HeroBanner({
  activeOfferCount,
  hasStatusBanner,
  isShopOpen,
  menuCount,
  onOpenMenu,
  onOpenOffers,
}: HeroBannerProps) {
  return (
    <View style={[styles.section, hasStatusBanner ? styles.sectionCompact : styles.sectionDefault]}>
      <View style={styles.card}>
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.imageBackground} imageStyle={styles.image}>
          <LinearGradient
            colors={['rgba(12, 9, 8, 0.24)', 'rgba(12, 9, 8, 0.68)', 'rgba(12, 9, 8, 0.96)']}
            locations={[0, 0.45, 1]}
            style={styles.overlay}
          >
            <View style={styles.content}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="coffee-outline" size={14} color={COLORS.secondary} />
                  <Text style={styles.badgeText}>Inkollu coffee kitchen</Text>
                </View>

                <View style={styles.badge}>
                  <Feather name="map-pin" size={14} color={COLORS.inkInverse} />
                  <Text style={styles.badgeText}>Fast local delivery</Text>
                </View>
              </View>

              <View style={styles.copyBlock}>
                <Text style={styles.eyebrow}>Brewed for quick ordering</Text>
                <Text style={styles.title}>Hot bowls, rich bites, fast pours.</Text>
                <Text style={styles.subtitle}>
                  Compact ordering for hungry evenings, quick reorders, and warm coffee-house vibes.
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [styles.buttonWrap, pressed ? styles.pressed : null]}
                  onPress={onOpenMenu}
                >
                  <LinearGradient
                    colors={
                      isShopOpen
                        ? ['#F0C89C', '#C98B5E']
                        : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.08)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.primaryButton, !isShopOpen ? styles.secondaryButton : null]}
                  >
                    <Feather
                      name="shopping-bag"
                      size={16}
                      color={isShopOpen ? COLORS.surfaceDark : COLORS.inkInverse}
                    />
                    <Text style={[styles.primaryButtonText, !isShopOpen ? styles.secondaryButtonText : null]}>
                      {isShopOpen ? 'Order now' : 'Browse menu'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.secondaryButtonWrap,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={onOpenOffers}
                >
                  <Feather name="tag" size={16} color={COLORS.inkInverse} />
                  <Text style={styles.secondaryButtonText}>Offers</Text>
                </Pressable>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>20-30m</Text>
                  <Text style={styles.metricLabel}>Delivery</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{menuCount}+</Text>
                  <Text style={styles.metricLabel}>Fresh picks</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{activeOfferCount > 0 ? activeOfferCount : 0}</Text>
                  <Text style={styles.metricLabel}>Rewards</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.lg,
  },
  sectionCompact: {
    paddingTop: SPACING.sm,
  },
  sectionDefault: {
    paddingTop: SPACING.xl,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  imageBackground: {
    minHeight: 448,
  },
  image: {
    opacity: 0.4,
  },
  overlay: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(18, 13, 11, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
  copyBlock: {
    maxWidth: 292,
    gap: SPACING.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
  title: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(245, 237, 227, 0.88)',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  buttonWrap: {
    borderRadius: RADIUS.pill,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    paddingVertical: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    paddingVertical: 12,
  },
  secondaryButtonWrap: {
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.surfaceDark,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  pressed: {
    opacity: 0.84,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
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
    color: COLORS.inkInverse,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(245, 237, 227, 0.72)',
  },
});
