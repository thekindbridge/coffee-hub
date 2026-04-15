import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { CategoryTabs } from '../components/customer/CategoryTabs';
import {
  CUSTOMER_SCREEN_BOTTOM_PADDING,
  CUSTOMER_SCREEN_BOTTOM_PADDING_WITH_CART,
  getCustomerPalette,
} from '../components/customer/designSystem';
import { SearchBar } from '../components/customer/SearchBar';
import { ProductCard } from '../components/ui/ProductCard';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useMenuExperience } from '../hooks/useMenuExperience';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type MenuNavigation = NativeStackNavigationProp<RootStackParamList>;
const MENU_ACCENT = '#F2BE8C';
const MENU_ACCENT_SOFT = 'rgba(242, 190, 140, 0.16)';

export function MenuScreen() {
  const navigation = useNavigation<MenuNavigation>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const {
    categories,
    error,
    filteredMenu,
    isMenuLoading,
    isShopOpen,
    isShopTimingLoading,
    refreshMenu,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    shopAvailabilityMessage,
  } = useMenuExperience();
  const { authPhotoUrl, profileDisplayName } = useProfileData();
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();
  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'All';
  const profileInitials = getProfileInitials(profileDisplayName);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        <ScreenTransition>
          <View style={styles.flow}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBadge}>
                  <Ionicons name="cafe-outline" size={22} color={MENU_ACCENT} />
                </View>

                <View style={styles.headerCopy}>
                  <Text style={styles.brandLabel}>Coffee Hub</Text>
                  <Text style={styles.screenTitle}>Menu</Text>
                  <Text style={styles.screenMeta}>
                    {isShopTimingLoading
                      ? "Checking today's service window..."
                      : isShopOpen
                        ? `${filteredMenu.length} item${filteredMenu.length === 1 ? '' : 's'} ready to pour`
                        : shopAvailabilityMessage}
                  </Text>
                </View>
              </View>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.PROFILE })}
                scaleTo={0.96}
                style={styles.avatarButton}
              >
                <View style={styles.avatarSurface}>
                  {authPhotoUrl ? (
                    <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarFallback}>{profileInitials}</Text>
                  )}
                </View>
              </ScalePressable>
            </View>

            <View style={styles.searchRow}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search coffee, espresso, desserts..."
                returnKeyType="search"
                style={styles.searchBar}
              />

              <ScalePressable
                accessibilityRole="button"
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                scaleTo={0.97}
                style={styles.filterButton}
              >
                <View style={[styles.filterButtonSurface, isFiltering ? styles.filterButtonActive : null]}>
                  <Ionicons
                    name="options-outline"
                    size={20}
                    color={isFiltering ? MENU_ACCENT : palette.textMuted}
                  />
                </View>
              </ScalePressable>
            </View>

            <CategoryTabs
              categories={categories}
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              variant="menu"
            />

            <View style={styles.catalogSection}>
              <View style={styles.catalogHeader}>
                <View style={styles.catalogCopy}>
                  <Text style={styles.catalogTitle}>
                    {searchQuery.trim().length > 0
                      ? 'Search Results'
                      : selectedCategory === 'All'
                        ? 'All Drinks'
                        : selectedCategory}
                  </Text>
                  <Text style={styles.catalogSubtitle}>
                    {searchQuery.trim().length > 0
                      ? 'Curated matches for your current search.'
                      : 'A premium catalog built for quick, clean browsing.'}
                  </Text>
                </View>

                <Text style={styles.catalogMeta}>
                  {filteredMenu.length} item{filteredMenu.length === 1 ? '' : 's'}
                </Text>
              </View>

              {error ? (
                <View style={styles.stateCard}>
                  <View style={styles.stateIconWrap}>
                    <Ionicons name="alert-circle-outline" size={22} color={MENU_ACCENT} />
                  </View>
                  <Text style={styles.stateTitle}>Menu unavailable</Text>
                  <Text style={styles.stateText}>{error}</Text>
                </View>
              ) : filteredMenu.length === 0 && !isMenuLoading ? (
                <View style={styles.stateCard}>
                  <View style={styles.stateIconWrap}>
                    <Ionicons name="search-outline" size={22} color={MENU_ACCENT} />
                  </View>
                  <Text style={styles.stateTitle}>
                    {isFiltering ? 'No drinks match this search' : 'No menu items yet'}
                  </Text>
                  <Text style={styles.stateText}>
                    {isFiltering
                      ? 'Reset your filters to bring the full coffee catalog back into view.'
                      : 'Once menu items are published, they will appear here in a clean two-column grid.'}
                  </Text>
                  {isFiltering ? (
                    <ScalePressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      scaleTo={0.98}
                      style={styles.stateActionButton}
                    >
                      <View style={styles.stateActionSurface}>
                        <Text style={styles.stateActionText}>Show Full Menu</Text>
                      </View>
                    </ScalePressable>
                  ) : null}
                </View>
              ) : (
                <View style={styles.grid}>
                  {filteredMenu.map(item => (
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
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xl,
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
      gap: 14,
    },
    brandBadge: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    brandLabel: {
      fontSize: 18,
      fontWeight: '800',
      color: MENU_ACCENT,
    },
    screenTitle: {
      fontSize: 30,
      lineHeight: 34,
      fontWeight: '900',
      color: palette.text,
    },
    screenMeta: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.textMuted,
    },
    avatarButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchBar: {
      flex: 1,
    },
    filterButton: {
      width: 58,
      height: 58,
      borderRadius: 22,
    },
    filterButtonSurface: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    filterButtonActive: {
      backgroundColor: MENU_ACCENT_SOFT,
    },
    catalogSection: {
      gap: 16,
    },
    catalogHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    catalogCopy: {
      flex: 1,
      gap: 4,
    },
    catalogTitle: {
      fontSize: 23,
      lineHeight: 28,
      fontWeight: '800',
      color: palette.text,
    },
    catalogSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.textMuted,
    },
    catalogMeta: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: MENU_ACCENT,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
    },
    gridItem: {
      width: '47.5%',
    },
    stateCard: {
      borderRadius: 24,
      backgroundColor: palette.surfaceLow,
      padding: 20,
      gap: 10,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.32,
      shadowRadius: 36,
      elevation: 14,
    },
    stateIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
    },
    stateTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
      color: palette.text,
    },
    stateText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    stateActionButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
      borderRadius: 999,
    },
    stateActionSurface: {
      borderRadius: 999,
      backgroundColor: MENU_ACCENT,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    stateActionText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#3A2417',
    },
  });
};
