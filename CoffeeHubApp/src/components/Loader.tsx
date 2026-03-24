import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette, spacing } from '../constants/theme';

export function Loader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={palette.primary} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
});
