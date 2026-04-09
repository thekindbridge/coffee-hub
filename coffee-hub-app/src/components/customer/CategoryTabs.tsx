import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { ScalePressable } from '../ui/ScalePressable';
import { getCustomerPalette } from './designSystem';

type CategoryTabsProps = {
  categories: string[];
  onSelect: (category: string) => void;
  selectedCategory: string;
};

const getCategoryIcon = (category: string) => {
  const normalizedCategory = category.toLowerCase();

  if (category === 'All') {
    return 'grid-outline';
  }

  if (normalizedCategory.includes('coffee')) {
    return 'cafe-outline';
  }

  if (normalizedCategory.includes('dessert')) {
    return 'ice-cream-outline';
  }

  if (normalizedCategory.includes('snack')) {
    return 'restaurant-outline';
  }

  if (normalizedCategory.includes('espresso')) {
    return 'flash-outline';
  }

  if (normalizedCategory.includes('brew')) {
    return 'water-outline';
  }

  return 'ellipse-outline';
};

export function CategoryTabs({
  categories,
  onSelect,
  selectedCategory,
}: CategoryTabsProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = getCustomerPalette(theme);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {categories.map(category => {
        const isActive = selectedCategory === category;

        return (
          <ScalePressable
            key={category}
            accessibilityRole="button"
            onPress={() => onSelect(category)}
            scaleTo={0.98}
            style={styles.pressable}
          >
            {isActive ? (
              <LinearGradient
                colors={palette.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeChip}
              >
                <Ionicons name={getCategoryIcon(category)} size={15} color={palette.background} />
                <Text style={styles.activeChipText}>{category}</Text>
              </LinearGradient>
            ) : (
              <GlassSurface
                intensity={48}
                overlayColor={palette.surfaceGlass}
                style={styles.inactiveChip}
              >
                <Ionicons name={getCategoryIcon(category)} size={15} color={palette.caramel} />
                <Text style={styles.inactiveChipText}>{category}</Text>
              </GlassSurface>
            )}
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    content: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.lg,
    },
    pressable: {
      borderRadius: theme.radius.pill,
    },
    activeChip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    inactiveChip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    activeChipText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.background,
    },
    inactiveChipText: {
      fontSize: theme.typography.caption,
      fontWeight: '700',
      color: palette.text,
    },
  });
};
