import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { palette, radius, spacing } from '../constants/theme';
import { useAuth } from '../hooks';
import { hasRequiredText } from '../utils';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = hasRequiredText(email, password);

  const handleSignIn = () => {
    const normalizedEmail = email.trim().toLowerCase();
    signIn({
      email: normalizedEmail,
      id: normalizedEmail || 'coffeehub-user',
    });
  };

  return (
    <ScreenLayout
      eyebrow="Welcome back"
      subtitle="Sign in to browse the latest menu, manage your cart, and stay close to every order."
      title="Coffee Hub"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <AppCard style={styles.highlightCard} variant="soft">
            <View style={styles.highlightIconShell}>
              <Feather color={palette.highlight} name="coffee" size={18} />
            </View>
            <View style={styles.highlightCopy}>
              <Text style={styles.highlightTitle}>Fresh coffee, fast checkout</Text>
              <Text style={styles.highlightBody}>
                Sign in to save your session and start ordering in seconds.
              </Text>
            </View>
          </AppCard>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            <AppButton
              disabled={!canSubmit}
              icon={<Feather color={palette.textPrimary} name="arrow-right" size={16} />}
              label="Sign In"
              onPress={handleSignIn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  highlightCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  highlightIconShell: {
    alignItems: 'center',
    backgroundColor: palette.highlightSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  highlightCopy: {
    flex: 1,
  },
  highlightTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  highlightBody: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  form: {
    rowGap: spacing.md,
  },
  fieldGroup: {
    rowGap: spacing.xs,
  },
  label: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: palette.textPrimary,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
});
