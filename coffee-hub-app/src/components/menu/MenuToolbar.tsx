import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type MenuToolbarProps = {
  categories: string[];
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedCategory: string;
};

export const MenuToolbar = memo(function MenuToolbar({
  categories,
  onCategoryChange,
  onSearchChange,
  searchQuery,
  selectedCategory,
}: MenuToolbarProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search noodles, rice, drinks..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {categories.map(category => {
          const isSelected = selectedCategory === category;

          return (
            <Pressable
              key={category}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.chipActive : styles.chipInactive,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onCategoryChange(category)}
            >
              <Feather
                name="coffee"
                size={13}
                color={isSelected ? COLORS.highlight : COLORS.secondary}
              />
              <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(18, 13, 11, 0.08)',
    backgroundColor: 'rgba(15, 11, 9, 0.88)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  searchWrap: {
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingLeft: 44,
    paddingRight: SPACING.md,
    color: COLORS.inkInverse,
    fontSize: 15,
  },
  chipsRow: {
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: COLORS.surfaceDarkAlt,
    borderWidth: 1,
    borderColor: 'rgba(224, 166, 65, 0.24)',
  },
  chipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.inkInverse,
  },
  chipTextInactive: {
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
});
