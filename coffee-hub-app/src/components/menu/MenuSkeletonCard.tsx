import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

export function MenuSkeletonCard() {
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.cardMuted,
  },
  content: {
    padding: SPACING.md,
  },
  rating: {
    width: 56,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  metaPillShort: {
    width: 74,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  title: {
    height: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  lineFull: {
    height: 12,
    width: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
    marginTop: SPACING.sm,
  },
  lineShort: {
    height: 12,
    width: '78%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: 12,
  },
  price: {
    width: 74,
    height: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardMuted,
  },
});
