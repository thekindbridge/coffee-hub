import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '../constants/theme';

export function Loader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={palette.primary} size="small" />
      <Text style={styles.label}>Brewing fresh picks...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
