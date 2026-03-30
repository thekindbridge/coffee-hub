import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

export function MenuSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.image} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.title} />
            <View style={styles.rating} />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill} />
            <View style={styles.metaPillShort} />
          </View>

          <View style={styles.lineFull} />
          <View style={styles.lineShort} />

          <View style={styles.bottomRow}>
            <View style={styles.price} />
            <View style={styles.button} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(38, 21, 14, 0.08)',
    backgroundColor: COLORS.surface,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 104,
    height: 104,
    borderRadius: 16,
    backgroundColor: COLORS.cardMuted,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    height: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  rating: {
    width: 52,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
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
    width: 70,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
  lineFull: {
    height: 12,
    width: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
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
    width: 86,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
  },
});
