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
  variant?: 'default' | 'menu';
};

const MENU_ACCENT = '#F2BE8C';
const MENU_ACCENT_TEXT = '#3A2417';

export function CategoryTabs({
  categories,
  onSelect,
  selectedCategory,
  variant = 'default',
}: CategoryTabsProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = getCustomerPalette(theme);
  const isMenuVariant = variant === 'menu';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        isMenuVariant ? styles.contentMenu : null,
      ]}
    >
      {categories.map(category => {
        const isActive = selectedCategory === category;

        return (
          <ScalePressable
            key={category}
            accessibilityRole="button"
            onPress={() => onSelect(category)}
            scaleTo={0.98}
            style={[
              styles.pressable,
              isMenuVariant ? styles.pressableMenu : null,
            ]}
          >
            {isActive && !isMenuVariant ? (
              <LinearGradient
                colors={palette.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{category}</Text>
              </LinearGradient>
            ) : isActive ? (
              <View style={styles.menuActiveChip}>
                <Text style={styles.menuActiveChipText}>{category}</Text>
              </View>
            ) : isMenuVariant ? (
              <View style={styles.menuInactiveChip}>
                <Text style={styles.menuInactiveChipText}>{category}</Text>
              </View>
            ) : (
              <GlassSurface
                intensity={48}
                overlayColor={palette.surfaceGlass}
                style={styles.inactiveChip}
              >
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
    contentMenu: {
      gap: 12,
      paddingRight: 28,
    },
    pressable: {
      borderRadius: theme.radius.pill,
    },
    pressableMenu: {
      borderRadius: 22,
    },
    activeChip: {
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    inactiveChip: {
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
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
    menuActiveChip: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: MENU_ACCENT,
      paddingHorizontal: 20,
      paddingVertical: 11,
      shadowColor: MENU_ACCENT,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.24,
      shadowRadius: 18,
      elevation: 8,
    },
    menuActiveChipText: {
      fontSize: 13,
      fontWeight: '800',
      color: MENU_ACCENT_TEXT,
    },
    menuInactiveChip: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: palette.surfaceHigh,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    menuInactiveChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.textSoft,
    },
  });
};
