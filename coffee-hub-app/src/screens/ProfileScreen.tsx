import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../auth/context/AuthContext';
import { GlassSurface } from '../components/ui/GlassSurface';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { AddressManager } from '../features/profile/components/AddressManager';
import { ProfileInfoForm } from '../features/profile/components/ProfileInfoForm';
import { useProfileActions } from '../features/profile/hooks/useProfileActions';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useOffers } from '../hooks/useOffers';
import { useOrders } from '../hooks/useOrders';
import { TAB_ROUTES } from '../constants/routes';
import { useTheme, useThemedStyles } from '../theme';
import type { CustomerProfile } from '../types';
import { getCustomerPalette } from '../components/customer/designSystem';
import { StatusBadge } from '../components/customer/StatusBadge';

type ProfileNavigation = NavigationProp<ParamListBase>;
type ProfileRoute = RouteProp<Record<string, { openEdit?: boolean } | undefined>, string>;

const FIELD_LABELS: Record<string, string> = {
  address: 'a primary address',
  name: 'your name',
  phone: 'your phone number',
};

function ProfileOptionRow({
  icon,
  onPress,
  subtitle,
  title,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
}) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <ScalePressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.optionRow}
    >
      <View style={styles.optionLead}>
        <View style={styles.optionIconWrap}>
          <Ionicons name={icon} size={18} color={palette.caramel} />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.optionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {trailing ?? (
        onPress ? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} /> : null
      )}
    </ScalePressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const route = useRoute<ProfileRoute>();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { logout } = useAuthContext();
  const { activeOffers } = useOffers();
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

  useEffect(() => {
    if (!isEditorOpen) {
      setDraftProfile(profile);
    }
  }, [isEditorOpen, profile]);

  useEffect(() => {
    if (!currentUserId || !route.params?.openEdit) {
      return;
    }

    setDraftProfile(profile);
    setIsEditorOpen(true);
    navigation.setParams({ openEdit: undefined });
  }, [currentUserId, navigation, profile, route.params?.openEdit]);

  const missingSummary = useMemo(
    () => missingFields.map(field => FIELD_LABELS[field] || field).join(', '),
    [missingFields],
  );
  const profileInitials = getProfileInitials(profileDisplayName);
  const membershipLabel = orders.length >= 6 ? 'Gold' : 'Member';

  const handleSaveProfile = async () => {
    const didSave = await saveProfile(draftProfile);
    if (didSave) {
      setIsEditorOpen(false);
    }
  };

  const handleOpenEditor = () => {
    setDraftProfile(profile);
    setIsEditorOpen(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>Account</Text>
            <Text style={styles.title}>Everything important, without the clutter.</Text>
            <Text style={styles.subtitle}>
              Keep profile details, rewards, orders, and addresses in one premium customer space.
            </Text>
          </View>

          <LinearGradient
            colors={palette.offerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, theme.shadows.card]}
          >
            <View style={styles.profileTopRow}>
              <View style={styles.avatarWrap}>
                {authPhotoUrl ? (
                  <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{profileInitials}</Text>
                )}
              </View>

              <StatusBadge label={membershipLabel} tone="member" />
            </View>

            <Text style={styles.profileName}>{profileDisplayName}</Text>
            <Text style={styles.profileEmail}>{profile.email || 'coffeehub@guest.com'}</Text>
            <Text style={styles.profileAddress}>
              {primaryAddress?.address || 'Add a delivery address to make checkout faster.'}
            </Text>

            <ScalePressable
              accessibilityRole="button"
              onPress={handleOpenEditor}
              style={styles.inlineEditAction}
            >
              <Text style={styles.inlineEditText}>Edit profile</Text>
            </ScalePressable>
          </LinearGradient>

          {isLoading ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.messageCard}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.messageText}>Loading your profile...</Text>
            </GlassSurface>
          ) : null}

          {error ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.messageCard}>
              <Text style={styles.messageTitle}>Profile issue</Text>
              <Text style={styles.messageText}>{error}</Text>
            </GlassSurface>
          ) : null}

          {!isProfileComplete ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.messageCard}>
              <Text style={styles.messageTitle}>Complete your profile</Text>
              <Text style={styles.messageText}>
                Add {missingSummary} so delivery and checkout stay ready to go.
              </Text>
              <PrimaryButton
                title="Finish Profile"
                onPress={handleOpenEditor}
                style={styles.sectionAction}
              />
            </GlassSurface>
          ) : null}

          <View style={styles.statsRow}>
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.statCard}>
              <Text style={styles.statLabel}>Rewards</Text>
              <Text style={styles.statValue}>{activeOffers.length}</Text>
              <Text style={styles.statMeta}>Active offers</Text>
            </GlassSurface>

            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.statCard}>
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statMeta}>Total orders</Text>
            </GlassSurface>
          </View>

          <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Orders</Text>
                <Text style={styles.sectionSubtitle}>Quick access to your latest coffee activity.</Text>
              </View>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(TAB_ROUTES.ORDERS)}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionText}>View all</Text>
              </ScalePressable>
            </View>

            {activeOrders.length > 0 ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewCopy}>
                    <Text style={styles.previewEyebrow}>Active now</Text>
                    <Text style={styles.previewTitle}>
                      {activeOrders[0].items?.[0]?.name || 'COFFEE-HUB order'}
                    </Text>
                    <Text style={styles.previewText}>
                      {activeOrders[0].items?.length ?? 0} item(s) in progress
                    </Text>
                  </View>
                  <StatusBadge label={activeOrders[0].status} tone="progress" />
                </View>
              </View>
            ) : (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>No active orders right now</Text>
                <Text style={styles.previewText}>
                  Your next checkout will appear here with a cleaner order status summary.
                </Text>
              </View>
            )}

            <PrimaryButton
              title={isOrdersLoading ? 'Refreshing...' : 'Open Orders'}
              onPress={() => navigation.navigate(TAB_ROUTES.ORDERS)}
              variant="secondary"
            />
          </GlassSurface>

          <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.sectionCard}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <Text style={styles.sectionSubtitle}>Manage the details that power your checkout flow.</Text>
            </View>

            <ProfileOptionRow
              icon="person-outline"
              onPress={handleOpenEditor}
              title="Profile details"
              subtitle={isProfileComplete
                ? 'Edit your name, phone, and account details'
                : 'Complete your name, phone, and delivery details'}
            />

            <ProfileOptionRow
              icon="location-outline"
              onPress={handleOpenEditor}
              title="Saved addresses"
              subtitle={primaryAddress?.address || 'Add your main delivery address'}
            />
          </GlassSurface>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => {
              void logout().catch(logoutError => {
                console.error('[ProfileScreen] logout:error', logoutError);
              });
            }}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFF3EE" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </ScalePressable>
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
              <Ionicons name="close" size={20} color={palette.text} />
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
              <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.messageCard}>
                <Text style={styles.messageTitle}>Save issue</Text>
                <Text style={styles.messageText}>{saveError}</Text>
              </GlassSurface>
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: 120,
      gap: theme.spacing.xl,
    },
    headerBlock: {
      gap: 8,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    title: {
      maxWidth: '92%',
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '900',
      color: palette.text,
    },
    subtitle: {
      maxWidth: '92%',
      fontSize: 15,
      lineHeight: 22,
      color: palette.textMuted,
    },
    profileCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    profileTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    avatarWrap: {
      width: 78,
      height: 78,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '900',
      color: 'rgba(248, 244, 239, 0.96)',
    },
    profileName: {
      marginTop: theme.spacing.sm,
      fontSize: 28,
      fontWeight: '900',
      color: 'rgba(248, 244, 239, 0.98)',
    },
    profileEmail: {
      fontSize: theme.typography.body,
      color: 'rgba(248, 244, 239, 0.88)',
    },
    profileAddress: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: 'rgba(248, 244, 239, 0.78)',
    },
    inlineEditAction: {
      alignSelf: 'flex-start',
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    inlineEditText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: 'rgba(248, 244, 239, 0.96)',
    },
    messageCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    messageTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    messageText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    sectionAction: {
      marginTop: theme.spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    statCard: {
      flex: 1,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: 6,
    },
    statLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '900',
      color: palette.caramel,
    },
    statMeta: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    sectionCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionCopy: {
      flex: 1,
      gap: 4,
    },
    sectionTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    sectionSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    inlineAction: {
      paddingVertical: 6,
    },
    inlineActionText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.caramel,
    },
    previewCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: palette.surfaceHighest,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    previewCopy: {
      flex: 1,
      gap: 4,
    },
    previewEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    previewTitle: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.text,
    },
    previewText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    optionRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    optionLead: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHighest,
    },
    optionCopy: {
      flex: 1,
    },
    optionTitle: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.text,
    },
    optionSubtitle: {
      marginTop: 4,
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    logoutButton: {
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: '#4F1212',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFF3EE',
    },
    modalScreen: {
      flex: 1,
      backgroundColor: palette.background,
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
      gap: 4,
    },
    modalEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    modalTitle: {
      fontSize: theme.typography.heading,
      fontWeight: '800',
      color: palette.text,
    },
    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
    },
    modalContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      backgroundColor: palette.surfaceHigh,
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
};
