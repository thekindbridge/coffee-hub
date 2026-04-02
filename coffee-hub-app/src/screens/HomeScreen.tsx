import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
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
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useMenu } from '../hooks/useMenu';
import { useOffers } from '../hooks/useOffers';
import { useTheme, useThemedStyles } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { ScalePressable } from '../components/ui/ScalePressable';
import { DEFAULT_SHOP_TIMING, isShopOpen as getShopOpenState } from '../utils/shopTiming';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

const getCategoryIcon = (category: string) => {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('coffee')) {
    return 'cafe-outline';
  }

  if (normalizedCategory.includes('tea')) {
    return 'leaf-outline';
  }

  if (normalizedCategory.includes('dessert')) {
    return 'ice-cream-outline';
  }

  if (normalizedCategory.includes('snack')) {
    return 'restaurant-outline';
  }

  return 'ellipse-outline';
};

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { menu, isLoading, refreshMenu } = useMenu();
  const { activeOffers } = useOffers();
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();
  const isShopOpen = getShopOpenState(
    DEFAULT_SHOP_TIMING.openTime,
    DEFAULT_SHOP_TIMING.closeTime,
  );

  const categories = useMemo(
    () => Array.from(new Set(menu.map(item => item.category))).slice(0, 6),
    [menu],
  );
  const featuredItems = useMemo(
    () => [...menu].sort((left, right) => right.rating - left.rating).slice(0, 4),
    [menu],
  );

  const openMenu = () => {
    navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
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
            tintColor={theme.colors.primary}
          />
        )}
      >
        <ScreenTransition>
          <HeroBanner
            activeOfferCount={activeOffers.length}
            isShopOpen={isShopOpen}
            menuCount={menu.length}
            onOpenMenu={openMenu}
            onOpenOffers={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.OFFERS })}
          />

          <OfferSpotlight offer={activeOffers[0] ?? null} />

          <View style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Browse faster</Text>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>

            <ScrollView
              horizontal
              contentContainerStyle={styles.categoryRow}
              showsHorizontalScrollIndicator={false}
            >
              {categories.map(category => (
                <ScalePressable
                  key={category}
                  accessibilityRole="button"
                  onPress={openMenu}
                  style={styles.categoryChip}
                >
                  <View style={styles.categoryIconWrap}>
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.categoryChipText}>{category}</Text>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>

          <QuickPicksSection
            cartQuantityById={cartQuantityById}
            isShopOpen={isShopOpen}
            isMenuLoading={isLoading}
            menu={menu}
            onAddToCart={handleAddToCart}
            onOpenMenu={openMenu}
            title="Popular items"
            subtitle="Our most-loved brews and comfort bites, kept simple and ready to add."
          />

          <QuickPicksSection
            cartQuantityById={cartQuantityById}
            isShopOpen={isShopOpen}
            isMenuLoading={isLoading}
            items={featuredItems}
            menu={menu}
            onAddToCart={handleAddToCart}
            onOpenMenu={openMenu}
            title="Featured picks"
            subtitle="Premium cups and house favorites worth another look."
          />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  contentWithCartButton: {
    paddingBottom: 120,
  },
  categorySection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  categoryRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  categoryChip: {
    width: 88,
    alignItems: 'center',
    gap: 10,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tag,
  },
  categoryChipText: {
    textAlign: 'center',
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
