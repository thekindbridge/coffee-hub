import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { CategoryTabs } from '../components/customer/CategoryTabs';
import { getAmbientShadow, getCustomerPalette } from '../components/customer/designSystem';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { buildMapsSearchUrl, normalizePhoneForTel } from '../delivery-agent/utils/orderHelpers';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useMenuExperience } from '../hooks/useMenuExperience';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';
import { SHOP_LOCATION } from '../shared/shopLocation';
import { useTheme, useThemedStyles } from '../theme';
import { formatCurrency } from '../utils/formatCurrency';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

const ACCENT_COLOR = '#F2BE8C';
const SHOP_PHONE = '+91 7893504892';
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';
const DEFAULT_CATEGORIES = ['Coffee', 'Tea', 'Snacks', 'Shakes'];
const HERO_GRADIENT = ['#2D1A15', '#4F2D23', '#774A37'] as const;

const isPreferredPreviewImage = (url: string) => {
  const normalized = url.trim().toLowerCase();

  return normalized.length > 0
    && !normalized.includes('chatgpt_image')
    && !normalized.endsWith('.png');
};

const pickHomeCategories = (categories: string[]) => {
  const preferred = DEFAULT_CATEGORIES.filter(category => categories.includes(category));

  if (preferred.length > 0) {
    return preferred;
  }

  return categories.filter(category => category !== 'All').slice(0, 4);
};

const formatFirstName = (label: string) => {
  const firstName = label.trim().split(/\s+/)[0] || 'Pavan';

  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
};

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { activeOffers } = useOffers();
  const {
    authPhotoUrl,
    primaryAddress,
    profileDisplayName,
  } = useProfileData();
  const {
    categories,
    error,
    filteredMenu,
    isMenuLoading,
    isShopOpen,
    refreshMenu,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    shopAvailabilityMessage,
  } = useMenuExperience();
  const {
    cartCount,
    cartQuantityById,
    handleAddToCart,
    payableCartTotal,
  } = useCartState();

  const homeCategories = useMemo(
    () => pickHomeCategories(categories),
    [categories],
  );

  const activeCategory = useMemo(() => {
    if (selectedCategory !== 'All') {
      return selectedCategory;
    }

    if (searchQuery.trim().length === 0 && homeCategories.includes('Coffee')) {
      return 'Coffee';
    }

    return homeCategories[0] || 'All';
  }, [homeCategories, searchQuery, selectedCategory]);

  const popularSource = useMemo(
    () => (selectedCategory === 'All'
      ? filteredMenu.filter(item => item.category === activeCategory)
      : filteredMenu),
    [activeCategory, filteredMenu, selectedCategory],
  );

  const popularItems = useMemo(() => {
    const source = popularSource.length > 0 ? popularSource : filteredMenu;

    return [...source]
      .sort((left, right) => right.rating - left.rating)
      .slice(0, 4);
  }, [filteredMenu, popularSource]);

  const menuPreviewItems = useMemo(() => {
    const excludedIds = new Set(popularItems.map(item => item.id));
    const previewPool = filteredMenu.filter(item => !excludedIds.has(item.id));
    const preferred = previewPool.filter(item => isPreferredPreviewImage(item.image_url));
    const fallback = previewPool.filter(item => !isPreferredPreviewImage(item.image_url));
    const initialSelection = [...preferred, ...fallback].slice(0, 6);

    if (initialSelection.length === 6) {
      return initialSelection;
    }

    const selectedIds = new Set(initialSelection.map(item => item.id));
    const topUpItems = filteredMenu.filter(item => !selectedIds.has(item.id));

    return [...initialSelection, ...topUpItems].slice(0, 6);
  }, [filteredMenu, popularItems]);

  const heroImage = popularItems.find(item => item.image_url.trim())?.image_url || DEFAULT_HERO_IMAGE;
  const heroCoupon = activeOffers[0]?.couponCode?.trim() || 'BREW25';
  const greetingName = formatFirstName(profileDisplayName);
  const profileInitials = getProfileInitials(profileDisplayName);
  const menuCountLabel = `${menuPreviewItems.length} items`;

  const navigateToTab = (screen: typeof TAB_ROUTES[keyof typeof TAB_ROUTES]) => {
    navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen });
  };

  const openExternalUrl = async (url: string, message: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unavailable', message);
    }
  };

  const openMaps = () => {
    void openExternalUrl(
      buildMapsSearchUrl(SHOP_LOCATION.address),
      'Unable to open maps right now.',
    );
  };

  const callShop = () => {
    void openExternalUrl(
      `tel:${normalizePhoneForTel(SHOP_PHONE)}`,
      'Unable to start the call right now.',
    );
  };

  const renderStateCard = (title: string, message: string) => (
    <GlassSurface
      depth="section"
      overlayColor={palette.surfaceGlass}
      style={[styles.stateCard, styles.ambientShadow]}
    >
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
    </GlassSurface>
  );

  const renderShopInfoCard = ({
    ctaLabel,
    icon,
    onPress,
    subtitle,
    title,
  }: {
    ctaLabel?: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    subtitle: string;
    title: string;
  }) => {
    const card = (
      <GlassSurface
        depth="section"
        overlayColor={palette.surfaceGlass}
        style={[styles.infoCard, styles.ambientShadow]}
      >
        <View style={styles.infoCardIconWrap}>
          <Ionicons name={icon} size={18} color={ACCENT_COLOR} />
        </View>

        <View style={styles.infoCardCopy}>
          <Text style={styles.infoCardTitle}>{title}</Text>
          <Text style={styles.infoCardSubtitle}>{subtitle}</Text>
        </View>

        {ctaLabel ? (
          <View style={styles.infoCardCta}>
            <Text style={styles.infoCardCtaText}>{ctaLabel}</Text>
          </View>
        ) : null}
      </GlassSurface>
    );

    if (!onPress) {
      return card;
    }

    return (
      <ScalePressable
        accessibilityRole="button"
        onPress={onPress}
        scaleTo={0.98}
      >
        {card}
      </ScalePressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          cartCount > 0 ? styles.contentWithCartButton : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={isMenuLoading}
            onRefresh={() => {
              void refreshMenu();
            }}
            tintColor={theme.colors.primary}
          />
        )}
      >
        <ScreenTransition style={styles.flow}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconWrap, styles.ambientShadow]}>
                <GlassSurface
                  depth="card"
                  intensity={74}
                  overlayColor={palette.surfaceGlassStrong}
                  style={styles.headerIconSurface}
                >
                  <Ionicons name="cafe" size={20} color={ACCENT_COLOR} />
                </GlassSurface>
              </View>

              <View style={styles.greetingBlock}>
                <Text style={styles.greetingLabel}>Good Morning,</Text>
                <Text style={styles.greetingName}>
                  {greetingName} <Text style={styles.greetingWave}>{'\u{1F44B}'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigateToTab(TAB_ROUTES.OFFERS)}
                scaleTo={0.96}
                style={styles.headerActionButton}
              >
                <GlassSurface
                  depth="card"
                  intensity={72}
                  overlayColor={palette.surfaceGlass}
                  style={styles.headerActionSurface}
                >
                  <Ionicons name="notifications-outline" size={18} color={palette.text} />
                </GlassSurface>
              </ScalePressable>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigateToTab(TAB_ROUTES.PROFILE)}
                scaleTo={0.96}
                style={styles.avatarButton}
              >
                <GlassSurface
                  depth="card"
                  intensity={74}
                  overlayColor={palette.surfaceGlassStrong}
                  style={styles.avatarSurface}
                >
                  {authPhotoUrl ? (
                    <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{profileInitials}</Text>
                  )}
                </GlassSurface>
              </ScalePressable>
            </View>
          </View>

          <GlassSurface
            depth="section"
            intensity={72}
            overlayColor={palette.surfaceGlass}
            style={[styles.searchShell, styles.ambientShadow]}
          >
            <Ionicons name="search-outline" size={18} color={palette.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Find your perfect brew..."
              placeholderTextColor={palette.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <View style={styles.filterIconWrap}>
              <Ionicons name="options-outline" size={18} color={ACCENT_COLOR} />
            </View>
          </GlassSurface>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => navigateToTab(TAB_ROUTES.OFFERS)}
            scaleTo={0.99}
            style={styles.heroPressable}
          >
            <LinearGradient
              colors={HERO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, styles.ambientShadow]}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Special Offer</Text>
                  <Text style={styles.heroTitle}>25% OFF on Brewed Classics</Text>
                  <Text style={styles.heroSubtitle}>
                    Start your morning with our premium selection.
                  </Text>

                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroCouponPill}>
                      <Text style={styles.heroCouponText}>Use {heroCoupon}</Text>
                    </View>
                    <Text style={styles.heroStatusText} numberOfLines={1}>
                      {isShopOpen ? 'Fresh brews ready now' : shopAvailabilityMessage}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroImageWrap}>
                  <Image
                    source={{ uri: heroImage }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(23, 18, 16, 0)', 'rgba(23, 18, 16, 0.36)', 'rgba(23, 18, 16, 0.64)']}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.heroImageShade}
                  />
                </View>
              </View>
            </LinearGradient>
          </ScalePressable>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigateToTab(TAB_ROUTES.MENU)}
                scaleTo={0.97}
              >
                <Text style={styles.sectionAction}>See all</Text>
              </ScalePressable>
            </View>

            <CategoryTabs
              categories={homeCategories}
              onSelect={setSelectedCategory}
              selectedCategory={activeCategory}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular for You</Text>
              <Text style={styles.sectionMeta}>{popularItems.length} picks</Text>
            </View>

            {error ? (
              renderStateCard('Menu unavailable', error)
            ) : popularItems.length === 0 && !isMenuLoading ? (
              renderStateCard(
                'Nothing featured yet',
                'Popular drinks will appear here once menu items are available.',
              )
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularScrollContent}
              >
                {popularItems.map(item => {
                  const quantity = cartQuantityById.get(item.id) ?? 0;
                  const canOrder = isShopOpen && item.is_available !== false;
                  const hasImage = item.image_url.trim().length > 0;

                  return (
                    <GlassSurface
                      key={item.id}
                      depth="card"
                      intensity={64}
                      overlayColor={palette.surfaceGlass}
                      style={[styles.popularCard, styles.ambientShadow]}
                    >
                      <View style={styles.popularImageWrap}>
                        {hasImage ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={styles.popularImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.popularImage, styles.popularImageFallback]}>
                            <Ionicons name="cafe-outline" size={24} color={palette.textMuted} />
                          </View>
                        )}

                        <View style={styles.popularRatingBadge}>
                          <Ionicons name="star" size={12} color={palette.gold} />
                          <Text style={styles.popularRatingText}>{item.rating.toFixed(1)}</Text>
                        </View>
                      </View>

                      <View style={styles.popularBody}>
                        <Text style={styles.popularName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.popularDescription} numberOfLines={2}>
                          {item.description || 'Handcrafted coffee, balanced and smooth.'}
                        </Text>

                        <View style={styles.popularFooter}>
                          <View style={styles.popularPriceBlock}>
                            <Text style={styles.popularPrice}>{formatCurrency(item.price)}</Text>
                            {quantity > 0 ? (
                              <Text style={styles.popularCartHint}>{quantity} in cart</Text>
                            ) : null}
                          </View>

                          <ScalePressable
                            accessibilityRole="button"
                            disabled={!canOrder}
                            onPress={() => handleAddToCart(item, 1)}
                            scaleTo={0.94}
                            style={[
                              styles.popularAddButtonWrap,
                              !canOrder ? styles.disabled : null,
                            ]}
                          >
                            <LinearGradient
                              colors={canOrder ? palette.ctaGradient : palette.ctaGradientDisabled}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.popularAddButton}
                            >
                              <Ionicons
                                name={canOrder ? 'add' : 'time-outline'}
                                size={16}
                                color={palette.background}
                              />
                            </LinearGradient>
                          </ScalePressable>
                        </View>
                      </View>
                    </GlassSurface>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About Coffee Hub</Text>
              <Text style={styles.sectionMeta}>Visit us anytime</Text>
            </View>

            <View style={styles.infoStack}>
              {renderShopInfoCard({
                icon: 'location-outline',
                title: 'Find us',
                subtitle: primaryAddress?.address?.trim() || SHOP_LOCATION.address,
                ctaLabel: 'Open in Maps',
                onPress: openMaps,
              })}

              {renderShopInfoCard({
                icon: 'call-outline',
                title: 'Contact Us',
                subtitle: SHOP_PHONE,
                ctaLabel: 'Call',
                onPress: callShop,
              })}

              {renderShopInfoCard({
                icon: 'cafe-outline',
                title: 'Coffee Hub',
                subtitle: 'Coffee Hub serves premium handcrafted coffee with a cozy experience.',
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Menu</Text>
              <Text style={styles.sectionMeta}>{menuCountLabel.toUpperCase()}</Text>
            </View>

            {error ? (
              renderStateCard('Menu unavailable', error)
            ) : menuPreviewItems.length === 0 && !isMenuLoading ? (
              renderStateCard(
                'Menu preview is empty',
                'Add fresh menu items to bring the daily grid to life.',
              )
            ) : (
              <View style={styles.menuGrid}>
                {menuPreviewItems.map(item => {
                  const hasImage = item.image_url.trim().length > 0;

                  return (
                    <GlassSurface
                      key={item.id}
                      depth="card"
                      intensity={60}
                      overlayColor={palette.surfaceGlass}
                      style={[styles.menuCard, styles.ambientShadow]}
                    >
                      <View style={styles.menuImageWrap}>
                        {hasImage ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={styles.menuImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.menuImage, styles.menuImageFallback]}>
                            <Ionicons name="cafe-outline" size={26} color={palette.textMuted} />
                          </View>
                        )}

                        <View style={styles.menuFavoriteButton}>
                          <Ionicons name="heart-outline" size={15} color={palette.text} />
                        </View>
                      </View>

                      <Text style={styles.menuName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                    </GlassSurface>
                  );
                })}
              </View>
            )}
          </View>
        </ScreenTransition>
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    ambientShadow: getAmbientShadow(theme),
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    contentWithCartButton: {
      paddingBottom: 136,
    },
    flow: {
      gap: theme.spacing.xl,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    headerIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    headerIconSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingBlock: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    greetingLabel: {
      fontSize: theme.typography.caption,
      fontWeight: '700',
      color: palette.textMuted,
    },
    greetingName: {
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '900',
      color: ACCENT_COLOR,
    },
    greetingWave: {
      color: palette.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerActionButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
    },
    headerActionSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
    },
    searchShell: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: theme.radius.hero,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: palette.text,
      fontSize: theme.typography.body,
      fontWeight: '600',
      paddingVertical: theme.spacing.sm,
    },
    filterIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(242, 190, 140, 0.12)',
    },
    heroPressable: {
      borderRadius: theme.radius.xl,
    },
    heroCard: {
      minHeight: 188,
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      padding: 18,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'space-between',
      gap: 10,
      paddingRight: 4,
    },
    heroEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: 'rgba(255, 237, 224, 0.78)',
    },
    heroTitle: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: '900',
      color: '#FFF4EB',
    },
    heroSubtitle: {
      maxWidth: '96%',
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: 'rgba(255, 241, 233, 0.76)',
    },
    heroMetaRow: {
      gap: 6,
    },
    heroCouponPill: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(255, 244, 235, 0.16)',
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    heroCouponText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: '#FFF4EB',
    },
    heroStatusText: {
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: 'rgba(255, 241, 233, 0.72)',
    },
    heroImageWrap: {
      width: 112,
      height: 132,
      borderRadius: 18,
      overflow: 'hidden',
      alignSelf: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroImageShade: {
      ...StyleSheet.absoluteFillObject,
    },
    section: {
      gap: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '800',
      color: palette.text,
    },
    sectionAction: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: ACCENT_COLOR,
    },
    sectionMeta: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    popularScrollContent: {
      gap: theme.spacing.md,
      paddingRight: theme.spacing.lg,
    },
    popularCard: {
      width: 190,
      borderRadius: theme.radius.xl,
      padding: 10,
      gap: 12,
    },
    popularImageWrap: {
      width: '100%',
      height: 132,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: palette.surfaceHighest,
    },
    popularImage: {
      width: '100%',
      height: '100%',
      backgroundColor: palette.surfaceHighest,
    },
    popularImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    popularRatingBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(12, 9, 8, 0.58)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    popularRatingText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: '#FFF4EB',
    },
    popularBody: {
      gap: 10,
    },
    popularName: {
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '800',
      color: palette.text,
    },
    popularDescription: {
      minHeight: 36,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: palette.textMuted,
    },
    popularFooter: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    popularPriceBlock: {
      flex: 1,
      gap: 2,
    },
    popularPrice: {
      fontSize: 18,
      fontWeight: '900',
      color: ACCENT_COLOR,
    },
    popularCartHint: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    popularAddButtonWrap: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    popularAddButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.56,
    },
    infoStack: {
      gap: theme.spacing.md,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    infoCardIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(242, 190, 140, 0.12)',
    },
    infoCardCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    infoCardTitle: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
      color: palette.text,
    },
    infoCardSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    infoCardCta: {
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(242, 190, 140, 0.14)',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    infoCardCtaText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: ACCENT_COLOR,
    },
    stateCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: 6,
    },
    stateTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
      color: palette.text,
    },
    stateText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    menuCard: {
      width: '47.5%',
      borderRadius: theme.radius.xl,
      padding: 10,
      gap: 10,
    },
    menuImageWrap: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: palette.surfaceHighest,
    },
    menuImage: {
      width: '100%',
      height: '100%',
      backgroundColor: palette.surfaceHighest,
    },
    menuImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuFavoriteButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(12, 9, 8, 0.54)',
    },
    menuName: {
      minHeight: 40,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
      color: palette.text,
    },
    menuPrice: {
      fontSize: 17,
      fontWeight: '900',
      color: ACCENT_COLOR,
    },
  });
};
