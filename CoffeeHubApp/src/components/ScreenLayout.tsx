import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '../constants/theme';

type ScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  eyebrow?: string;
  contentStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenLayout({
  title,
  subtitle,
  eyebrow = 'Coffee Hub',
  contentStyle,
  bodyStyle,
  children,
}: ScreenLayoutProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.body, bodyStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  container: {
    backgroundColor: palette.background,
    flex: 1,
  },
  glowTop: {
    backgroundColor: palette.highlightSoft,
    borderRadius: 220,
    height: 240,
    opacity: 0.45,
    position: 'absolute',
    right: -80,
    top: -80,
    width: 240,
  },
  glowBottom: {
    backgroundColor: palette.primarySoft,
    borderRadius: 180,
    bottom: 120,
    height: 180,
    left: -70,
    opacity: 0.4,
    position: 'absolute',
    width: 180,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  eyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  body: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
});
