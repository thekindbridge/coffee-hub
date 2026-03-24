import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { MenuItemCard } from '../components/MenuItemCard';
import { palette, radius, spacing } from '../constants/theme';
import { useCart, useMenuCatalog } from '../hooks';
import type { MenuItem } from '../services/api';

const SKELETON_COUNT = 6;

export function MenuScreen() {
  const { width } = useWindowDimensions();
  const { addItem, cartQuantityById } = useCart();
  const { errorMessage, isLoading, menuItems, reloadMenu } = useMenuCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    ...Array.from(
      new Set(
        menuItems
          .map(item => item.category.trim())
          .filter(category => category.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMenu = menuItems.filter(item => {
    const matchesCategory =
      selectedCategory === 'All' || item.category.trim() === selectedCategory;
    const haystack =
      `${item.name} ${item.category} ${item.description}`.toLowerCase();

    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  const cardWidth = width >= 980 ? '31.6%' : width >= 720 ? '48.4%' : '100%';

  const handleAddToCart = (item: MenuItem, delta: number) => {
    addItem(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        image_url: item.image_url,
        is_veg: item.is_veg,
        rating: item.rating,
        spice_level: item.spice_level,
      },
      delta,
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <View key={`skeleton-${index}`} style={[styles.cardSlot, { width: cardWidth }]}>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonBody}>
                  <View style={[styles.skeletonLine, styles.skeletonTitle]} />
                  <View style={[styles.skeletonLine, styles.skeletonText]} />
                  <View style={[styles.skeletonLine, styles.skeletonTextShort]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (errorMessage && menuItems.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Unable to load the menu</Text>
          <Text style={styles.stateBody}>{errorMessage}</Text>
          <AppButton label="Try Again" onPress={() => void reloadMenu()} variant="secondary" />
        </View>
      );
    }

    if (filteredMenu.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Feather color={palette.textSecondary} name="search" size={42} />
          <Text style={styles.stateTitle}>No items match your search</Text>
          <Text style={styles.stateBody}>
            Try a different keyword or switch the category chip above.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {filteredMenu.map(item => (
          <View key={item.id} style={[styles.cardSlot, { width: cardWidth }]}>
            <MenuItemCard
              cartQuantity={cartQuantityById.get(item.id) ?? 0}
              item={item}
              onAddToCart={handleAddToCart}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Menu</Text>
          <Text style={styles.heroTitle}>Freshly brewed, packed, and ready.</Text>
          <Text style={styles.heroBody}>
            Search your favorites, explore categories, and add items in just a few taps.
          </Text>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchShell}>
            <Feather color={palette.textSecondary} name="search" size={18} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Search noodles, rice, drinks..."
              placeholderTextColor={palette.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.categoryList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {categories.map(category => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    isSelected ? styles.categoryChipActive : styles.categoryChipInactive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Feather
                    color={isSelected ? palette.highlight : palette.secondary}
                    name="coffee"
                    size={13}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected ? styles.categoryChipTextActive : styles.categoryChipTextInactive,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <AppCard style={styles.tipCard} variant="soft">
          <View style={styles.tipIconShell}>
            <Feather color={palette.highlight} name="zap" size={16} />
          </View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Quick add</Text>
            <Text style={styles.tipBody}>
              Tap the add button on any card to update your cart instantly.
            </Text>
          </View>
        </AppCard>

        {errorMessage && menuItems.length > 0 ? (
          <View style={styles.inlineErrorCard}>
            <Text style={styles.inlineErrorTitle}>Could not refresh the menu.</Text>
            <Text style={styles.inlineErrorBody}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Menu board</Text>
            <Text style={styles.title}>
              {selectedCategory === 'All' ? 'Everything fresh today' : selectedCategory}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {isLoading ? 'Loading...' : `${filteredMenu.length} items`}
            </Text>
          </View>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.accent,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: spacing.xs,
  },
  heroBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  toolbar: {
    backgroundColor: 'rgba(20, 14, 12, 0.94)',
    borderColor: palette.borderStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.sm,
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: palette.textPrimary,
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  categoryList: {
    columnGap: spacing.sm,
    paddingTop: spacing.sm,
    paddingRight: spacing.xs,
  },
  tipCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tipIconShell: {
    alignItems: 'center',
    backgroundColor: palette.highlightSoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  tipBody: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  categoryChipActive: {
    backgroundColor: palette.primarySoft,
    borderColor: 'rgba(255, 179, 71, 0.22)',
  },
  categoryChipInactive: {
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.border,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: palette.accent,
  },
  categoryChipTextInactive: {
    color: palette.textSecondary,
  },
  inlineErrorCard: {
    backgroundColor: palette.warningSoft,
    borderColor: 'rgba(244, 193, 110, 0.24)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineErrorTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineErrorBody: {
    color: '#F5DDBB',
    fontSize: 12,
    lineHeight: 18,
  },
  headerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  eyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.accent,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  countBadgeText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    rowGap: spacing.md,
  },
  cardSlot: {
    marginBottom: 0,
  },
  skeletonCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  skeletonImage: {
    aspectRatio: 1.06,
    backgroundColor: palette.surfaceStrong,
  },
  skeletonBody: {
    gap: spacing.sm,
    padding: 14,
  },
  skeletonLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    height: 12,
  },
  skeletonTitle: {
    width: '68%',
  },
  skeletonText: {
    width: '92%',
  },
  skeletonTextShort: {
    width: '54%',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  stateTitle: {
    color: palette.accent,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
