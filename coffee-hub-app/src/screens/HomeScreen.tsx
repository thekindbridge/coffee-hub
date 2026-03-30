import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { HeroBanner } from '../components/home/HeroBanner';
import { OfferSpotlight } from '../components/home/OfferSpotlight';
import { QuickPicksSection } from '../components/home/QuickPicksSection';
import { ROOT_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useMenu } from '../hooks/useMenu';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';

const MAPS_URL = 'https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6';
const DEFAULT_OPEN_HOUR = 6;
const DEFAULT_CLOSE_HOUR = 22;

const getCurrentShopHour = (currentDate: Date = new Date()) => {
  const hourPart = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    hour12: false,
    hourCycle: 'h23',
    timeZone: 'Asia/Kolkata',
  })
    .formatToParts(currentDate)
    .find(part => part.type === 'hour')
    ?.value;

  const hour = Number(hourPart);
  return Number.isInteger(hour) ? hour : currentDate.getUTCHours();
};

const featureCards = [
  {
    key: 'fast-lanes',
    title: 'Fast lanes',
    description: 'Compact checkout built for quick repeat orders on the web.',
    icon: <Feather name="clock" size={20} color={COLORS.secondary} />,
    iconStyle: 'warm' as const,
  },
  {
    key: 'fresh-safe',
    title: 'Fresh & safe',
    description: 'Quick COD checkout, clean prep, and order tracking from one drawer.',
    icon: <Feather name="shield" size={20} color={COLORS.highlight} />,
    iconStyle: 'gold' as const,
  },
] as const;

const whyCustomersLoveCoffeeHub = [
  {
    key: 'rating',
    label: '4.5+ Local Rating',
    icon: <Feather name="star" size={16} color="#FFBF5E" />,
    tone: 'gold' as const,
  },
  {
    key: 'fresh-food',
    label: 'Freshly Prepared Food',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#F6C18B" />,
    tone: 'warm' as const,
  },
  {
    key: 'fast-delivery',
    label: 'Fast Delivery in Inkollu',
    icon: <Feather name="truck" size={16} color="#7DD3FC" />,
    tone: 'blue' as const,
  },
  {
    key: 'rewards',
    label: 'Daily Offers & Rewards',
    icon: <Feather name="gift" size={16} color="#C4B5FD" />,
    tone: 'purple' as const,
  },
] as const;

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [offerSectionY, setOfferSectionY] = useState(0);
  const [quickPicksSectionY, setQuickPicksSectionY] = useState(0);

  const { menu, isLoading, refreshMenu } = useMenu();
  const { activeOffers } = useOffers();
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();

  const currentHour = getCurrentShopHour();
  const isShopOpen = currentHour >= DEFAULT_OPEN_HOUR && currentHour < DEFAULT_CLOSE_HOUR;

  const scrollToY = useCallback((y: number) => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(y - SPACING.md, 0),
      animated: true,
    });
  }, []);

  const captureSectionY = useCallback(
    (setter: (value: number) => void) => (event: LayoutChangeEvent) => {
      setter(event.nativeEvent.layout.y);
    },
    [],
  );

  const handleOpenMenu = useCallback(() => {
    scrollToY(quickPicksSectionY);
  }, [quickPicksSectionY, scrollToY]);

  const handleOpenOffers = useCallback(() => {
    if (!activeOffers[0]) {
      return;
    }

    scrollToY(offerSectionY);
  }, [activeOffers, offerSectionY, scrollToY]);

  const handleOpenMaps = useCallback(() => {
    void Linking.openURL(MAPS_URL);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          cartCount > 0 ? styles.contentWithCartButton : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isLoading && menu.length > 0}
            onRefresh={() => {
              void refreshMenu();
            }}
            tintColor={COLORS.accent}
          />
        )}
      >
        <HeroBanner
          activeOfferCount={activeOffers.length}
          hasStatusBanner={false}
          isShopOpen={isShopOpen}
          menuCount={menu.length}
          onOpenMenu={handleOpenMenu}
          onOpenOffers={handleOpenOffers}
        />

        <View onLayout={captureSectionY(setOfferSectionY)}>
          <OfferSpotlight offer={activeOffers[0] ?? null} />
        </View>

        <View onLayout={captureSectionY(setQuickPicksSectionY)}>
          <QuickPicksSection
            cartQuantityById={cartQuantityById}
            isMenuLoading={isLoading}
            menu={menu}
            onAddToCart={handleAddToCart}
            onOpenMenu={handleOpenMenu}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.featureRow}>
            {featureCards.map(card => (
              <View key={card.key} style={styles.featureCard}>
                <View
                  style={[
                    styles.featureIcon,
                    card.iconStyle === 'gold' ? styles.featureIconGold : styles.featureIconWarm,
                  ]}
                >
                  {card.icon}
                </View>
                <Text style={styles.featureTitle}>{card.title}</Text>
                <Text style={styles.featureDescription}>{card.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.loveCard}>
            <View style={styles.loveHeader}>
              <Feather name="zap" size={14} color={COLORS.secondary} />
              <Text style={styles.sectionEyebrow}>Why customers love Coffee Hub</Text>
            </View>

            <View style={styles.loveGrid}>
              {whyCustomersLoveCoffeeHub.map(item => (
                <View key={item.key} style={styles.loveGridItem}>
                  <View
                    style={[
                      styles.loveGridIcon,
                      item.tone === 'gold'
                        ? styles.whyIconGold
                        : item.tone === 'warm'
                          ? styles.whyIconWarm
                          : item.tone === 'blue'
                            ? styles.whyIconBlue
                            : styles.whyIconPurple,
                    ]}
                  >
                    {item.icon}
                  </View>
                  <Text style={styles.loveGridLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.serviceCard}>
            <Text style={styles.sectionEyebrow}>Serving Inkollu & Nearby Areas</Text>

            <View style={styles.serviceRows}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <Feather name="truck" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.serviceText}>Average delivery time: 20-30 minutes</Text>
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <Feather name="map-pin" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.serviceText}>Inkollu Coffee Kitchen</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.serviceButton,
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={handleOpenMaps}
            >
              <Text style={styles.serviceButtonText}>Open in Google Maps</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <CartFloatingButton
          cartCount={cartCount}
          total={payableCartTotal}
          onPress={() => navigation.navigate(ROOT_ROUTES.CART)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
  contentWithCartButton: {
    paddingBottom: 108,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  featureCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  featureIconWarm: {
    backgroundColor: 'rgba(124, 74, 45, 0.16)',
  },
  featureIconGold: {
    backgroundColor: 'rgba(224, 166, 65, 0.16)',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.inkInverse,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 20,
    color: 'rgba(245, 237, 227, 0.72)',
  },
  loveCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: COLORS.surfaceDark,
    padding: SPACING.md,
  },
  loveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
  loveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  loveGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: COLORS.surfaceDarkAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loveGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyIconGold: {
    backgroundColor: '#2B1A0F',
  },
  whyIconWarm: {
    backgroundColor: '#241510',
  },
  whyIconBlue: {
    backgroundColor: '#14202A',
  },
  whyIconPurple: {
    backgroundColor: '#1F1A2F',
  },
  loveGridLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF8F2',
  },
  serviceCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(18, 13, 11, 0.08)',
    backgroundColor: COLORS.surfaceDark,
    padding: SPACING.lg,
  },
  serviceRows: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceDarkAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
  serviceButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF8F2',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
