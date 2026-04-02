import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';

export function MenuSkeletonCard() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={styles.rating} />
        <View style={styles.metaRow}>
          <View style={styles.metaPill} />
          <View style={styles.metaPillShort} />
        </View>
        <View style={styles.title} />
        <View style={styles.lineFull} />
        <View style={styles.lineShort} />
        <View style={styles.bottomRow}>
          <View style={styles.price} />
          <View style={styles.button} />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.surfaceMuted,
  },
  content: {
    padding: theme.spacing.md,
  },
  rating: {
    width: 56,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    alignSelf: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  metaPill: {
    width: 58,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  metaPillShort: {
    width: 74,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  title: {
    height: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  lineFull: {
    height: 12,
    width: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: theme.spacing.sm,
  },
  lineShort: {
    height: 12,
    width: '78%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: 12,
  },
  price: {
    width: 74,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceMuted,
  },
});
