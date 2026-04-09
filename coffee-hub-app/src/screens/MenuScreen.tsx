import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { CategoryTabs } from '../components/customer/CategoryTabs';
import { SearchBar } from '../components/customer/SearchBar';
import { StatusBadge } from '../components/customer/StatusBadge';
import { GlassSurface } from '../components/ui/GlassSurface';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ProductCard } from '../components/ui/ProductCard';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES } from '../constants/routes';
import { useMenuExperience } from '../hooks/useMenuExperience';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';
import { getCustomerPalette } from '../components/customer/designSystem';

type MenuNavigation = NativeStackNavigationProp<RootStackParamList>;

export function MenuScreen() {
  const navigation = useNavigation<MenuNavigation>();
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
  const { cartCount, cartQuantityById, handleAddToCart, payableCartTotal } = useCartState();
  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'All';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
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
        <ScreenTransition>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>Editorial menu</Text>
            <Text style={styles.title}>Fresh brews, comfort bites, and dark-roast desserts.</Text>
            <Text style={styles.subtitle}>
              Filter by category, search precisely, and add to cart without leaving the tasting flow.
            </Text>
          </View>

          <View style={styles.toolbar}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search coffee, espresso, cold brew..."
              returnKeyType="search"
            />

            <CategoryTabs
              categories={categories}
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
            />
          </View>

          <View style={styles.collectionHeader}>
            <View style={styles.collectionCopy}>
              <Text style={styles.collectionTitle}>
                {selectedCategory === 'All' ? 'All coffee moments' : selectedCategory}
              </Text>
              <Text style={styles.collectionSubtitle}>
                {isShopTimingLoading
                  ? 'Checking store timing...'
                  : isShopOpen
                    ? `${filteredMenu.length} menu item${filteredMenu.length === 1 ? '' : 's'} available right now`
                    : shopAvailabilityMessage}
              </Text>
            </View>

            <StatusBadge
              label={isShopOpen ? 'Open Now' : 'Store Closed'}
              tone={isShopOpen ? 'success' : 'pending'}
            />
          </View>

          {error ? (
            <GlassSurface depth="section" style={styles.messageCard}>
              <Text style={styles.messageTitle}>Menu unavailable</Text>
              <Text style={styles.messageText}>{error}</Text>
            </GlassSurface>
          ) : filteredMenu.length === 0 && !isMenuLoading ? (
            <GlassSurface depth="section" style={styles.messageCard}>
              <GlassSurface depth="card" style={styles.messageIconWrap}>
                <Ionicons name="cafe-outline" size={28} color={palette.caramel} />
              </GlassSurface>
              <Text style={styles.messageTitle}>
                {isFiltering ? 'No brews matched this mood' : 'No brews yet'}
              </Text>
              <Text style={styles.messageText}>
                {isFiltering
                  ? 'Reset the filters and reopen the full menu for a broader tasting flight.'
                  : 'Let\'s craft your first coffee and stock this shelf with fresh pours.'}
              </Text>
              {isFiltering ? (
                <PrimaryButton
                  title="Show Full Menu"
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  style={styles.messageAction}
                  variant="secondary"
                />
              ) : null}
            </GlassSurface>
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
    contentContainer: {
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    contentWithCartButton: {
      paddingBottom: 132,
    },
    headerBlock: {
      gap: 6,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    title: {
      maxWidth: '92%',
      fontSize: 31,
      lineHeight: 37,
      fontWeight: '900',
      color: palette.text,
    },
    subtitle: {
      maxWidth: '90%',
      fontSize: theme.typography.body,
      lineHeight: 21,
      color: palette.textMuted,
    },
    toolbar: {
      marginTop: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    collectionHeader: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    collectionCopy: {
      flex: 1,
    },
    collectionTitle: {
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '800',
      color: palette.text,
    },
    collectionSubtitle: {
      marginTop: 4,
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
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
    messageIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    messageTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '900',
      color: palette.text,
    },
    messageText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    messageAction: {
      marginTop: theme.spacing.sm,
    },
  });
};
