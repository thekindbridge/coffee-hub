import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { HeroBanner } from '../components/home/HeroBanner';
import { OfferSpotlight } from '../components/home/OfferSpotlight';
import { QuickPicksSection } from '../components/home/QuickPicksSection';
import { CardContainer } from '../components/ui/CardContainer';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
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

const getGreeting = (hour: number) => {
  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

const featureCards = [
  {
    key: 'fast-lanes',
    title: 'Fast checkout',
    description: 'Repeat-friendly ordering with one-tap cart access and clean summaries.',
    icon: <Feather name="clock" size={18} color={COLORS.accentStrong} />,
  },
  {
    key: 'fresh-safe',
    title: 'Freshly prepared',
    description: 'Warm kitchen service, local delivery, and better pickup visibility.',
    icon: <Feather name="shield" size={18} color={COLORS.accentStrong} />,
  },
] as const;

const whyCustomersLoveCoffeeHub = [
  {
    key: 'rating',
    label: '4.5+ local rating',
    icon: <Feather name="star" size={16} color={COLORS.accentStrong} />,
  },
  {
    key: 'fresh-food',
    label: 'Fresh brews and bites',
    icon: <MaterialCommunityIcons name="coffee-outline" size={16} color={COLORS.accentStrong} />,
  },
  {
    key: 'fast-delivery',
    label: 'Fast delivery in Inkollu',
    icon: <Feather name="truck" size={16} color={COLORS.accentStrong} />,
  },
  {
    key: 'daily-offers',
    label: 'Daily caramel offers',
    icon: <Feather name="gift" size={16} color={COLORS.accentStrong} />,
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
  const greeting = getGreeting(currentHour);
  const categories = useMemo(
    () => Array.from(new Set(menu.map(item => item.category))).slice(0, 5),
    [menu],
  );

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
    navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU });
  }, [navigation]);

  const handleOpenOffers = useCallback(() => {
    if (!activeOffers[0]) {
      navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.OFFERS });
      return;
    }

    scrollToY(offerSectionY);
  }, [activeOffers, navigation, offerSectionY, scrollToY]);

  const handleExplorePicks = useCallback(() => {
    scrollToY(quickPicksSectionY);
  }, [quickPicksSectionY, scrollToY]);

  const handleOpenMaps = useCallback(() => {
    void Linking.openURL(MAPS_URL);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            tintColor={COLORS.accentStrong}
          />
        )}
      >
        <View style={styles.section}>
          <CardContainer variant="dark" style={styles.welcomeCard}>
            <View style={styles.welcomeTopRow}>
              <View style={styles.locationChip}>
                <Feather name="map-pin" size={14} color={COLORS.accentSoft} />
                <Text style={styles.locationChipText}>Inkollu Coffee Kitchen</Text>
              </View>

              <View style={[styles.statusChip, isShopOpen ? styles.statusChipOpen : styles.statusChipClosed]}>
                <Text style={styles.statusChipText}>
                  {isShopOpen ? 'Open now' : 'Closed'}
                </Text>
              </View>
            </View>

            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.heroTitle}>Brew your next comfort order.</Text>
            <Text style={styles.heroSubtitle}>
              Search warm favorites, jump into quick picks, and keep delivery flow smooth on Android.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.searchButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={handleOpenMenu}
            >
              <Feather name="search" size={18} color={COLORS.textMuted} />
              <Text style={styles.searchButtonText}>Search the coffee menu</Text>
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map(category => (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.categoryChip,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={handleOpenMenu}
                >
                  <Feather name="coffee" size={13} color={COLORS.inkInverse} />
                  <Text style={styles.categoryChipText}>{category}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </CardContainer>
        </View>

        <HeroBanner
          activeOfferCount={activeOffers.length}
          hasStatusBanner
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
          <SectionHeader
            eyebrow="Why Coffee Hub"
            title="Premium, local, and built for speed"
            subtitle="Clean cards, quick reorders, and warm coffee-house visuals throughout the app."
          />

          <View style={styles.featureRow}>
            {featureCards.map(card => (
              <CardContainer key={card.key} style={styles.featureCard}>
                <View style={styles.featureIcon}>{card.icon}</View>
                <Text style={styles.featureTitle}>{card.title}</Text>
                <Text style={styles.featureDescription}>{card.description}</Text>
              </CardContainer>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <CardContainer style={styles.loveCard}>
            <SectionHeader
              eyebrow="Local favourite"
              title="Why customers keep coming back"
              subtitle="Coffee, comfort food, and reliable local delivery in one place."
            />

            <View style={styles.loveGrid}>
              {whyCustomersLoveCoffeeHub.map(item => (
                <View key={item.key} style={styles.loveGridItem}>
                  <View style={styles.loveGridIcon}>{item.icon}</View>
                  <Text style={styles.loveGridLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </CardContainer>
        </View>

        <View style={styles.section}>
          <CardContainer variant="tinted" style={styles.serviceCard}>
            <SectionHeader
              eyebrow="Nearby delivery"
              title="Serving Inkollu and nearby areas"
              subtitle="Average delivery time is usually 20 to 30 minutes."
            />

            <View style={styles.serviceRows}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <Feather name="truck" size={16} color={COLORS.accentStrong} />
                </View>
                <Text style={styles.serviceText}>Fast delivery windows with quick cart access.</Text>
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <Feather name="map-pin" size={16} color={COLORS.accentStrong} />
                </View>
                <Text style={styles.serviceText}>Inkollu Coffee Kitchen, local and freshly prepared.</Text>
              </View>
            </View>

            <View style={styles.serviceActions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.serviceButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={handleOpenMaps}
              >
                <Text style={styles.serviceButtonText}>Open in Maps</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.serviceGhostButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={handleExplorePicks}
              >
                <Text style={styles.serviceGhostButtonText}>See quick picks</Text>
              </Pressable>
            </View>
          </CardContainer>
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <CartFloatingButton
          cartCount={cartCount}
          total={payableCartTotal}
          onPress={() => navigation.navigate(ROOT_ROUTES.CART)}
        />
      ) : null}
    </SafeAreaView>
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
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  welcomeCard: {
    borderRadius: 30,
    padding: SPACING.lg,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(251, 246, 241, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  locationChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: COLORS.inkInverse,
  },
  statusChip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  statusChipOpen: {
    backgroundColor: 'rgba(53, 107, 79, 0.18)',
  },
  statusChipClosed: {
    backgroundColor: 'rgba(184, 92, 71, 0.18)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  greeting: {
    marginTop: SPACING.lg,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentSoft,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  heroSubtitle: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(251, 246, 241, 0.78)',
  },
  searchButton: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  categoryRow: {
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingRight: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(251, 246, 241, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
  featureRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  featureCard: {
    flex: 1,
    minHeight: 152,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  featureDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  loveCard: {
    gap: SPACING.md,
  },
  loveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  loveGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 18,
    backgroundColor: COLORS.cardMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loveGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loveGridLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  serviceCard: {
    gap: SPACING.md,
  },
  serviceRows: {
    gap: SPACING.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  serviceButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  serviceGhostButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  serviceGhostButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pressed: {
    opacity: 0.84,
  },
});
