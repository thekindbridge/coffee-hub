import { memo, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { MenuItem } from '../../types';
import { MenuItemCard } from '../MenuItemCard';
import { SectionHeader } from '../ui/SectionHeader';

type QuickPicksSectionProps = {
  cartQuantityById: Map<string, number>;
  isShopOpen?: boolean;
  isMenuLoading: boolean;
  items?: MenuItem[];
  menu: MenuItem[];
  onAddToCart: (item: MenuItem, delta: number) => void;
  onOpenMenu: () => void;
  subtitle?: string;
  title?: string;
};

const SKELETON_ITEMS = ['1', '2', '3', '4'];

const SkeletonCard = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonPillRow}>
          <View style={styles.skeletonPill} />
          <View style={styles.skeletonPillShort} />
        </View>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLineFull} />
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonPrice} />
          <View style={styles.skeletonButton} />
        </View>
      </View>
    </View>
  );
};

export const QuickPicksSection = memo(function QuickPicksSection({
  cartQuantityById,
  isShopOpen = true,
  isMenuLoading,
  items,
  menu,
  onAddToCart,
  onOpenMenu,
  subtitle = 'Fresh brews and comfort bites ready for your next order.',
  title = 'Popular items',
}: QuickPicksSectionProps) {
  const styles = useThemedStyles(createStyles);
  const quickPicks = useMemo(() => items ?? menu.slice(0, 6), [items, menu]);

  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow="Cafe favorites"
        title={title}
        subtitle={subtitle}
        actionLabel="Menu"
        onActionPress={onOpenMenu}
      />

      {isMenuLoading ? (
        <FlatList
          horizontal
          data={SKELETON_ITEMS}
          keyExtractor={item => item}
          renderItem={() => <SkeletonCard />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          horizontal
          data={quickPicks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <MenuItemCard
                item={item}
                quantity={cartQuantityById.get(item.id) ?? 0}
                isShopOpen={isShopOpen}
                onAddToCart={onAddToCart}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
});

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: 4,
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardWrap: {
    width: 232,
  },
  skeletonCard: {
    width: 232,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skeletonImage: {
    height: 150,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonContent: {
    padding: 14,
    gap: 10,
  },
  skeletonPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonPill: {
    width: 58,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonPillShort: {
    width: 74,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonTitle: {
    height: 16,
    width: '66%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonLineFull: {
    height: 12,
    width: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonLineShort: {
    height: 12,
    width: '82%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  skeletonPrice: {
    height: 16,
    width: 72,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceMuted,
  },
});
