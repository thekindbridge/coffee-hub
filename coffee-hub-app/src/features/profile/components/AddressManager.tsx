import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../theme';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { ScalePressable } from '../../../components/ui/ScalePressable';
import type { CustomerProfile } from '../../../types';
import { getCustomerPalette } from '../../../components/customer/designSystem';

type AddressManagerProps = {
  canAddMore: boolean;
  onAddAddress: () => void;
  onDeleteAddress: (addressId: string) => void;
  onSetPrimary: (addressId: string) => void;
  onUpdateAddress: (addressId: string, value: string) => void;
  profile: CustomerProfile;
};

export function AddressManager({
  canAddMore,
  onAddAddress,
  onDeleteAddress,
  onSetPrimary,
  onUpdateAddress,
  profile,
}: AddressManagerProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Manage addresses</Text>
          <Text style={styles.subtitle}>Save up to 3 places for faster checkout.</Text>
        </View>

        <Text style={styles.countText}>{profile.addresses.length}/3</Text>
      </View>

      <View style={styles.list}>
        {profile.addresses.map(address => (
          <View key={address.id} style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={styles.labelChip}>
                <Text style={styles.labelChipText}>{address.label}</Text>
              </View>

              <View style={styles.actions}>
                {address.isPrimary ? (
                  <View style={styles.primaryChip}>
                    <Text style={styles.primaryChipText}>Primary</Text>
                  </View>
                ) : (
                  <ScalePressable
                    accessibilityRole="button"
                    onPress={() => onSetPrimary(address.id)}
                    style={styles.inlineAction}
                  >
                    <Text style={styles.inlineActionText}>Set primary</Text>
                  </ScalePressable>
                )}

                <ScalePressable
                  accessibilityRole="button"
                  onPress={() => onDeleteAddress(address.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={16} color={palette.danger} />
                </ScalePressable>
              </View>
            </View>

            <TextInput
              multiline
              placeholder={`Enter ${address.label.toLowerCase()} address`}
              placeholderTextColor={palette.textMuted}
              style={styles.textArea}
              textAlignVertical="top"
              value={address.address}
              onChangeText={value => onUpdateAddress(address.id, value)}
            />
          </View>
        ))}
      </View>

      <PrimaryButton
        title={canAddMore ? 'Add another address' : 'Address limit reached'}
        onPress={onAddAddress}
        variant="secondary"
        disabled={!canAddMore}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    wrapper: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    countText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.caramel,
    },
    list: {
      gap: theme.spacing.md,
    },
    addressCard: {
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    labelChip: {
      borderRadius: theme.radius.pill,
      backgroundColor: palette.surfaceHighest,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
    },
    labelChipText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.text,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    primaryChip: {
      borderRadius: theme.radius.pill,
      backgroundColor: palette.successSurface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
    },
    primaryChipText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.success,
    },
    inlineAction: {
      paddingVertical: 6,
    },
    inlineActionText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.caramel,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.dangerSurface,
    },
    textArea: {
      minHeight: 92,
      borderRadius: theme.radius.xl,
      backgroundColor: palette.surfaceHighest,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      color: palette.text,
      fontSize: theme.typography.body,
      lineHeight: 22,
    },
  });
};
