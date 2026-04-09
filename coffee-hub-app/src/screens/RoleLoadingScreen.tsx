import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme';

type RoleLoadingScreenProps = {
  showSpinner?: boolean;
  subtitle?: string;
  title?: string;
};

export function RoleLoadingScreen({
  showSpinner = true,
  subtitle = 'Checking your COFFEE-HUB access so we can open the right experience.',
  title = 'Preparing your workspace',
}: RoleLoadingScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.card}>
        {showSpinner ? <ActivityIndicator size="large" color={theme.colors.primary} /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
});
