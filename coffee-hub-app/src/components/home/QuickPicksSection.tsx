import { memo, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import type { MenuItem } from '../../types';
import { MenuItemCard } from '../MenuItemCard';
import { SectionHeader } from '../ui/SectionHeader';

type QuickPicksSectionProps = {
  cartQuantityById: Map<string, number>;
  isMenuLoading: boolean;
  menu: MenuItem[];
  onAddToCart: (item: MenuItem, delta: number) => void;
  onOpenMenu: () => void;
};

const SKELETON_ITEMS = ['1', '2', '3', '4'];

const SkeletonCard = () => (
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

export const QuickPicksSection = memo(function QuickPicksSection({
  cartQuantityById,
  isMenuLoading,
  menu,
  onAddToCart,
  onOpenMenu,
}: QuickPicksSectionProps) {
  const quickPicks = useMemo(() => menu.slice(0, 6), [menu]);

  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow="Popular right now"
        title="Quick picks"
        subtitle="Fresh brews and comfort bites ready for your next order."
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

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: 4,
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
  },
  cardWrap: {
    width: 232,
  },
  skeletonCard: {
    width: 232,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonImage: {
    height: 150,
    backgroundColor: COLORS.cardMuted,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  skeletonPillShort: {
    width: 74,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  skeletonTitle: {
    height: 16,
    width: '66%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  skeletonLineFull: {
    height: 12,
    width: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  skeletonLineShort: {
    height: 12,
    width: '82%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  skeletonButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardMuted,
  },
});
