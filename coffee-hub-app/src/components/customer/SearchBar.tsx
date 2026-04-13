import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { getCustomerPalette } from './designSystem';

type SearchBarProps = Omit<TextInputProps, 'style'> & {
  style?: ViewStyle;
};

const MENU_ACCENT = '#F2BE8C';

export function SearchBar({
  onBlur,
  onFocus,
  style,
  ...props
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.container,
        isFocused ? styles.containerFocused : null,
        style,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={isFocused ? MENU_ACCENT : palette.textMuted}
        style={styles.icon}
      />
      <TextInput
        {...props}
        onBlur={event => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={event => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={palette.textMuted}
        selectionColor={MENU_ACCENT}
        style={styles.input}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    container: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 22,
      backgroundColor: palette.surfaceHighest,
      paddingHorizontal: 18,
      paddingVertical: 6,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 10,
    },
    containerFocused: {
      backgroundColor: '#3B2F2B',
      shadowColor: MENU_ACCENT,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.26,
      shadowRadius: 22,
      elevation: 12,
    },
    icon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      color: palette.text,
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: theme.spacing.md,
    },
  });
};
