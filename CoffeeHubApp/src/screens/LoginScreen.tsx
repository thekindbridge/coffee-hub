import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '../components/AppButton';
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
      subtitle="Authentication lives in a dedicated store so Firebase Auth can replace this temporary sign-in without changing navigation."
      title="Login"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={palette.textSecondary}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <AppButton disabled={!canSubmit} label="Sign In" onPress={handleSignIn} />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    rowGap: spacing.md,
  },
  fieldGroup: {
    rowGap: spacing.xs,
  },
  label: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: palette.muted,
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.textPrimary,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});
