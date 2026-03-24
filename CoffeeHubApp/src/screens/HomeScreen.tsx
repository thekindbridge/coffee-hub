import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { palette, spacing } from '../constants/theme';
import { useAuth, useCart } from '../hooks';

export function HomeScreen() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <ScreenLayout
      subtitle="This tab is ready for the next step: a menu list powered by shared Vercel APIs and reusable business logic."
      title="Home"
    >
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.body}>{user?.email ?? 'guest@coffeehub.app'}</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.heading}>What comes next</Text>
          <Text style={styles.body}>
            The menu UI can now be added here without touching the auth flow or tab shell.
          </Text>
        </AppCard>

        <AppCard>
          <Text style={styles.heading}>Cart state</Text>
          <Text style={styles.body}>{itemCount} item(s) currently stored globally.</Text>
        </AppCard>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  heading: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
