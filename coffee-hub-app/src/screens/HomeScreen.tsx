import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { AppHeader } from '../components/customer/AppHeader';
import { CategoryTabs } from '../components/customer/CategoryTabs';
import { SearchBar } from '../components/customer/SearchBar';
import { StatusBadge } from '../components/customer/StatusBadge';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ProductCard } from '../components/ui/ProductCard';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { useMenu } from '../hooks/useMenu';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';
import { buildMenuClosedMessage } from '../shared/shopTiming';
import { useTheme, useThemedStyles } from '../theme';
import { ScalePressable } from '../components/ui/ScalePressable';
import { getCustomerPalette } from '../components/customer/designSystem';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

const getGreeting = (date: Date) => {
  const hours = date.getHours();

  if (hours < 12) {
    return 'Good Morning';
  }

  if (hours < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
};

const getFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'Brew Master';

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { menu, isLoading, error, refreshMenu } = useMenu();
  const { activeOffers } = useOffers();
  const {
    cartCount,
    cartQuantityById,
    handleAddToCart,
    isShopOpen,
    isShopTimingLoading,
    payableCartTotal,
    shopTiming,
  } = useCartState();
  const {
    authPhotoUrl,
    primaryAddress,
    profileDisplayName,
  } = useProfileData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const shopAvailabilityMessage = isShopTimingLoading
    ? 'Checking shop timing...'
    : buildMenuClosedMessage(shopTiming.openTime);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(menu.map(item => item.category))).slice(0, 6)],
    [menu],
  );

  const filteredMenu = useMemo(
    () => menu.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const query = deferredSearchQuery.trim().toLowerCase();
      const matchesSearch = !query
        || item.name.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    }),
    [deferredSearchQuery, menu, selectedCategory],
  );

  const popularItems = useMemo(
    () => [...filteredMenu].sort((left, right) => right.rating - left.rating).slice(0, 5),
    [filteredMenu],
  );

  const menuGridItems = useMemo(
    () => filteredMenu.slice(0, 6),
    [filteredMenu],
  );

  const heroOffer = activeOffers[0] ?? null;
  const heroImage = popularItems[0]?.image_url || menu[0]?.image_url || '';
  const heroGlowOneColors: readonly [string, string] = theme.isDark
    ? ['rgba(232, 188, 183, 0.2)', 'rgba(232, 188, 183, 0)']
    : ['rgba(232, 188, 183, 0.3)', 'rgba(232, 188, 183, 0)'];
  const heroGlowTwoColors: readonly [string, string] = theme.isDark
    ? ['rgba(200, 146, 99, 0.18)', 'rgba(200, 146, 99, 0)']
    : ['rgba(200, 146, 99, 0.24)', 'rgba(200, 146, 99, 0)'];
  const heroSheenColors: readonly [string, string, string] = theme.isDark
    ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)']
    : ['rgba(255, 255, 255, 0.34)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)'];
  const heroCardTranslateY = scrollY.interpolate({
    inputRange: [-180, 0, 220],
    outputRange: [-36, 0, 52],
    extrapolate: 'clamp',
  });
  const heroCardScale = scrollY.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [1.08, 1, 0.97],
    extrapolate: 'clamp',
  });
  const heroCardOpacity = scrollY.interpolate({
    inputRange: [0, 90, 220],
    outputRange: [1, 0.96, 0.76],
    extrapolate: 'clamp',
  });
  const heroImageTranslateY = scrollY.interpolate({
    inputRange: [-180, 0, 220],
    outputRange: [-42, 0, 76],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 64, 148],
    outputRange: [1, 0.92, 0.58],
    extrapolate: 'clamp',
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 148],
    outputRange: [0, -18],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          cartCount > 0 ? styles.contentWithCartButton : null,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        refreshControl={(
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refreshMenu();
            }}
            tintColor={theme.colors.primary}
          />
        )}
      >
        <ScreenTransition>
          <View style={styles.canvas}>
            <View pointerEvents="none" style={styles.decorLayer}>
              <LinearGradient
                colors={heroGlowOneColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGlowOne}
              />
              <LinearGradient
                colors={heroGlowTwoColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGlowTwo}
              />
            </View>

            <View style={styles.headerSection}>
              <AppHeader
                avatarUrl={authPhotoUrl}
                initials={getFirstName(profileDisplayName).slice(0, 2).toUpperCase()}
                locationLabel="Delivering to"
                locationValue={primaryAddress?.address || 'Set your coffee corner'}
                onAvatarPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.PROFILE })}
              />

              <Animated.View
                style={{
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }],
                }}
              >
                <View style={styles.greetingBlock}>
                  <Text style={styles.eyebrow}>Daily pour</Text>
                  <Text style={styles.greeting}>
                    {getGreeting(new Date())}, {getFirstName(profileDisplayName || 'Brew Master')}
                  </Text>
                  <Text style={styles.greetingSubcopy}>
                    Slow-roasted flavors, fast delivery, and a menu tuned to your next ritual.
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }],
                }}
              >
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search coffee, desserts, cold brew..."
                  returnKeyType="search"
                />
              </Animated.View>
            </View>

            <View style={styles.fullBleedSection}>
              <Animated.View
                style={[
                  styles.heroMotion,
                  {
                    opacity: heroCardOpacity,
                    transform: [{ translateY: heroCardTranslateY }, { scale: heroCardScale }],
                  },
                ]}
              >
                <ScalePressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.OFFERS })}
                  style={styles.heroWrap}
                >
                  <View style={styles.heroCard}>
                    <Animated.View
                      style={[
                        styles.heroMediaMotion,
                        { transform: [{ translateY: heroImageTranslateY }] },
                      ]}
                    >
                      {heroImage ? (
                        <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.heroFallback}>
                          <Ionicons name="cafe-outline" size={34} color={palette.textMuted} />
                        </View>
                      )}
                    </Animated.View>

                    <LinearGradient
                      colors={palette.heroGradient}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.heroOverlay}
                    />
                    <LinearGradient
                      colors={heroSheenColors}
                      locations={[0, 0.45, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroSheen}
                    />

                    <View style={styles.heroContent}>
                      <StatusBadge
                        label={heroOffer ? 'Sensory Rewards' : 'Fresh Drop'}
                        tone="member"
                      />
                      <Text style={styles.heroTitle}>
                        {heroOffer?.title || 'A richer coffee ritual, brewed into every order'}
                      </Text>
                      <Text style={styles.heroDescription}>
                        {heroOffer?.description || 'Browse warm brews, comfort bites, and caramel-toned specials made for a slower moment.'}
                      </Text>

                      <GlassSurface depth="section" overlayColor="rgba(23, 18, 16, 0.24)" style={styles.heroMetricsShell}>
                        <View style={styles.heroMetricsRow}>
                          <GlassSurface
                            depth="card"
                            intensity={58}
                            overlayColor="rgba(23, 18, 16, 0.32)"
                            style={styles.heroMetric}
                          >
                            <Text style={styles.heroMetricValue}>{popularItems.length}</Text>
                            <Text style={styles.heroMetricLabel}>curated picks</Text>
                          </GlassSurface>
                          <GlassSurface
                            depth="card"
                            intensity={58}
                            overlayColor="rgba(23, 18, 16, 0.32)"
                            style={styles.heroMetric}
                          >
                            <Text style={styles.heroMetricValue}>{activeOffers.length || 1}</Text>
                            <Text style={styles.heroMetricLabel}>live rewards</Text>
                          </GlassSurface>
                        </View>
                      </GlassSurface>

                      <View style={styles.heroFooter}>
                        <View>
                          <Text style={styles.heroMetaLabel}>Today&apos;s highlight</Text>
                          <Text style={styles.heroMetaValue}>
                            {heroOffer?.couponCode || `${popularItems.length} curated picks`}
                          </Text>
                        </View>
                        <View style={styles.heroArrow}>
                          <Ionicons name="arrow-forward" size={18} color={palette.background} />
                        </View>
                      </View>
                    </View>
                  </View>
                </ScalePressable>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Collections</Text>
                  <Text style={styles.sectionTitle}>Choose your mood</Text>
                </View>
              </View>

              <CategoryTabs
                categories={categories}
                onSelect={setSelectedCategory}
                selectedCategory={selectedCategory}
              />
            </View>

            <View style={styles.fullBleedSection}>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.OFFERS })}
                style={styles.storyBannerWrap}
              >
                <LinearGradient
                  colors={palette.offerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyBanner}
                >
                  <Text style={styles.storyBannerEyebrow}>Member edit</Text>
                  <Text style={styles.storyBannerTitle}>
                    {heroOffer?.couponCode || 'Seasonal drops now pouring'}
                  </Text>
                  <Text style={styles.storyBannerText}>
                    {heroOffer?.description || 'Unlock limited brews, dessert pairings, and warm-toned reward moments in the offers room.'}
                  </Text>
                </LinearGradient>
              </ScalePressable>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Most loved</Text>
                  <Text style={styles.sectionTitle}>Popular items</Text>
                </View>
                <ScalePressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU })}
                  style={styles.inlineAction}
                >
                  <Text style={styles.inlineActionText}>View all</Text>
                </ScalePressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {popularItems.map(item => (
                  <View key={item.id} style={styles.featureCardWrap}>
                    <ProductCard
                      item={item}
                      quantity={cartQuantityById.get(item.id) ?? 0}
                      isShopOpen={isShopOpen}
                      onAddToCart={handleAddToCart}
                      shopAvailabilityMessage={shopAvailabilityMessage}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Menu grid</Text>
                  <Text style={styles.sectionTitle}>Freshly brewing now</Text>
                </View>
                {!isShopOpen ? (
                  <StatusBadge label="Store Closed" tone="pending" />
                ) : null}
              </View>

              {error ? (
                <GlassSurface intensity={52} overlayColor={palette.surfaceGlass} style={styles.messageCard}>
                  <Text style={styles.messageTitle}>Unable to load the menu</Text>
                  <Text style={styles.messageText}>{error}</Text>
                </GlassSurface>
              ) : menuGridItems.length === 0 && !isLoading ? (
                <GlassSurface depth="section" intensity={52} overlayColor={palette.surfaceGlass} style={styles.messageCard}>
                  <Text style={styles.messageTitle}>No brews yet</Text>
                  <Text style={styles.messageText}>
                    Let&apos;s craft your first coffee and fill this menu with fresh pours.
                  </Text>
                </GlassSurface>
              ) : (
                <View style={styles.grid}>
                  {menuGridItems.map(item => (
                    <View key={item.id} style={styles.gridItem}>
                      <ProductCard
                        item={item}
                        quantity={cartQuantityById.get(item.id) ?? 0}
                        isShopOpen={isShopOpen}
                        onAddToCart={handleAddToCart}
                        shopAvailabilityMessage={shopAvailabilityMessage}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScreenTransition>
      </Animated.ScrollView>

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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    contentContainer: {
      paddingBottom: theme.spacing.xxl,
    },
    contentWithCartButton: {
      paddingBottom: 132,
    },
    canvas: {
      position: 'relative',
    },
    decorLayer: {
      ...StyleSheet.absoluteFillObject,
      top: -40,
    },
    heroGlowOne: {
      position: 'absolute',
      top: -24,
      right: -46,
      width: 220,
      height: 220,
      borderRadius: 110,
    },
    heroGlowTwo: {
      position: 'absolute',
      top: 178,
      left: -58,
      width: 210,
      height: 210,
      borderRadius: 105,
    },
    headerSection: {
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xl,
    },
    greetingBlock: {
      gap: 10,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    greeting: {
      maxWidth: '94%',
      fontSize: 40,
      lineHeight: 46,
      fontWeight: '900',
      color: palette.text,
    },
    greetingSubcopy: {
      maxWidth: '90%',
      fontSize: 15,
      lineHeight: 23,
      color: palette.textMuted,
    },
    section: {
      marginTop: theme.spacing.xl,
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.lg,
    },
    fullBleedSection: {
      marginTop: theme.spacing.xl,
    },
    heroWrap: {
      marginLeft: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      borderRadius: 34,
      overflow: 'hidden',
    },
    heroMotion: {
      overflow: 'visible',
    },
    heroCard: {
      minHeight: 338,
      borderRadius: 34,
      backgroundColor: palette.surfaceHigh,
      overflow: 'hidden',
    },
    heroMediaMotion: {
      ...StyleSheet.absoluteFillObject,
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    heroFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHighest,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    heroSheen: {
      ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    heroTitle: {
      maxWidth: '92%',
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '900',
      color: palette.text,
    },
    heroDescription: {
      maxWidth: '92%',
      fontSize: 15,
      lineHeight: 23,
      color: palette.textSoft,
    },
    heroMetricsShell: {
      marginTop: theme.spacing.sm,
      borderRadius: 22,
      padding: 6,
    },
    heroMetricsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    heroMetric: {
      minWidth: 118,
      borderRadius: 18,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    heroMetricValue: {
      fontSize: 20,
      fontWeight: '900',
      color: '#F8F4EF',
    },
    heroMetricLabel: {
      marginTop: 2,
      fontSize: theme.typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: 'rgba(248, 244, 239, 0.74)',
    },
    heroFooter: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    heroMetaLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    heroMetaValue: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
    },
    heroArrow: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.blush,
    },
    storyBannerWrap: {
      marginLeft: theme.spacing.md,
      marginRight: theme.spacing.md,
      borderRadius: 30,
      overflow: 'hidden',
    },
    storyBanner: {
      borderRadius: 30,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      gap: 6,
    },
    storyBannerEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(248, 244, 239, 0.72)',
    },
    storyBannerTitle: {
      maxWidth: '84%',
      fontSize: 26,
      lineHeight: 31,
      fontWeight: '900',
      color: 'rgba(248, 244, 239, 0.98)',
    },
    storyBannerText: {
      maxWidth: '92%',
      fontSize: theme.typography.body,
      lineHeight: 21,
      color: 'rgba(248, 244, 239, 0.82)',
    },
    sectionHeader: {
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    sectionTitle: {
      marginTop: 4,
      fontSize: 28,
      lineHeight: 33,
      fontWeight: '800',
      color: palette.text,
    },
    inlineAction: {
      paddingVertical: 6,
    },
    inlineActionText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.caramel,
    },
    horizontalList: {
      gap: theme.spacing.md,
      paddingLeft: 2,
      paddingRight: theme.spacing.md,
    },
    featureCardWrap: {
      width: 252,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    gridItem: {
      width: '47.4%',
    },
    messageCard: {
      borderRadius: theme.radius.hero,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    messageTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    messageText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
  });
};
