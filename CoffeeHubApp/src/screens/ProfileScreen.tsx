import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { palette, spacing } from '../constants/theme';
import { useAuth } from '../hooks';

export function ProfileScreen() {
  const { isAuthenticated, signOut, user } = useAuth();

  return (
    <ScreenLayout
      subtitle="Profile and auth state are isolated from UI, which keeps future Firebase integration small and predictable."
      title="Profile"
    >
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.heading}>Account</Text>
          <Text style={styles.body}>Signed in: {isAuthenticated ? 'Yes' : 'No'}</Text>
          <Text style={styles.body}>Email: {user?.email ?? 'Not available'}</Text>
        </AppCard>

        <AppButton label="Sign Out" onPress={signOut} variant="secondary" />
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
    marginBottom: spacing.xs,
  },
});
