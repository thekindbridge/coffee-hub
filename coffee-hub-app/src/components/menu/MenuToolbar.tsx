import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { CardContainer } from '../ui/CardContainer';
import { ScalePressable } from '../ui/ScalePressable';

type MenuToolbarProps = {
  categories: string[];
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedCategory: string;
};

const getCategoryIcon = (category: string) => {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('coffee')) {
    return 'cafe-outline';
  }

  if (normalizedCategory.includes('tea')) {
    return 'leaf-outline';
  }

  if (normalizedCategory.includes('dessert')) {
    return 'ice-cream-outline';
  }

  if (normalizedCategory.includes('snack')) {
    return 'restaurant-outline';
  }

  return category === 'All' ? 'grid-outline' : 'ellipse-outline';
};

export const MenuToolbar = memo(function MenuToolbar({
  categories,
  onCategoryChange,
  onSearchChange,
  searchQuery,
  selectedCategory,
}: MenuToolbarProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <CardContainer style={styles.outer}>
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search coffees, desserts, snacks..."
          placeholderTextColor={theme.colors.textMuted}
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
            <ScalePressable
              key={category}
              accessibilityRole="button"
              onPress={() => onCategoryChange(category)}
              scaleTo={0.97}
              style={[
                styles.chip,
                isSelected ? styles.chipActive : styles.chipInactive,
              ]}
            >
              <Ionicons
                name={getCategoryIcon(category)}
                size={13}
                color={isSelected ? theme.colors.onPrimary : theme.colors.primary}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {category}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
    </CardContainer>
  );
});

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  outer: {
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  searchWrap: {
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: theme.colors.input,
    paddingLeft: 44,
    paddingRight: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '600',
  },
  chipsRow: {
    gap: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  chipInactive: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  chipText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  chipTextActive: {
    color: theme.colors.onPrimary,
  },
  chipTextInactive: {
    color: theme.colors.text,
  },
});
