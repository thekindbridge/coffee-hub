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
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../auth/context/AuthContext';
import { useCartState } from '../app/providers/CartProvider';
import { AddressManager } from '../features/profile/components/AddressManager';
import { ProfileInfoForm } from '../features/profile/components/ProfileInfoForm';
import { useProfileActions } from '../features/profile/hooks/useProfileActions';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useOffers } from '../hooks/useOffers';
import { useOrders } from '../hooks/useOrders';
import { TAB_ROUTES } from '../constants/routes';
import { formatShopTime } from '../shared/shopTiming';
import { useTheme, useThemedStyles } from '../theme';
import type { CustomerProfile } from '../types';
import { getCustomerPalette } from '../components/customer/designSystem';
import { StatusBadge } from '../components/customer/StatusBadge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';

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

      {trailing ?? (onPress ? (
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      ) : null)}
    </ScalePressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const route = useRoute<ProfileRoute>();
  const { theme, toggleTheme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { logout } = useAuthContext();
  const {
    currentTime,
    isShopOpen,
    isShopTimingLoading,
    shopTiming,
  } = useCartState();
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
  const statusTitle = isShopTimingLoading
    ? 'Checking store timing'
    : isShopOpen
      ? `Currently Open until ${formatShopTime(shopTiming.closeTime)}`
      : `Currently Closed until ${formatShopTime(shopTiming.openTime)}`;
  const statusSubtitle = isShopTimingLoading
    ? 'We are syncing operating hours now.'
    : isShopOpen
      ? `Accepting orders now • closes at ${formatShopTime(shopTiming.closeTime)}`
      : `Fresh orders reopen at ${formatShopTime(shopTiming.openTime)}`;

  const handleSaveProfile = async () => {
    const didSave = await saveProfile(draftProfile);
    if (didSave) {
      setIsEditorOpen(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.statusBanner}>
            <View>
              <Text style={styles.statusEyebrow}>Store status</Text>
              <Text style={styles.statusTitle}>{statusTitle}</Text>
              <Text style={styles.statusSubtitle}>{statusSubtitle}</Text>
            </View>
            <StatusBadge
              label={isShopOpen ? 'Open' : 'Closed'}
              tone={isShopOpen ? 'success' : 'pending'}
            />
          </View>

          <LinearGradient
            colors={palette.offerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.userCard, theme.shadows.card]}
          >
            <View style={styles.userCardTopRow}>
              <View style={styles.avatarWrap}>
                {authPhotoUrl ? (
                  <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{profileInitials}</Text>
                )}
              </View>

              <StatusBadge label={membershipLabel} tone="member" />
            </View>

            <Text style={styles.userName}>{profileDisplayName}</Text>
            <Text style={styles.userEmail}>{profile.email || 'coffeehub@guest.com'}</Text>
            <Text style={styles.userAddress}>
              {primaryAddress?.address || 'Add your main delivery address to speed up checkout.'}
            </Text>

            <ScalePressable
              accessibilityRole="button"
              onPress={() => {
                setDraftProfile(profile);
                setIsEditorOpen(true);
              }}
              style={styles.inlineEditAction}
            >
              <Text style={styles.inlineEditText}>Edit profile</Text>
            </ScalePressable>
          </LinearGradient>

          {isLoading ? (
            <View style={styles.messageCard}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.messageText}>Loading your profile...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Profile issue</Text>
              <Text style={styles.messageText}>{error}</Text>
            </View>
          ) : null}

          {!isProfileComplete ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Complete your profile</Text>
              <Text style={styles.messageText}>
                Add {missingSummary} so checkout and delivery details stay beautifully prefilled.
              </Text>
              <PrimaryButton
                title="Finish profile"
                onPress={() => {
                  setDraftProfile(profile);
                  setIsEditorOpen(true);
                }}
                style={styles.sectionAction}
              />
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Beans</Text>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statMeta}>Orders brewed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rewards</Text>
              <Text style={styles.statValue}>{activeOffers.length}</Text>
              <Text style={styles.statMeta}>Active offers</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Active orders</Text>
                <Text style={styles.sectionSubtitle}>A preview of what is still moving.</Text>
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
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(TAB_ROUTES.ORDERS)}
                style={styles.previewCard}
              >
                <View style={styles.previewHeader}>
                  <View style={styles.previewCopy}>
                    <Text style={styles.previewEyebrow}>Order #{activeOrders[0].id}</Text>
                    <Text style={styles.previewTitle}>
                      {activeOrders[0].items?.[0]?.name || 'COFFEE-HUB order'}
                    </Text>
                  </View>
                  <StatusBadge label={activeOrders[0].status} tone="progress" />
                </View>
                <Text style={styles.previewText}>
                  {activeOrders[0].items?.length ?? 0} item(s) • currently {activeOrders[0].status.toLowerCase()}.
                </Text>
              </ScalePressable>
            ) : (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>No active orders right now</Text>
                <Text style={styles.previewText}>
                  Your next checkout will appear here with status and progress.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Options</Text>
                <Text style={styles.sectionSubtitle}>Addresses, settings, and account actions.</Text>
              </View>
            </View>

            <ProfileOptionRow
              icon="location-outline"
              onPress={() => {
                setDraftProfile(profile);
                setIsEditorOpen(true);
              }}
              title="Addresses"
              subtitle={primaryAddress?.address || 'Manage your saved delivery places'}
            />

            <ProfileOptionRow
              icon={theme.isDark ? 'moon-outline' : 'sunny-outline'}
              title="Appearance"
              subtitle={theme.isDark ? 'Warm dark mode enabled' : 'Soft light mode enabled'}
              trailing={(
                <Switch
                  trackColor={{ false: palette.surfaceHighest, true: palette.caramel }}
                  thumbColor={palette.surfaceHigh}
                  value={theme.isDark}
                  onValueChange={() => {
                    toggleTheme();
                  }}
                />
              )}
            />

            <ProfileOptionRow
              icon="log-out-outline"
              onPress={() => {
                void logout().catch(logoutError => {
                  console.error('[ProfileScreen] logout:error', logoutError);
                });
              }}
              title="Log out"
              subtitle="Switch the current account"
            />
          </View>

          {isOrdersLoading ? (
            <Text style={styles.footerMeta}>Refreshing your account preview…</Text>
          ) : (
            <Text style={styles.footerMeta}>
              Current time: {currentTime} minutes into the day • {orders.length} order(s) connected to this account.
            </Text>
          )}
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
              <View style={styles.messageCard}>
                <Text style={styles.messageTitle}>Save issue</Text>
                <Text style={styles.messageText}>{saveError}</Text>
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: 120,
      gap: theme.spacing.lg,
    },
    statusBanner: {
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    statusEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    statusTitle: {
      marginTop: 6,
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    statusSubtitle: {
      marginTop: 4,
      maxWidth: '92%',
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    userCard: {
      borderRadius: theme.radius.hero,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    userCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    avatarWrap: {
      width: 76,
      height: 76,
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
    userName: {
      marginTop: theme.spacing.sm,
      fontSize: 28,
      fontWeight: '900',
      color: 'rgba(248, 244, 239, 0.98)',
    },
    userEmail: {
      fontSize: theme.typography.body,
      color: 'rgba(248, 244, 239, 0.86)',
    },
    userAddress: {
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
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
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
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.lg,
      gap: 6,
    },
    statLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    statValue: {
      fontSize: 30,
      fontWeight: '900',
      color: palette.caramel,
    },
    statMeta: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    sectionCard: {
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    sectionSubtitle: {
      marginTop: 4,
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
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      backgroundColor: palette.surfaceHighest,
      padding: theme.spacing.md,
      gap: 8,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    previewCopy: {
      flex: 1,
    },
    previewEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
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
      paddingVertical: theme.spacing.xs,
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
    footerMeta: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
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
    },
    modalEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    modalTitle: {
      marginTop: 4,
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
