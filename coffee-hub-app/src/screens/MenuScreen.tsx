import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { MenuCatalog } from '../components/menu/MenuCatalog';
import { MenuToolbar } from '../components/menu/MenuToolbar';
import { ROOT_ROUTES } from '../constants/routes';
import { COLORS, SPACING } from '../constants/theme';
import { useMenuExperience } from '../hooks/useMenuExperience';
import type { RootStackParamList } from '../navigation/types';

type MenuNavigation = NativeStackNavigationProp<RootStackParamList>;

export function MenuScreen() {
  const navigation = useNavigation<MenuNavigation>();
  const {
    categories,
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
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          cartCount > 0 ? styles.contentWithCartButton : null,
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toolbarStickyWrap}>
          <MenuToolbar
            categories={categories}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchQuery}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
          />
        </View>

        <View style={styles.titleSection}>
          <View>
            <Text style={styles.eyebrow}>Menu board</Text>
            <Text style={styles.title}>
              {selectedCategory === 'All' ? 'Everything fresh today' : selectedCategory}
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {isMenuLoading ? 'Loading...' : `${filteredMenu.length} items`}
            </Text>
          </View>
        </View>

        <MenuCatalog
          cartQuantityById={cartQuantityById}
          filteredMenu={filteredMenu}
          isMenuLoading={isMenuLoading}
          isShopOpen={isShopOpen}
          onAddToCart={handleAddToCart}
          shopAvailabilityMessage={shopAvailabilityMessage}
        />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  contentWithCartButton: {
    paddingBottom: 108,
  },
  toolbarStickyWrap: {
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.sm,
  },
  titleSection: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  countBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.surfaceDarkAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
});
