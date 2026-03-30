import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { MenuCatalog } from '../components/menu/MenuCatalog';
import { MenuToolbar } from '../components/menu/MenuToolbar';
import { CardContainer } from '../components/ui/CardContainer';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
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
        <View style={styles.heroSection}>
          <CardContainer variant="dark" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.locationChip}>
                <Feather name="map-pin" size={14} color={COLORS.accentSoft} />
                <Text style={styles.locationChipText}>Inkollu Coffee Kitchen</Text>
              </View>

              <View style={[styles.statusChip, isShopOpen ? styles.statusChipOpen : styles.statusChipClosed]}>
                <Text style={styles.statusChipText}>{isShopOpen ? 'Fresh today' : 'Closed'}</Text>
              </View>
            </View>

            <SectionHeader
              eyebrow="Menu board"
              title={selectedCategory === 'All' ? 'Crafted for today' : selectedCategory}
              subtitle="Two-column cards, faster scanning, and one-tap add controls for quick ordering."
              inverted
            />
          </CardContainer>
        </View>

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
          <SectionHeader
            eyebrow="Daily menu"
            title={selectedCategory === 'All' ? 'Fresh coffee and bites' : selectedCategory}
            subtitle="Tap any card to build your cart with warm, premium coffee-house styling."
          />

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {isMenuLoading ? 'Loading...' : `${filteredMenu.length} items`}
            </Text>
          </View>
        </View>

        <View style={styles.catalogSection}>
          <MenuCatalog
            cartQuantityById={cartQuantityById}
            filteredMenu={filteredMenu}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  contentWithCartButton: {
    paddingBottom: 120,
  },
  heroSection: {
    marginBottom: SPACING.md,
  },
  heroCard: {
    borderRadius: 30,
    gap: SPACING.lg,
  },
  heroTopRow: {
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
  countBadge: {
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  catalogSection: {
    marginTop: SPACING.sm,
  },
});
