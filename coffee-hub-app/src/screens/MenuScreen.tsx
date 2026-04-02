import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { MenuCatalog } from '../components/menu/MenuCatalog';
import { MenuToolbar } from '../components/menu/MenuToolbar';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES } from '../constants/routes';
import { useMenuExperience } from '../hooks/useMenuExperience';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type MenuNavigation = NativeStackNavigationProp<RootStackParamList>;

export function MenuScreen() {
  const navigation = useNavigation<MenuNavigation>();
  const styles = useThemedStyles(createStyles);
  const {
    categories,
    error,
    filteredMenu,
    hasActiveFilters,
    hasMenuItems,
    isMenuLoading,
    isShopOpen,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    shopAvailabilityMessage,
  } = useMenuExperience();
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          cartCount > 0 ? styles.contentWithCartButton : null,
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTransition style={styles.headerSection}>
          <Text style={styles.eyebrow}>Freshly brewed</Text>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>
            Search fast, filter by category, and focus on the products.
          </Text>
        </ScreenTransition>

        <View style={styles.toolbarStickyWrap}>
          <MenuToolbar
            categories={categories}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchQuery}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
          />
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load menu</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.titleSection}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'All' ? 'All products' : selectedCategory}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isShopOpen ? 'Ready to add to cart' : shopAvailabilityMessage}
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {isMenuLoading ? '...' : filteredMenu.length}
            </Text>
          </View>
        </View>

        <View style={styles.catalogSection}>
          <MenuCatalog
            cartQuantityById={cartQuantityById}
            filteredMenu={filteredMenu}
            hasActiveFilters={hasActiveFilters}
            hasMenuItems={hasMenuItems}
            isMenuLoading={isMenuLoading}
            isShopOpen={isShopOpen}
            onAddToCart={handleAddToCart}
            shopAvailabilityMessage={shopAvailabilityMessage}
          />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  contentWithCartButton: {
    paddingBottom: 120,
  },
  headerSection: {
    paddingBottom: theme.spacing.md,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: theme.colors.textMuted,
  },
  toolbarStickyWrap: {
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.sm,
  },
  errorCard: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
    padding: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.danger,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  titleSection: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  countBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  countBadgeText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  catalogSection: {
    marginTop: theme.spacing.sm,
  },
});
