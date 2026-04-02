import { Modal, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { useTheme, useThemedStyles } from '../../../theme';
import { ScalePressable } from '../../../components/ui/ScalePressable';
import { useProfileActions } from '../hooks/useProfileActions';
import { useProfileData } from '../hooks/useProfileData';

type ProfileCompletionPromptProps = {
  onCompleteNow: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  address: 'a delivery address',
  name: 'your name',
  phone: 'your phone number',
};

export function ProfileCompletionPrompt({
  onCompleteNow,
}: ProfileCompletionPromptProps) {
  const styles = useThemedStyles(createStyles);
  const { dismissCompletionPromptForSession, suppressCompletionPrompt } = useProfileActions();
  const {
    isCompletionPromptVisible,
    missingFields,
  } = useProfileData();

  if (!isCompletionPromptVisible) {
    return null;
  }

  const missingSummary = missingFields
    .map(field => FIELD_LABELS[field] || field)
    .join(', ');

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isCompletionPromptVisible}
      onRequestClose={dismissCompletionPromptForSession}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Profile reminder</Text>
          <Text style={styles.title}>Complete your profile to continue</Text>
          <Text style={styles.body}>
            Add {missingSummary} so checkout, delivery autofill, and account settings stay in sync.
          </Text>

          <PrimaryButton
            title="Complete now"
            onPress={() => {
              dismissCompletionPromptForSession();
              onCompleteNow();
            }}
            style={styles.primaryAction}
          />

          <PrimaryButton
            title="Ask me later"
            onPress={dismissCompletionPromptForSession}
            style={styles.secondaryAction}
            variant="secondary"
          />

          <ScalePressable
            accessibilityRole="button"
            onPress={() => {
              void suppressCompletionPrompt();
            }}
            style={styles.footerAction}
          >
            <Text style={styles.footerActionText}>Do not ask again</Text>
          </ScalePressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  body: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  primaryAction: {
    marginTop: theme.spacing.lg,
  },
  secondaryAction: {
    marginTop: theme.spacing.sm,
  },
  footerAction: {
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  footerActionText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
