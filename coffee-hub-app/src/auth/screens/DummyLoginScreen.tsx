import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { normalizeEmail } from '../../features/roles/lib/normalizeEmail';
import { useTheme, useThemedStyles } from '../../theme';
import { useAuthContext } from '../context/AuthContext';

type DummyLoginScreenProps = {
  errorMessage?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function DummyLoginScreen({ errorMessage = '' }: DummyLoginScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const { error: authError, login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const visibleError = localError || authError || errorMessage;

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    console.log('[DummyLoginScreen] handleLogin:pressed', {
      email,
      normalizedEmail,
    });
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      console.log('[DummyLoginScreen] handleLogin:invalid-email');
      setLocalError('Enter a valid email address to continue.');
      return;
    }

    setIsSubmitting(true);
    setLocalError('');

    try {
      await login(normalizedEmail);
      console.log('[DummyLoginScreen] handleLogin:success');
    } catch (authIssue) {
      console.error('[DummyLoginScreen] handleLogin:error', authIssue);
      setLocalError(
        authIssue instanceof Error
          ? authIssue.message
          : 'Unable to continue right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.screen}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>COFFEE-HUB Access</Text>
          <Text style={styles.title}>Enter your email</Text>
          <Text style={styles.subtitle}>
            We check `admin_access/{'{email}'}` first, then `agents/{'{email}'}`, and everyone
            else continues as a customer.
          </Text>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance={theme.isDark ? 'dark' : 'light'}
              keyboardType="email-address"
              onChangeText={value => {
                setEmail(value);
                if (localError) {
                  setLocalError('');
                }
              }}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={email}
            />
          </View>

          {visibleError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Login issue</Text>
              <Text style={styles.errorText}>{visibleError}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title={isSubmitting ? 'Checking access...' : 'Continue'}
            onPress={() => {
              void handleLogin();
            }}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.action}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  card: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  inputWrap: {
    marginTop: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  input: {
    minHeight: 56,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body,
  },
  errorCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
    padding: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  errorText: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.danger,
  },
  action: {
    marginTop: theme.spacing.xl,
  },
});
