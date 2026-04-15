import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import {
  CUSTOMER_SCREEN_BOTTOM_PADDING,
  CUSTOMER_SCREEN_BOTTOM_PADDING_WITH_CART,
  getAmbientShadow,
  getCustomerPalette,
} from '../components/customer/designSystem';
import { HomeHeroCarousel, type HomeHeroSlide } from '../components/home/HomeHeroCarousel';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { buildMapsSearchUrl, normalizePhoneForTel } from '../delivery-agent/utils/orderHelpers';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useMenu } from '../hooks/useMenu';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';
import { SHOP_LOCATION } from '../shared/shopLocation';
import { useTheme, useThemedStyles } from '../theme';
import type { MenuItem, Offer } from '../types';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

const LOGO_URI = 'https://res.cloudinary.com/ddfhaqeme/image/upload/v1774339708/logo_d9kcyr.jpg';
const SHOP_PHONE = '+91 7893504892';
const HERO_QUOTE_TEXT = 'Fresh brews.\nCalm moments.';
const SERIF_FONT_FAMILY = Platform.select({
  android: 'serif',
  default: 'serif',
  ios: 'Georgia',
});
const BACKGROUND_GLOW_TOP = ['rgba(235, 228, 183, 0.1)', 'rgba(235, 228, 183, 0.02)', 'transparent'] as const;
const BACKGROUND_GLOW_SIDE = ['rgba(87, 66, 56, 0.22)', 'rgba(87, 66, 56, 0.03)', 'transparent'] as const;
const ABOUT_CARD_GRADIENT = ['rgba(87, 66, 56, 0.18)', 'rgba(20, 13, 6, 0.03)'] as const;
const CONTACT_CARD_GRADIENT = ['rgba(235, 228, 183, 0.14)', 'rgba(20, 13, 6, 0.02)'] as const;

const HIGHLIGHT_CARDS = [
  {
    colors: ['rgba(235, 228, 183, 0.16)', 'rgba(50, 40, 32, 0.02)'] as const,
    icon: 'time-outline' as const,
    title: 'Open\nHours',
  },
  {
    colors: ['rgba(222, 193, 179, 0.16)', 'rgba(50, 40, 32, 0.02)'] as const,
    icon: 'rocket-outline' as const,
    title: 'Fast\nDelivery',
  },
  {
    colors: ['rgba(206, 199, 157, 0.14)', 'rgba(50, 40, 32, 0.02)'] as const,
    icon: 'cafe-outline' as const,
    title: 'Fresh\nCoffee',
  },
] as const;

const FALLBACK_HERO_VISUALS = [
  {
    id: 'fallback-espresso',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    visualTag: 'Signature brews',
  },
  {
    id: 'fallback-shake',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=80',
    visualTag: 'Creamy shakes',
  },
  {
    id: 'fallback-latte',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1fceb?auto=format&fit=crop&w=1200&q=80',
    visualTag: 'Daily comfort',
  },
  {
    id: 'fallback-cafe',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    visualTag: 'Calm cafe',
  },
] as const;

const FALLBACK_HERO_COPY = [
  {
    subtitle: 'Signature coffees, creamy shakes, and calm cafe energy in every pour.',
    supportingText: 'Crafted to feel warm, polished, and easy to come back to.',
    title: 'Fresh brews ready',
  },
  {
    subtitle: 'Smooth classics and slow-roasted favorites built for familiar comfort.',
    supportingText: 'Made for easy mornings and a softer cafe pause.',
    title: 'Start your day right',
  },
  {
    subtitle: 'A refined local coffee stop with richer textures, aroma, and balance.',
    supportingText: 'Premium handcrafted drinks inspired by everyday rituals.',
    title: 'Handcrafted coffee',
  },
  {
    subtitle: 'Premium drinks and familiar comfort, served with a calmer visual rhythm.',
    supportingText: 'Built for repeat visits, easy browsing, and better coffee breaks.',
    title: 'Coffee Hub moments',
  },
] as const;

const ABOUT_POINTS = [
  {
    icon: 'cafe-outline',
    title: 'Fresh daily',
  },
  {
    icon: 'sparkles-outline',
    title: 'Premium feel',
  },
  {
    icon: 'heart-outline',
    title: 'Locally loved',
  },
] as const;

const formatFirstName = (label: string) => {
  const firstName = label.trim().split(/\s+/)[0] || 'Pavan';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
};

const getGreetingLabel = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning';
  }

  if (hour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
};

const buildHeroSlides = (
  menu: MenuItem[],
  activeOffers: Offer[],
  availabilityLabel: string,
): HomeHeroSlide[] => {
  const uniqueVisuals = menu
    .filter(item => item.image_url.trim().length > 0)
    .sort((left, right) => right.rating - left.rating)
    .reduce<Array<{
      eyebrow: string;
      id: string;
      imageUrl: string;
      visualTag: string;
    }>>((result, item) => {
      const imageUrl = item.image_url.trim();

      if (result.some(visual => visual.imageUrl === imageUrl)) {
        return result;
      }

      result.push({
        eyebrow: `${item.category || 'Coffee Hub'} picks`,
        id: item.id,
        imageUrl,
        visualTag: item.name,
      });

      return result;
    }, []);

  const menuPool = uniqueVisuals.slice(0, 4);
  const fallbackPool = FALLBACK_HERO_VISUALS.filter(fallback => (
    !menuPool.some(item => item.imageUrl === fallback.imageUrl)
  )).map(fallback => ({
    eyebrow: 'Coffee Hub signatures',
    id: fallback.id,
    imageUrl: fallback.imageUrl,
    visualTag: fallback.visualTag,
  }));

  const visualPool = [...menuPool, ...fallbackPool].slice(0, 4);

  return visualPool.map((visual, index) => {
    const liveOffer = activeOffers[index] ?? null;
    const fallbackCopy = FALLBACK_HERO_COPY[index % FALLBACK_HERO_COPY.length];
    const couponCode = liveOffer?.couponCode?.trim();

    return {
      couponCode: couponCode || undefined,
      eyebrow: liveOffer ? 'Offer live' : visual.eyebrow,
      id: `${visual.id}-${liveOffer?.id ?? index}`,
      imageUrl: visual.imageUrl,
      subtitle: liveOffer?.description?.trim() || fallbackCopy.subtitle,
      supportingText: couponCode
        ? `${couponCode} available now - ${availabilityLabel}`
        : `${fallbackCopy.supportingText} - ${availabilityLabel}`,
      title: liveOffer?.title?.trim() || fallbackCopy.title,
      visualTag: visual.visualTag,
    };
  });
};

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { activeOffers } = useOffers();
  const { authPhotoUrl, profileDisplayName } = useProfileData();
  const { isLoading: isMenuLoading, menu, refreshMenu } = useMenu();
  const {
    cartCount,
    isShopOpen,
    payableCartTotal,
    shopStatusMessage,
    shopTimingRangeLabel,
  } = useCartState();

  const greetingName = formatFirstName(profileDisplayName);
  const greetingLabel = getGreetingLabel();
  const profileInitials = getProfileInitials(profileDisplayName);
  const availabilityLabel = isShopOpen
    ? `Open now - ${shopTimingRangeLabel}`
    : shopStatusMessage;

  const heroSlides = useMemo(
    () => buildHeroSlides(menu, activeOffers, availabilityLabel),
    [activeOffers, availabilityLabel, menu],
  );

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

  const renderActionCard = ({
    icon,
    onPress,
    title,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    title: string;
  }) => (
    <ScalePressable
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      scaleTo={0.975}
      style={styles.actionCardWrap}
    >
      <GlassSurface
        depth="section"
        intensity={74}
        overlayColor={palette.surfaceGlass}
        style={[styles.actionCard, styles.ambientShadow]}
      >
        <LinearGradient
          colors={CONTACT_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.actionIconWrap}>
          <Ionicons name={icon} size={20} color={palette.gold} />
        </View>

        <Text style={styles.actionTitle}>{title}</Text>
      </GlassSurface>
    </ScalePressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={BACKGROUND_GLOW_TOP}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.topGlow}
        />
        <LinearGradient
          colors={BACKGROUND_GLOW_SIDE}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sideGlow}
        />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + (
              cartCount > 0 ? CUSTOMER_SCREEN_BOTTOM_PADDING_WITH_CART : CUSTOMER_SCREEN_BOTTOM_PADDING
            ),
          },
        ]}
        decelerationRate="normal"
        overScrollMode="never"
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={isMenuLoading}
            onRefresh={() => {
              void refreshMenu();
            }}
            tintColor={palette.gold}
          />
        )}
      >
        <ScreenTransition style={styles.flow}>
          <View style={styles.headerRow}>
            <View style={styles.headerSideRail}>
              <GlassSurface
                depth="card"
                intensity={78}
                overlayColor={palette.surfaceGlassStrong}
                style={[styles.logoSurface, styles.ambientShadow]}
              >
                <Image source={{ uri: LOGO_URI }} style={styles.logoImage} resizeMode="contain" />
              </GlassSurface>
            </View>

            <View pointerEvents="none" style={styles.headerCenter}>
              <Text numberOfLines={1} style={styles.greetingText}>
                {greetingLabel}, {greetingName}{' '}
                <Text style={styles.waveText}>{'\u{1F44B}'}</Text>
              </Text>
            </View>

            <View style={[styles.headerSideRail, styles.headerActions]}>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigateToTab(TAB_ROUTES.OFFERS)}
                scaleTo={0.96}
                style={styles.headerActionWrap}
              >
                <GlassSurface
                  depth="card"
                  intensity={72}
                  overlayColor={palette.surfaceGlass}
                  style={styles.headerActionSurface}
                >
                  <Ionicons name="notifications-outline" size={18} color={palette.text} />
                  {activeOffers.length > 0 ? <View style={styles.notificationDot} /> : null}
                </GlassSurface>
              </ScalePressable>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigateToTab(TAB_ROUTES.PROFILE)}
                scaleTo={0.96}
                style={styles.headerActionWrap}
              >
                <GlassSurface
                  depth="card"
                  intensity={76}
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

          <HomeHeroCarousel
            quoteText={HERO_QUOTE_TEXT}
            slides={heroSlides}
            onPressSlide={slide => {
              navigateToTab(slide.couponCode ? TAB_ROUTES.OFFERS : TAB_ROUTES.MENU);
            }}
          />

          <View style={styles.highlightGrid}>
            {HIGHLIGHT_CARDS.map((highlight, index) => (
              <ScalePressable
                key={highlight.title}
                accessible={false}
                hitSlop={2}
                scaleTo={0.982}
                style={styles.highlightCardWrap}
              >
                <GlassSurface
                  depth="section"
                  intensity={70}
                  overlayColor={palette.surfaceGlass}
                  style={[styles.highlightCard, styles.ambientShadow]}
                >
                  <LinearGradient
                    colors={highlight.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <View style={styles.highlightIconWrap}>
                    <Ionicons
                      name={highlight.icon}
                      size={18}
                      color={index === 0 ? palette.gold : palette.caramel}
                    />
                  </View>

                  <Text style={styles.highlightTitle}>{highlight.title}</Text>
                </GlassSurface>
              </ScalePressable>
            ))}
          </View>

          <GlassSurface
            depth="section"
            intensity={76}
            overlayColor={palette.surfaceGlass}
            style={[styles.aboutCard, styles.ambientShadow]}
          >
            <LinearGradient
              colors={ABOUT_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <Text style={styles.aboutTitle}>About Coffee Hub</Text>
            <Text style={styles.aboutDescription}>
              Handcrafted coffee with a calm and premium experience.
            </Text>

            <View style={styles.aboutPoints}>
              {ABOUT_POINTS.map(point => (
                <View key={point.title} style={styles.aboutPointRow}>
                  <View style={styles.aboutPointIconWrap}>
                    <Ionicons name={point.icon} size={16} color={palette.gold} />
                  </View>

                  <Text style={styles.aboutPointTitle}>{point.title}</Text>
                </View>
              ))}
            </View>
          </GlassSurface>

          <View style={styles.actionGrid}>
            {renderActionCard({
              icon: 'location-outline',
              onPress: openMaps,
              title: 'Find Us',
            })}

            {renderActionCard({
              icon: 'call-outline',
              onPress: callShop,
              title: 'Call Us',
            })}
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
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    topGlow: {
      position: 'absolute',
      top: -28,
      left: -34,
      width: 208,
      height: 180,
      borderRadius: 96,
    },
    sideGlow: {
      position: 'absolute',
      top: 148,
      right: -52,
      width: 188,
      height: 244,
      borderRadius: 122,
      transform: [{ rotate: '-16deg' }],
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    flow: {
      gap: 22,
    },
    headerRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerSideRail: {
      width: 92,
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoSurface: {
      width: 48,
      height: 48,
      borderRadius: 18,
      padding: 4,
      overflow: 'hidden',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    headerCenter: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
    },
    waveText: {
      color: palette.gold,
    },
    headerActions: {
      justifyContent: 'flex-end',
      gap: 8,
    },
    headerActionWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
    },
    headerActionSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationDot: {
      position: 'absolute',
      top: 11,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: palette.gold,
    },
    avatarSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '800',
      color: palette.text,
    },
    highlightGrid: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    highlightCardWrap: {
      flex: 1,
      borderRadius: 20,
    },
    highlightCard: {
      minHeight: 112,
      height: '100%',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    highlightIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(20, 13, 6, 0.2)',
    },
    highlightTitle: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.9,
      lineHeight: 16,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    aboutCard: {
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 22,
      gap: 16,
    },
    aboutTitle: {
      color: palette.gold,
      fontFamily: SERIF_FONT_FAMILY,
      fontSize: 30,
      fontWeight: '600',
      lineHeight: 34,
      letterSpacing: -0.6,
    },
    aboutDescription: {
      color: palette.textSoft,
      fontSize: 14,
      lineHeight: 24,
    },
    aboutPoints: {
      gap: 12,
      marginTop: 6,
    },
    aboutPointRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 4,
    },
    aboutPointIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(235, 228, 183, 0.12)',
    },
    aboutPointTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
    },
    actionGrid: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    actionCardWrap: {
      flex: 1,
      borderRadius: 20,
    },
    actionCard: {
      minHeight: 108,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.outlineGhost,
      paddingHorizontal: 18,
      paddingVertical: 18,
      justifyContent: 'center',
      gap: 16,
    },
    actionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(20, 13, 6, 0.2)',
    },
    actionTitle: {
      color: palette.text,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
};
