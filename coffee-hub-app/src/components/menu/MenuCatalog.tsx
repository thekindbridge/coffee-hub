import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { MenuItem } from '../../types';
import { MenuItemCard } from '../MenuItemCard';
import { MenuSkeletonCard } from './MenuSkeletonCard';

type MenuCatalogProps = {
  cartQuantityById: Map<string, number>;
  filteredMenu: MenuItem[];
  hasActiveFilters: boolean;
  hasMenuItems: boolean;
  isMenuLoading: boolean;
  isShopOpen: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage: string;
};

const LOADING_ITEMS = ['1', '2', '3', '4', '5', '6'];

export const MenuCatalog = memo(function MenuCatalog({
  cartQuantityById,
  filteredMenu,
  hasActiveFilters,
  hasMenuItems,
  isMenuLoading,
  isShopOpen,
  onAddToCart,
  shopAvailabilityMessage,
}: MenuCatalogProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (isMenuLoading) {
    return (
      <FlatList
        data={LOADING_ITEMS}
        keyExtractor={item => item}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.column}
        renderItem={() => <MenuSkeletonCard />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        windowSize={5}
      />
    );
  }

  if (filteredMenu.length === 0) {
    const emptyTitle = hasMenuItems
      ? hasActiveFilters
        ? 'No items match your search'
        : 'No available items right now'
      : 'No products available right now';
    const emptySubtitle = hasMenuItems
      ? hasActiveFilters
        ? 'Try another keyword or switch to a different category.'
        : 'Check back in a bit for freshly updated menu items.'
      : 'The menu is connected, but Firestore does not have any available products yet.';

    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={42} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptySubtitle}>
          {emptySubtitle}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredMenu}
      keyExtractor={item => item.id}
      numColumns={2}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.column}
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <MenuItemCard
            item={item}
            quantity={cartQuantityById.get(item.id) ?? 0}
            isShopOpen={isShopOpen}
            onAddToCart={onAddToCart}
            shopAvailabilityMessage={shopAvailabilityMessage}
          />
        </View>
      )}
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      removeClippedSubviews
      windowSize={7}
    />
  );
});

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: 112,
    gap: theme.spacing.md,
  },
  column: {
    gap: theme.spacing.md,
  },
  cardWrap: {
    flex: 1,
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    borderRadius: theme.radius.hero,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptySubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    lineHeight: 20,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
});
