import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../auth/context/AuthContext';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { TAB_ROUTES } from '../constants/routes';
import { AddressManager } from '../features/profile/components/AddressManager';
import { ProfileInfoForm } from '../features/profile/components/ProfileInfoForm';
import { useProfileActions } from '../features/profile/hooks/useProfileActions';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useOrders } from '../hooks/useOrders';
import { useTheme, useThemedStyles } from '../theme';
import type { CustomerProfile } from '../types';

type ProfileNavigation = NavigationProp<ParamListBase>;
type ProfileRoute = RouteProp<Record<string, { openEdit?: boolean } | undefined>, string>;

const sensory = {
  background: '#151311',
  caramel: '#f2be8c',
  muted: '#9f928a',
  onCaramel: '#482904',
  surfaceContainer: '#221f1d',
  surfaceContainerHigh: '#2c2927',
  text: '#f7eee8',
};

function ProfileOptionRow({
  icon,
  onPress,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScalePressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.optionRow}
    >
      <View style={styles.optionLead}>
        <Ionicons name={icon} size={19} color="rgba(247, 238, 232, 0.78)" />
        <Text style={styles.optionTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(159, 146, 138, 0.7)" />
    </ScalePressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const route = useRoute<ProfileRoute>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { logout } = useAuthContext();
  const {
    authPhotoUrl,
    currentUserEmail,
    currentUserId,
    error,
    isLoading,
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
  const { orders } = useOrders({ currentUserId });
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

  const profileInitials = getProfileInitials(profileDisplayName);
  const profileEmail = profile.email || currentUserEmail || 'No email added';
  const rewardPoints = useMemo(
    () => orders.reduce((total, order) => {
      const amount = order.final_total ?? order.total_amount ?? 0;
      return total + Math.max(0, Math.floor(amount / 10));
    }, 0),
    [orders],
  );

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

  const renderAvatar = (size: 'header' | 'profile') => (
    authPhotoUrl ? (
      <Image
        source={{ uri: authPhotoUrl }}
        style={size === 'header' ? styles.headerAvatarImage : styles.profileAvatarImage}
      />
    ) : (
      <Text style={size === 'header' ? styles.headerAvatarText : styles.profileAvatarText}>
        {profileInitials}
      </Text>
    )
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <Ionicons name="cafe" size={17} color={sensory.caramel} />
              <Text style={styles.brandText}>Coffee Hub</Text>
            </View>

            <ScalePressable
              accessibilityRole="button"
              onPress={handleOpenEditor}
              style={styles.headerAvatarWrap}
            >
              {renderAvatar('header')}
            </ScalePressable>
          </View>

          <View style={[styles.profileCard, theme.shadows.card]}>
            <View style={styles.profileAvatarFrame}>
              <View style={styles.profileAvatarWrap}>
                {renderAvatar('profile')}
              </View>
              <ScalePressable
                accessibilityRole="button"
                onPress={handleOpenEditor}
                style={styles.editBadge}
              >
                <Ionicons name="create-outline" size={16} color={sensory.onCaramel} />
              </ScalePressable>
            </View>

            <Text style={styles.profileName}>{profileDisplayName}</Text>
            <Text style={styles.profileEmail}>{profileEmail}</Text>

            {isLoading ? (
              <Text style={styles.profileStatus}>Loading profile...</Text>
            ) : null}
            {error ? (
              <Text style={styles.profileStatus}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, theme.shadows.soft]}>
              <Ionicons name="bag-handle" size={20} color={sensory.caramel} />
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>

            <View style={[styles.statCard, theme.shadows.soft]}>
              <Ionicons name="star" size={20} color={sensory.caramel} />
              <Text style={styles.statValue}>{rewardPoints.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Reward Points</Text>
            </View>
          </View>

          <View style={styles.settingsBlock}>
            <Text style={styles.settingsLabel}>Account Settings</Text>
            <ProfileOptionRow
              icon="receipt-outline"
              onPress={() => navigation.navigate(TAB_ROUTES.ORDERS)}
              title="My Orders"
            />
            <ProfileOptionRow
              icon="location"
              onPress={handleOpenEditor}
              title="Addresses"
            />
            <ProfileOptionRow
              icon="card-outline"
              title="Payment Methods"
            />
            <ProfileOptionRow
              icon="settings-sharp"
              onPress={handleOpenEditor}
              title="Settings"
            />
          </View>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => {
              void logout().catch(logoutError => {
                console.error('[ProfileScreen] logout:error', logoutError);
              });
            }}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color="#f3aaa1" />
            <Text style={styles.logoutButtonText}>LOGOUT</Text>
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
              <Ionicons name="close" size={20} color={sensory.text} />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: sensory.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandText: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    color: sensory.caramel,
  },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sensory.surfaceContainerHigh,
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '900',
    color: sensory.text,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainer,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 10,
  },
  profileAvatarFrame: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarWrap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sensory.surfaceContainerHigh,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: sensory.text,
  },
  editBadge: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sensory.caramel,
  },
  profileName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: sensory.text,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 14,
    lineHeight: 21,
    color: sensory.muted,
    textAlign: 'center',
  },
  profileStatus: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(242, 190, 140, 0.86)',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainer,
    padding: 20,
    justifyContent: 'space-between',
  },
  statValue: {
    marginTop: 10,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    color: sensory.caramel,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(247, 238, 232, 0.72)',
  },
  settingsBlock: {
    gap: 14,
  },
  settingsLabel: {
    marginBottom: 2,
    paddingLeft: 8,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(159, 146, 138, 0.78)',
  },
  optionRow: {
    minHeight: 58,
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 16,
  },
  optionLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: sensory.text,
  },
  logoutButton: {
    minHeight: 58,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 190, 140, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#f3aaa1',
  },
  modalScreen: {
    flex: 1,
    backgroundColor: sensory.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
  },
  modalCopy: {
    flex: 1,
    gap: 4,
  },
  modalEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: sensory.caramel,
  },
  modalTitle: {
    fontSize: theme.typography.heading,
    fontWeight: '900',
    color: sensory.text,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sensory.surfaceContainerHigh,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  messageCard: {
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainer,
    padding: 20,
    gap: 8,
  },
  messageTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '900',
    color: sensory.text,
  },
  messageText: {
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: sensory.muted,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: sensory.surfaceContainer,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  cancelAction: {
    flex: 0.4,
  },
  saveAction: {
    flex: 0.6,
  },
});
