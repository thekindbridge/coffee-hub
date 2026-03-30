import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import type { MenuItem } from '../../types';
import { MenuItemCard } from '../MenuItemCard';
import { MenuSkeletonCard } from './MenuSkeletonCard';

type MenuCatalogProps = {
  cartQuantityById: Map<string, number>;
  filteredMenu: MenuItem[];
  isMenuLoading: boolean;
  isShopOpen: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage: string;
};

const LOADING_ITEMS = ['1', '2', '3', '4', '5', '6'];

export const MenuCatalog = memo(function MenuCatalog({
  cartQuantityById,
  filteredMenu,
  isMenuLoading,
  isShopOpen,
  onAddToCart,
  shopAvailabilityMessage,
}: MenuCatalogProps) {
  if (isMenuLoading) {
    return (
      <FlatList
        data={LOADING_ITEMS}
        keyExtractor={item => item}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.column}
        showsVerticalScrollIndicator={false}
        renderItem={() => <MenuSkeletonCard />}
      />
    );
  }

  if (filteredMenu.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="search" size={42} color="rgba(122, 108, 101, 0.4)" />
        <Text style={styles.emptyTitle}>No items match your search</Text>
        <Text style={styles.emptySubtitle}>
          Try another keyword or switch to a different category chip above.
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
      showsVerticalScrollIndicator={false}
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
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: 112,
    gap: SPACING.md,
  },
  column: {
    gap: SPACING.md,
  },
  cardWrap: {
    flex: 1,
  },
  emptyState: {
    marginTop: SPACING.xl,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtitle: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
});
