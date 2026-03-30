import { Feather } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MenuItemCard } from '../MenuItemCard';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import type { MenuItem } from '../../types';

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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Popular right now</Text>
          <Text style={styles.title}>Quick picks</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.menuButton, pressed ? styles.pressed : null]}
          onPress={onOpenMenu}
        >
          <Text style={styles.menuButtonText}>Menu</Text>
          <Feather name="chevron-right" size={16} color={COLORS.inkInverse} />
        </Pressable>
      </View>

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkInverse,
  },
  pressed: {
    opacity: 0.82,
  },
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: 4,
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
  },
  cardWrap: {
    width: 236,
  },
  skeletonCard: {
    width: 236,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonImage: {
    height: 176,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonContent: {
    padding: 14,
    gap: 12,
  },
  skeletonTitle: {
    height: 16,
    width: '66%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLineFull: {
    height: 12,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLineShort: {
    height: 12,
    width: '82%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonPrice: {
    height: 16,
    width: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonButton: {
    height: 40,
    width: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
