import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

type ScreenPlaceholderProps = {
  title: string;
  subtitle: string;
};

export function ScreenPlaceholder({ title, subtitle }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Coffee Hub</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  card: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textMuted,
  },
});
