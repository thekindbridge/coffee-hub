import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ADMIN_ROUTES } from '../constants/routes';
import { RoleBadge } from '../features/roles/components/RoleBadge';
import { RoleScreenFrame } from '../features/roles/components/RoleScreenFrame';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import {
  subscribeToAdminAccessEntries,
  subscribeToDeliveryAccessEntries,
} from '../features/roles/services/roleService';
import type { RoleAccessEntry } from '../features/roles/types';
import type { AdminStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;

export function StaffManagementScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const styles = useThemedStyles(createStyles);
  const { isOwner } = useUserRole();
  const [adminEntries, setAdminEntries] = useState<RoleAccessEntry[]>([]);
  const [deliveryEntries, setDeliveryEntries] = useState<RoleAccessEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    let hasResolvedAdmins = false;
    let hasResolvedDelivery = false;

    const syncLoadingState = () => {
      setIsLoading(!(hasResolvedAdmins && hasResolvedDelivery));
    };

    const unsubscribeAdmins = subscribeToAdminAccessEntries(
      entries => {
        hasResolvedAdmins = true;
        setAdminEntries(entries);
        setError('');
        syncLoadingState();
      },
      nextError => {
        hasResolvedAdmins = true;
        setError(nextError.message);
        syncLoadingState();
      },
    );

    const unsubscribeDelivery = subscribeToDeliveryAccessEntries(
      entries => {
        hasResolvedDelivery = true;
        setDeliveryEntries(entries);
        setError('');
        syncLoadingState();
      },
      nextError => {
        hasResolvedDelivery = true;
        setError(nextError.message);
        syncLoadingState();
      },
    );

    return () => {
      unsubscribeAdmins();
      unsubscribeDelivery();
    };
  }, []);

  return (
    <RoleScreenFrame
      eyebrow="Staff access"
      title="Staff management"
      subtitle="Admin access comes from admin_access documents, delivery access comes from agents documents, and the owner email override always resolves as admin."
    >
      <CardContainer>
        <RoleBadge label={isOwner ? 'Owner' : 'Admin'} tone={isOwner ? 'owner' : 'admin'} />
        <Text style={styles.title}>Live Firestore visibility</Text>
        <Text style={styles.body}>
          This screen listens to the same collections as the web app, so role changes update in real time without relying on users.role for authorization.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Admins</Text>
            <Text style={styles.summaryValue}>{adminEntries.length}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>{deliveryEntries.length}</Text>
          </View>
        </View>
      </CardContainer>

      <CardContainer style={styles.section} variant="tinted">
        <Text style={styles.title}>{isOwner ? 'Owner note' : 'Admin note'}</Text>
        <Text style={styles.body}>
          {isOwner
            ? 'Owner override is active, but mobile intentionally stays read-only for role writes. Use a secure backend or the web admin flow for assignment changes.'
            : 'Admins can inspect current access on mobile, but role assignment is intentionally disabled here to avoid unsafe direct Firestore writes.'}
        </Text>
        <PrimaryButton
          title={isOwner ? 'Assignment moves to backend' : 'Read-only on mobile'}
          onPress={() => {}}
          disabled
          style={styles.infoAction}
          variant="secondary"
        />
      </CardContainer>

      {error ? (
        <CardContainer style={styles.section}>
          <Text style={styles.errorText}>{error}</Text>
        </CardContainer>
      ) : null}

      <CardContainer style={styles.section}>
        <Text style={styles.title}>
          Admin access {isLoading ? '(loading...)' : `(${adminEntries.length})`}
        </Text>
        {adminEntries.length > 0 ? adminEntries.map(entry => (
          <View key={entry.id} style={styles.entryRow}>
            <Text style={styles.entryEmail}>{entry.email}</Text>
            <RoleBadge label="Admin" tone="admin" />
          </View>
        )) : (
          <Text style={styles.body}>No admin access documents are available.</Text>
        )}
      </CardContainer>

      <CardContainer style={styles.section}>
        <Text style={styles.title}>
          Delivery access {isLoading ? '(loading...)' : `(${deliveryEntries.length})`}
        </Text>
        {deliveryEntries.length > 0 ? deliveryEntries.map(entry => (
          <View key={entry.id} style={styles.entryRow}>
            <View style={styles.entryCopy}>
              <Text style={styles.entryEmail}>{entry.email}</Text>
              <Text style={styles.entryMeta}>
                {entry.accessOnly ? 'Access granted, profile incomplete' : 'Delivery profile active'}
              </Text>
            </View>
            <RoleBadge label="Delivery" tone="delivery" />
          </View>
        )) : (
          <Text style={styles.body}>No delivery access documents are available.</Text>
        )}
      </CardContainer>

      <CardContainer style={styles.section}>
        <PrimaryButton
          title="Back to Dashboard"
          onPress={() => navigation.navigate(ADMIN_ROUTES.DASHBOARD)}
        />
      </CardContainer>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  body: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  summaryChip: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  entryCopy: {
    flex: 1,
  },
  entryEmail: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  entryMeta: {
    marginTop: 4,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorText: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.danger,
  },
  infoAction: {
    marginTop: theme.spacing.md,
  },
});
