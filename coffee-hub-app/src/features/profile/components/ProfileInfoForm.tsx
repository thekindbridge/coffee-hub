import { Switch, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../theme';
import type { CustomerProfile } from '../../../types';
import { getCustomerPalette } from '../../../components/customer/designSystem';

type ProfileInfoFormProps = {
  onChange: (nextProfile: CustomerProfile) => void;
  profile: CustomerProfile;
};

type FieldKey = 'name' | 'phone' | 'email';

const updateField = (
  profile: CustomerProfile,
  field: FieldKey,
  value: string,
) => ({
  ...profile,
  [field]: value,
});

export function ProfileInfoForm({
  onChange,
  profile,
}: ProfileInfoFormProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          placeholder="Full name"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={profile.name}
          onChangeText={value => onChange(updateField(profile, 'name', value))}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone number</Text>
        <TextInput
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={profile.phone}
          onChangeText={value => onChange(updateField(profile, 'phone', value))}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={profile.email}
          onChangeText={value => onChange(updateField(profile, 'email', value))}
        />
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Account settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingLabel}>Order updates</Text>
            <Text style={styles.settingSubtitle}>
              Rider progress, accepted orders, and delivery updates.
            </Text>
          </View>
          <Switch
            trackColor={{ false: palette.surfaceHighest, true: palette.caramel }}
            thumbColor={palette.surfaceHigh}
            value={profile.notificationSettings.orderUpdates}
            onValueChange={value => onChange({
              ...profile,
              notificationSettings: {
                ...profile.notificationSettings,
                orderUpdates: value,
              },
            })}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingLabel}>Promotions</Text>
            <Text style={styles.settingSubtitle}>
              Occasional offer drops and new menu highlights.
            </Text>
          </View>
          <Switch
            trackColor={{ false: palette.surfaceHighest, true: palette.caramel }}
            thumbColor={palette.surfaceHigh}
            value={profile.notificationSettings.promotions}
            onValueChange={value => onChange({
              ...profile,
              notificationSettings: {
                ...profile.notificationSettings,
                promotions: value,
              },
            })}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    wrapper: {
      gap: theme.spacing.md,
    },
    fieldGroup: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    input: {
      minHeight: 54,
      borderRadius: theme.radius.xl,
      backgroundColor: palette.surfaceHigh,
      paddingHorizontal: theme.spacing.md,
      color: palette.text,
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
    settingsCard: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    settingsTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.text,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    settingCopy: {
      flex: 1,
    },
    settingLabel: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.text,
    },
    settingSubtitle: {
      marginTop: 4,
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
  });
};
