import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../auth/context/AuthContext';
import { AppHeader } from '../../components/customer/AppHeader';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAuth } from '../../hooks/useAuth';
import { useShopTiming } from '../../hooks/useShopTiming';
import { updateShopTimingRequest } from '../../services/api/shopTimingService';
import {
  buildOpensInMessage,
  formatShopTime,
  formatShopTimingRange,
  parseTimeToMinutes,
  validateShopTiming,
  type ShopTiming,
} from '../../shared/shopTiming';
import { TimePickerInput } from '../components';
import { useAccessRoles } from '../hooks';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';

type TimeField = 'openTime' | 'closeTime';

type TimePickerState = {
  field: TimeField;
  hour: number;
  minute: number;
};

type PickerStepperProps = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

type InfoCardProps = {
  label: string;
  value: string;
};

const MINUTE_QUICK_PICKS = [0, 15, 30, 45];

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
}

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatTimeValue(hour: number, minute: number) {
  return `${padTimePart(hour)}:${padTimePart(minute)}`;
}

function getTimePickerState(field: TimeField, value: string): TimePickerState {
  const totalMinutes = parseTimeToMinutes(value);
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;

  return {
    field,
    hour: Math.floor(safeMinutes / 60),
    minute: safeMinutes % 60,
  };
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return 'Waiting for first save';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated recently';
  }

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <View style={styles.infoCardWrap}>
      <GlassSurface
        depth="card"
        intensity={64}
        overlayColor={getAdminSurfaceColor('card')}
        style={styles.infoCard}
      >
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not available'}</Text>
      </GlassSurface>
    </View>
  );
}

function PickerStepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: PickerStepperProps) {
  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <GlassSurface
        depth="card"
        intensity={64}
        overlayColor={getAdminSurfaceColor('card')}
        style={styles.pickerStepper}
      >
        <ScalePressable accessibilityRole="button" onPress={onDecrement} style={styles.pickerButton}>
          <Ionicons color={adminPalette.caramelSoft} name="remove" size={18} />
        </ScalePressable>
        <Text style={styles.pickerValue}>{value}</Text>
        <ScalePressable accessibilityRole="button" onPress={onIncrement} style={styles.pickerButton}>
          <Ionicons color={adminPalette.caramelSoft} name="add" size={18} />
        </ScalePressable>
      </GlassSurface>
    </View>
  );
}

export function AdminProfileScreen() {
  const { currentUserEmail, normalizedCurrentEmail, user } = useAuth();
  const { logout } = useAuthContext();
  const { profile, profileDisplayName, authPhotoUrl, primaryAddress } = useProfileData();
  const { isMainAdmin } = useAccessRoles(currentUserEmail, normalizedCurrentEmail);
  const {
    closeTime,
    currentTime,
    isLoading,
    isOpen,
    openTime,
    refreshShopTiming,
    shopCountdownMessage,
    shopTiming,
  } = useShopTiming();
  const [draftTiming, setDraftTiming] = useState<ShopTiming>({
    openTime: '',
    closeTime: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerState, setPickerState] = useState<TimePickerState | null>(null);
  const [logoutError, setLogoutError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const displayName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const initials = getInitials(displayName);
  const locationValue = profile.adminLocation || primaryAddress?.address || 'COFFEE-HUB Roastery';
  const validationMessage = useMemo(
    () => validateShopTiming(draftTiming.openTime, draftTiming.closeTime),
    [draftTiming.closeTime, draftTiming.openTime],
  );

  useEffect(() => {
    if (hasUnsavedChanges) {
      return;
    }

    setDraftTiming({
      openTime: shopTiming.openTime,
      closeTime: shopTiming.closeTime,
      updatedAt: shopTiming.updatedAt,
    });
  }, [hasUnsavedChanges, shopTiming]);

  const changePickerPart = (part: 'hour' | 'minute', delta: number) => {
    setPickerState(current => {
      if (!current) {
        return current;
      }

      if (part === 'hour') {
        return {
          ...current,
          hour: (current.hour + delta + 24) % 24,
        };
      }

      return {
        ...current,
        minute: (current.minute + delta + 60) % 60,
      };
    });
  };

  const applyPickerValue = () => {
    if (!pickerState) {
      return;
    }

    setDraftTiming(current => ({
      ...current,
      [pickerState.field]: formatTimeValue(pickerState.hour, pickerState.minute),
    }));
    setHasUnsavedChanges(true);
    setSaveError('');
    setSaveSuccess('');
    setPickerState(null);
  };

  const resetDraft = () => {
    setDraftTiming({
      openTime: shopTiming.openTime,
      closeTime: shopTiming.closeTime,
      updatedAt: shopTiming.updatedAt,
    });
    setHasUnsavedChanges(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    if (validationMessage) {
      setSaveError(validationMessage);
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const response = await updateShopTimingRequest({
        openTime: draftTiming.openTime,
        closeTime: draftTiming.closeTime,
        userEmail: currentUserEmail,
      });
      await refreshShopTiming({ suppressLoading: true });
      setDraftTiming(response.shopTiming);
      setHasUnsavedChanges(false);
      setSaveSuccess('Shop timing saved to Firestore settings/shop.');
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save shop timing right now.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const pickerPreviewValue = pickerState
    ? formatTimeValue(pickerState.hour, pickerState.minute)
    : '00:00';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenTransition style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            mode="admin"
            avatarUrl={authPhotoUrl}
            initials={initials}
            title="COFFEE-HUB"
            subtitle="Admin profile"
          />

          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Admin Profile</Text>
            <Text style={styles.title}>Keep identity, access, and timings in one place.</Text>
            <Text style={styles.subtitle}>
              Manage the live delivery window without leaving the premium control surface.
            </Text>
          </View>

          <View style={styles.profileWrap}>
            <GlassSurface
              depth="card"
              intensity={72}
              overlayColor={getAdminSurfaceColor('card')}
              style={styles.profileCard}
            >
              <View style={styles.avatarWrap}>
                <GlassSurface
                  depth="floating"
                  intensity={72}
                  overlayColor={getAdminSurfaceColor('floating')}
                  style={styles.avatarGlass}
                >
                  {authPhotoUrl ? (
                    <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                </GlassSurface>
              </View>

              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileRole}>{isMainAdmin ? 'Main Admin' : 'Admin'}</Text>
            </GlassSurface>
          </View>

          <View style={styles.infoGrid}>
            <InfoCard label="Name" value={displayName} />
            <InfoCard label="Email" value={currentUserEmail} />
            <InfoCard label="Location" value={locationValue} />
          </View>

          <View style={styles.statusWrap}>
            <GlassSurface
              depth="card"
              intensity={66}
              overlayColor={getAdminSurfaceColor('card')}
              style={styles.statusCard}
            >
              <View style={styles.statusHeader}>
                <Text style={styles.sectionTitle}>Online Delivery Timings</Text>
                <View style={[styles.statusChip, isOpen ? styles.statusChipOpen : styles.statusChipClosed]}>
                  <Text style={[styles.statusChipText, isOpen ? styles.statusChipTextOpen : styles.statusChipTextClosed]}>
                    {isOpen ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={adminPalette.caramelSoft} size="small" />
                  <Text style={styles.statusText}>Loading timing...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.statusValue}>
                    {formatShopTimingRange(openTime, closeTime)}
                  </Text>
                  <Text style={styles.statusText}>
                    {isOpen
                      ? `Accepting orders until ${formatShopTime(closeTime)}.`
                      : `${shopCountdownMessage || buildOpensInMessage(openTime, currentTime)}`}
                  </Text>
                  <Text style={styles.statusMeta}>
                    Last updated: {formatUpdatedAt(shopTiming.updatedAt)}
                  </Text>
                </>
              )}
            </GlassSurface>
          </View>

          <View style={styles.timingWrap}>
            <TimePickerInput
              label="Open Time"
              value={draftTiming.openTime}
              description="Customers can start placing orders from this time."
              onPress={() => setPickerState(getTimePickerState('openTime', draftTiming.openTime))}
            />

            <TimePickerInput
              label="Close Time"
              value={draftTiming.closeTime}
              description="New delivery orders stop at this time."
              onPress={() => setPickerState(getTimePickerState('closeTime', draftTiming.closeTime))}
            />

            {validationMessage ? (
              <View style={styles.messageWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(225, 161, 141, 0.14)"
                  style={styles.messageCard}
                >
                  <Text style={styles.messageTextDanger}>{validationMessage}</Text>
                </GlassSurface>
              </View>
            ) : null}

            {saveError ? (
              <View style={styles.messageWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(225, 161, 141, 0.14)"
                  style={styles.messageCard}
                >
                  <Text style={styles.messageTextDanger}>{saveError}</Text>
                </GlassSurface>
              </View>
            ) : null}

            {saveSuccess ? (
              <View style={styles.messageWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(151, 201, 157, 0.18)"
                  style={styles.messageCard}
                >
                  <Text style={styles.messageTextSuccess}>{saveSuccess}</Text>
                </GlassSurface>
              </View>
            ) : null}

            <PrimaryButton
              title={isSaving ? 'Saving Changes...' : 'Save Changes'}
              onPress={() => {
                void handleSave();
              }}
              loading={isSaving}
              disabled={isSaving || isLoading}
            />
            <PrimaryButton
              title="Discard"
              variant="ghost"
              onPress={resetDraft}
              disabled={!hasUnsavedChanges}
            />

            <ScalePressable
              accessibilityRole="button"
              onPress={() => {
                setLogoutError('');
                void logout().catch(error => {
                  const message = error instanceof Error
                    ? error.message
                    : 'Unable to log out right now.';
                  setLogoutError(message);
                });
              }}
              style={styles.logoutButton}
            >
              <Ionicons color="#FFF3EE" name="log-out-outline" size={18} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </ScalePressable>

            {logoutError ? (
              <View style={styles.messageWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(225, 161, 141, 0.14)"
                  style={styles.messageCard}
                >
                  <Text style={styles.messageTextDanger}>{logoutError}</Text>
                </GlassSurface>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </ScreenTransition>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(pickerState)}
        onRequestClose={() => setPickerState(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerState(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>
                  {pickerState?.field === 'closeTime' ? 'Close Time' : 'Open Time'}
                </Text>
                <Text style={styles.modalTitle}>{pickerPreviewValue}</Text>
                <Text style={styles.modalSubtitle}>{formatShopTime(pickerPreviewValue)}</Text>
              </View>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => setPickerState(null)}
                style={styles.closeButton}
              >
                <GlassSurface
                  depth="floating"
                  intensity={58}
                  overlayColor={getAdminSurfaceColor('floating')}
                  style={styles.closeButtonGlass}
                >
                  <Ionicons color={adminPalette.text} name="close" size={20} />
                </GlassSurface>
              </ScalePressable>
            </View>

            <View style={styles.pickerRow}>
              <PickerStepper
                label="Hour"
                value={padTimePart(pickerState?.hour ?? 0)}
                onDecrement={() => changePickerPart('hour', -1)}
                onIncrement={() => changePickerPart('hour', 1)}
              />
              <PickerStepper
                label="Minute"
                value={padTimePart(pickerState?.minute ?? 0)}
                onDecrement={() => changePickerPart('minute', -1)}
                onIncrement={() => changePickerPart('minute', 1)}
              />
            </View>

            <View style={styles.quickMinuteRow}>
              {MINUTE_QUICK_PICKS.map(minute => {
                const isSelected = minute === (pickerState?.minute ?? 0);

                return (
                  <ScalePressable
                    key={`minute-${minute}`}
                    accessibilityRole="button"
                    onPress={() => {
                      setPickerState(current => (
                        current
                          ? {
                              ...current,
                              minute,
                            }
                          : current
                      ));
                    }}
                    style={styles.quickChipWrap}
                  >
                    <GlassSurface
                      depth="floating"
                      intensity={58}
                      overlayColor={isSelected ? 'rgba(200, 146, 99, 0.24)' : getAdminSurfaceColor('floating')}
                      style={[styles.quickChip, isSelected ? styles.quickChipActive : null]}
                    >
                      <Text style={[styles.quickChipText, isSelected ? styles.quickChipTextActive : null]}>
                        :{padTimePart(minute)}
                      </Text>
                    </GlassSurface>
                  </ScalePressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                variant="ghost"
                onPress={() => setPickerState(null)}
                style={styles.modalAction}
              />
              <PrimaryButton
                title="Apply"
                onPress={applyPickerValue}
                style={styles.modalAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: adminPalette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 20,
  },
  titleBlock: {
    gap: 10,
  },
  eyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: adminPalette.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: adminPalette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  profileWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  profileCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    borderRadius: 44,
  },
  avatarGlass: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: adminPalette.text,
    fontSize: 30,
    fontWeight: '900',
  },
  profileName: {
    color: adminPalette.text,
    fontSize: 24,
    fontWeight: '900',
  },
  profileRole: {
    color: adminPalette.caramelSoft,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoGrid: {
    gap: 12,
  },
  infoCardWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  infoCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 16,
    gap: 6,
  },
  infoLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: adminPalette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  statusWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  statusCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: adminPalette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statusChip: {
    borderRadius: adminRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipOpen: {
    backgroundColor: 'rgba(151, 201, 157, 0.16)',
  },
  statusChipClosed: {
    backgroundColor: 'rgba(225, 161, 141, 0.16)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusChipTextOpen: {
    color: adminPalette.success,
  },
  statusChipTextClosed: {
    color: adminPalette.danger,
  },
  statusValue: {
    color: adminPalette.text,
    fontSize: 22,
    fontWeight: '900',
  },
  statusText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  statusMeta: {
    color: adminPalette.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timingWrap: {
    gap: 14,
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
  messageWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  messageCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 14,
  },
  messageTextDanger: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextSuccess: {
    color: adminPalette.success,
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 6, 0.62)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: adminPalette.backdrop,
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  modalCopy: {
    flex: 1,
    gap: 4,
  },
  modalEyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: adminPalette.text,
    fontSize: 30,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    borderRadius: 22,
  },
  closeButtonGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
    gap: 8,
  },
  pickerLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  pickerStepper: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminPalette.ghost,
  },
  pickerValue: {
    color: adminPalette.text,
    fontSize: 28,
    fontWeight: '900',
  },
  quickMinuteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickChipWrap: {
    borderRadius: adminRadius.pill,
  },
  quickChip: {
    borderRadius: adminRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickChipActive: {
    backgroundColor: 'rgba(200, 146, 99, 0.18)',
  },
  quickChipText: {
    color: adminPalette.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  quickChipTextActive: {
    color: adminPalette.caramelSoft,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalAction: {
    flex: 1,
  },
});
