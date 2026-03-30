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
import { CardContainer } from '../ui/CardContainer';

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
    <CardContainer style={styles.outer}>
      <View style={styles.searchWrap}>
        <Feather
          name="search"
          size={18}
          color={COLORS.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search coffees, snacks, desserts..."
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
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.chipActive : styles.chipInactive,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onCategoryChange(category)}
            >
              <Feather
                name={category === 'All' ? 'grid' : 'coffee'}
                size={13}
                color={isSelected ? COLORS.inkInverse : COLORS.primary}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.xl,
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
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: COLORS.cardMuted,
    paddingLeft: 44,
    paddingRight: SPACING.md,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
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
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chipInactive: {
    backgroundColor: COLORS.cardMuted,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.inkInverse,
  },
  chipTextInactive: {
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.82,
  },
});
