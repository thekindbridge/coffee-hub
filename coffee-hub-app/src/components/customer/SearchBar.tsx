import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { getAmbientShadow, getCustomerPalette } from './designSystem';

type SearchBarProps = Omit<TextInputProps, 'style'> & {
  style?: ViewStyle;
};

export function SearchBar({
  style,
  ...props
}: SearchBarProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <GlassSurface
      intensity={66}
      overlayColor={palette.surfaceGlass}
      style={[styles.container, styles.ambientShadow, style]}
    >
      <Ionicons name="search-outline" size={18} color={palette.textMuted} style={styles.icon} />
      <TextInput
        {...props}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
      />
    </GlassSurface>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    ambientShadow: getAmbientShadow(theme),
    container: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.hero,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: palette.text,
      fontSize: theme.typography.body,
      fontWeight: '600',
      paddingVertical: theme.spacing.sm,
    },
  });
};
