import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { TAB_ROUTES } from '../constants/routes';
import { AddressManager } from '../features/profile/components/AddressManager';
import { ProfileActionRow } from '../features/profile/components/ProfileActionRow';
import { ProfileHeader } from '../features/profile/components/ProfileHeader';
import { ProfileInfoForm } from '../features/profile/components/ProfileInfoForm';
import { ProfileSectionCard } from '../features/profile/components/ProfileSectionCard';
import { useProfileActions } from '../features/profile/hooks/useProfileActions';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { RoleBadge } from '../features/roles/components/RoleBadge';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import { useOrders } from '../hooks/useOrders';
import { animateLayout, useTheme, useThemedStyles } from '../theme';
import type { CustomerProfile } from '../types';
import { useAuthContext } from '../auth/context/AuthContext';

type ProfileNavigation = NavigationProp<ParamListBase>;
type ProfileRoute = RouteProp<Record<string, { openEdit?: boolean } | undefined>, string>;

const FIELD_LABELS: Record<string, string> = {
  address: 'a primary address',
  name: 'your name',
  phone: 'your phone number',
};

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const route = useRoute<ProfileRoute>();
  const { theme, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { logout } = useAuthContext();
  const {
    isAdmin,
    isCustomer,
    isDelivery,
    isOwner,
    role,
  } = useUserRole();
  const {
    authPhotoUrl,
    currentUserId,
    error,
    isLoading,
    isProfileComplete,
    missingFields,
    primaryAddress,
    profile,
    profileDisplayName,
  } = useProfileData();
  const {
    addAddress,
    deleteAddress,
    isSaving,
    saveError,
    saveProfile,
    setPrimaryAddress,
    updateAddress,
  } = useProfileActions();
  const { activeOrders, isLoading: isOrdersLoading, orders } = useOrders({
    currentUserId,
  });
  const [draftProfile, setDraftProfile] = useState<CustomerProfile>(profile);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const canManageAccount = Boolean(currentUserId);

  useEffect(() => {
    if (!isEditorOpen) {
      setDraftProfile(profile);
    }
  }, [isEditorOpen, profile]);

  useEffect(() => {
    if (!canManageAccount || !route.params?.openEdit) {
      return;
    }

    setDraftProfile(profile);
    setIsEditorOpen(true);
    navigation.setParams({ openEdit: undefined });
  }, [canManageAccount, navigation, profile, route.params?.openEdit]);

  const missingSummary = useMemo(
    () => missingFields.map(field => FIELD_LABELS[field] || field).join(', '),
    [missingFields],
  );

  const rolePresentation = useMemo(() => {
    if (isOwner) {
      return {
        badgeTone: 'owner' as const,
        helperText: 'Owner override from EXPO_PUBLIC_OWNER_EMAIL. Admin routing always takes priority.',
        label: 'Owner',
      };
    }

    if (isAdmin) {
      return {
        badgeTone: 'admin' as const,
        helperText: 'Admin access comes from admin_access/{email}.',
        label: 'Admin',
      };
    }

    if (isDelivery) {
      return {
        badgeTone: 'delivery' as const,
        helperText: 'Delivery access comes from agents/{email}.',
        label: 'Delivery Agent',
      };
    }

    return {
      badgeTone: 'customer' as const,
      helperText: 'Customer is the fallback when no admin or delivery access doc exists.',
      label: 'Customer',
    };
  }, [isAdmin, isDelivery, isOwner]);

  const headerMeta = useMemo(() => {
    const values = [rolePresentation.label, profile.phone.trim(), profile.email.trim()].filter(Boolean);
    if (values.length > 0) {
      return values.join(' | ');
    }

    return 'Complete your profile for faster checkout.';
  }, [profile.email, profile.phone, rolePresentation.label]);

  const handleOpenEditor = () => {
    if (!canManageAccount) {
      return;
    }

    animateLayout();
    setDraftProfile(profile);
    setIsEditorOpen(true);
  };

  const handleSaveProfile = async () => {
    const didSave = await saveProfile(draftProfile);
    if (didSave) {
      setIsEditorOpen(false);
    }
  };

  const profileInitials = getProfileInitials(profileDisplayName);
  const showStaffFields = isAdmin || isDelivery;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <ProfileHeader
            avatarUrl={authPhotoUrl}
            initials={profileInitials}
            metaLine={headerMeta}
            name={profileDisplayName}
            onEditPress={canManageAccount ? handleOpenEditor : undefined}
          />

          {isLoading ? (
            <View style={styles.loaderCard}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.loaderText}>Loading your profile...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Profile issue</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isProfileComplete && isCustomer ? (
            <View style={styles.incompleteCard}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteText}>
                Add {missingSummary} so delivery details autofill cleanly across the app.
              </Text>
              <PrimaryButton
                title="Finish profile"
                onPress={handleOpenEditor}
                style={styles.incompleteAction}
              />
            </View>
          ) : null}

          <ProfileSectionCard
            title="Role access"
            subtitle="Firestore access collections are the real source of truth."
          >
            <RoleBadge label={rolePresentation.label} tone={rolePresentation.badgeTone} />
            <Text style={styles.roleHelperText}>{rolePresentation.helperText}</Text>
            {showStaffFields ? (
              <View style={styles.staffFields}>
                {isAdmin ? (
                  <ProfileActionRow
                    icon="business-outline"
                    title="Admin location"
                    subtitle={profile.adminLocation?.trim() || 'No admin location saved yet'}
                  />
                ) : null}
                {isDelivery ? (
                  <>
                    <ProfileActionRow
                      icon="bicycle-outline"
                      title="Vehicle type"
                      subtitle={profile.vehicleType?.trim() || 'No vehicle type saved yet'}
                    />
                    <ProfileActionRow
                      icon="pulse-outline"
                      title="Delivery status"
                      subtitle={profile.staffStatus?.trim() || 'No delivery status saved yet'}
                    />
                  </>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.roleMetaText}>
              users.role stays display-only. Runtime authorization comes from {role === 'admin'
                ? ' admin_access'
                : role === 'delivery'
                  ? ' agents'
                  : ' Firestore role checks'}.
            </Text>
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Personal info"
            subtitle="Identity and delivery details pulled into checkout."
          >
            <ProfileActionRow
              icon="person-outline"
              title="Name"
              subtitle={profile.name || profileDisplayName}
            />
            <ProfileActionRow
              icon="call-outline"
              title="Phone"
              subtitle={profile.phone || 'Add a phone number'}
            />
            <ProfileActionRow
              icon="mail-outline"
              title="Email"
              subtitle={profile.email || 'Add an email'}
            />
            <ProfileActionRow
              icon="location-outline"
              title="Primary address"
              subtitle={primaryAddress?.address || 'No primary address saved yet'}
            />
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Addresses"
            subtitle="Home, work, and one extra saved spot."
            action={(
              <ScalePressable
                accessibilityRole="button"
                onPress={handleOpenEditor}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionText}>Manage</Text>
              </ScalePressable>
            )}
          >
            {profile.addresses.length > 0 ? (
              profile.addresses.map(address => (
                <ProfileActionRow
                  key={address.id}
                  icon="home-outline"
                  title={`${address.label}${address.isPrimary ? ' | Primary' : ''}`}
                  subtitle={address.address}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No saved addresses yet.</Text>
            )}
          </ProfileSectionCard>

          {isCustomer ? (
            <ProfileSectionCard
              title="My orders"
              subtitle="Jump back into history and live order tracking."
            >
              <ProfileActionRow
                icon="receipt-outline"
                onPress={() => navigation.navigate(TAB_ROUTES.ORDERS)}
                title={isOrdersLoading ? 'Loading orders...' : `${orders.length} total orders`}
                subtitle={activeOrders.length > 0
                  ? `${activeOrders.length} order${activeOrders.length === 1 ? '' : 's'} currently active`
                  : 'View delivered and in-progress orders'}
                trailingLabel="Open"
              />
            </ProfileSectionCard>
          ) : null}

          <ProfileSectionCard
            title="Settings"
            subtitle="Fine tune the app experience."
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLead}>
                <View style={styles.settingIconWrap}>
                  <Ionicons
                    name={theme.isDark ? 'moon-outline' : 'sunny-outline'}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>Appearance</Text>
                  <Text style={styles.settingSubtitle}>
                    {theme.isDark ? 'Dark roast mode enabled' : 'Light roast mode enabled'}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
                value={theme.isDark}
                onValueChange={() => {
                  animateLayout();
                  toggleTheme();
                }}
              />
            </View>
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Help & support"
            subtitle="Simple customer-help placeholders for now."
          >
            <ProfileActionRow
              icon="chatbubble-ellipses-outline"
              onPress={() => Alert.alert('Support', 'Customer support chat is coming soon.')}
              title="Contact support"
              subtitle="Reach out for order or delivery help."
            />
            <ProfileActionRow
              icon="help-circle-outline"
              onPress={() => Alert.alert('FAQ', 'A help center and FAQ will be added next.')}
              title="FAQ"
              subtitle="Common questions about delivery, orders, and payments."
            />
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Account"
            subtitle="This temporary email login keeps the app role-aware until a permanent auth provider is added."
          >
            <Text style={styles.roleHelperText}>
              Current account email: {profile.email || 'customer@coffeehub.com'}
            </Text>
            <Text style={styles.roleMetaText}>
              Your role is resolved from Firestore access collections after you enter an email. You can log out here to switch accounts.
            </Text>
            <PrimaryButton
              title="Log out"
              onPress={() => {
                void logout().catch(logoutError => {
                  console.error('[ProfileScreen] logout:error', logoutError);
                });
              }}
              style={styles.sessionAction}
              variant="secondary"
            />
          </ProfileSectionCard>
        </ScreenTransition>
      </ScrollView>

      <Modal
        animationType="slide"
        visible={isEditorOpen}
        onRequestClose={() => setIsEditorOpen(false)}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalCopy}>
              <Text style={styles.modalEyebrow}>Edit profile</Text>
              <Text style={styles.modalTitle}>Account settings</Text>
            </View>

            <ScalePressable
              accessibilityRole="button"
              onPress={() => setIsEditorOpen(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </ScalePressable>
          </View>

          <ScrollView
            style={styles.modalScreen}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ProfileInfoForm
              profile={draftProfile}
              onChange={setDraftProfile}
            />

            <AddressManager
              canAddMore={draftProfile.addresses.length < 3}
              onAddAddress={() => setDraftProfile(previous => addAddress(previous))}
              onDeleteAddress={addressId => {
                setDraftProfile(previous => deleteAddress(previous, addressId));
              }}
              onSetPrimary={addressId => {
                setDraftProfile(previous => setPrimaryAddress(previous, addressId));
              }}
              onUpdateAddress={(addressId, value) => {
                setDraftProfile(previous => updateAddress(previous, addressId, {
                  address: value,
                }));
              }}
              profile={draftProfile}
            />

            {saveError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Save issue</Text>
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <PrimaryButton
              title="Cancel"
              onPress={() => setIsEditorOpen(false)}
              style={styles.cancelAction}
              variant="secondary"
            />
            <PrimaryButton
              title={isSaving ? 'Saving...' : 'Save profile'}
              onPress={() => {
                void handleSaveProfile();
              }}
              loading={isSaving}
              style={styles.saveAction}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  loaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  loaderText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  errorCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
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
  incompleteCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.lg,
  },
  incompleteTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  incompleteText: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  incompleteAction: {
    marginTop: theme.spacing.md,
  },
  roleHelperText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  roleMetaText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  sessionAction: {
    marginTop: theme.spacing.md,
  },
  staffFields: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  inlineAction: {
    paddingVertical: 6,
  },
  inlineActionText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyText: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  settingLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  settingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tag,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  settingSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  modalCopy: {
    flex: 1,
  },
  modalEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  cancelAction: {
    flex: 0.4,
  },
  saveAction: {
    flex: 0.6,
  },
});
