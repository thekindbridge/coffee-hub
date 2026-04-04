import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../auth/context/AuthContext';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { useAuth } from '../../hooks/useAuth';
import { useShopTiming } from '../../hooks/useShopTiming';
import { updateShopTimingRequest } from '../../services/api/shopTimingService';
import {
  EMPTY_SHOP_TIMING,
  SHOP_TIMEZONE,
  buildOpensInMessage,
  formatShopTime,
  formatShopTimingRange,
  parseTimeToMinutes,
  validateShopTiming,
  type ShopTiming,
} from '../../shared/shopTiming';
import { useTheme, useThemedStyles } from '../../theme';

type TimeField = 'openTime' | 'closeTime';

type TimePickerState = {
  field: TimeField;
  hour: number;
  minute: number;
};

const MINUTE_QUICK_PICKS = [0, 15, 30, 45];

const buildAdminName = (email: string, displayName?: string | null) => {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  const fallbackLocalPart = email.split('@')[0] || 'admin';
  return fallbackLocalPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const padTimePart = (value: number) => String(value).padStart(2, '0');

const formatTimeValue = (hour: number, minute: number) => (
  `${padTimePart(hour)}:${padTimePart(minute)}`
);

const getTimePickerState = (field: TimeField, value: string): TimePickerState => {
  const totalMinutes = parseTimeToMinutes(value);
  const safeMinutes = Number.isFinite(totalMinutes)
    ? totalMinutes
    : 0;

  return {
    field,
    hour: Math.floor(safeMinutes / 60),
    minute: safeMinutes % 60,
  };
};

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return 'Waiting for first save';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Updated recently';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

type TimingFieldCardProps = {
  description: string;
  label: string;
  onPress: () => void;
  value: string;
};

function TimingFieldCard({
  description,
  label,
  onPress,
  value,
}: TimingFieldCardProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.timingFieldCard}
    >
      <View style={styles.timingFieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
        <Text style={styles.fieldDescription}>{description}</Text>
      </View>

      <View style={styles.fieldMeta}>
        <Text style={styles.fieldDisplay}>{formatShopTime(value)}</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
    </ScalePressable>
  );
}

type PickerStepperProps = {
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  value: string;
};

function PickerStepper({
  label,
  onDecrement,
  onIncrement,
  value,
}: PickerStepperProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerStepper}>
        <ScalePressable
          accessibilityRole="button"
          onPress={onDecrement}
          style={styles.pickerButton}
        >
          <Ionicons name="remove" size={18} color={theme.colors.primary} />
        </ScalePressable>

        <Text style={styles.pickerValue}>{value}</Text>

        <ScalePressable
          accessibilityRole="button"
          onPress={onIncrement}
          style={styles.pickerButton}
        >
          <Ionicons name="add" size={18} color={theme.colors.primary} />
        </ScalePressable>
      </View>
    </View>
  );
}

export function AdminProfileScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user: currentUser } = useAuth();
  const { logout } = useAuthContext();
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
  const adminEmail = currentUser?.email || 'coffeehubinkollu@gmail.com';
  const adminName = buildAdminName(adminEmail, currentUser?.displayName);
  const avatarLetter = adminName.charAt(0).toUpperCase() || 'A';
  const [draftTiming, setDraftTiming] = useState<ShopTiming>(EMPTY_SHOP_TIMING);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerState, setPickerState] = useState<TimePickerState | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (hasUnsavedChanges) {
      return;
    }

    setDraftTiming({
      openTime: shopTiming.openTime,
      closeTime: shopTiming.closeTime,
      updatedAt: shopTiming.updatedAt,
    });
  }, [
    hasUnsavedChanges,
    shopTiming.closeTime,
    shopTiming.openTime,
    shopTiming.updatedAt,
  ]);

  const statusTitle = isOpen ? 'Shop is open' : 'Shop is closed';
  const statusMessage = isOpen
    ? `Accepting orders until ${formatShopTime(closeTime)}.`
    : `Orders reopen at ${formatShopTime(openTime)}.`;
  const timingValidationMessage = useMemo(
    () => validateShopTiming(draftTiming.openTime, draftTiming.closeTime),
    [draftTiming.closeTime, draftTiming.openTime],
  );
  const draftRangeLabel = useMemo(() => {
    const validationError = validateShopTiming(draftTiming.openTime, draftTiming.closeTime);
    if (validationError) {
      return `${draftTiming.openTime} - ${draftTiming.closeTime}`;
    }

    return formatShopTimingRange(draftTiming.openTime, draftTiming.closeTime);
  }, [draftTiming.closeTime, draftTiming.openTime]);

  const updateDraftTimingField = (field: TimeField, value: string) => {
    setDraftTiming(previous => ({
      ...previous,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
    setSaveError('');
    setSaveSuccess('');
  };

  const openTimePicker = (field: TimeField) => {
    setSaveError('');
    setSaveSuccess('');
    setPickerState(getTimePickerState(field, draftTiming[field]));
  };

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

    updateDraftTimingField(
      pickerState.field,
      formatTimeValue(pickerState.hour, pickerState.minute),
    );
    setPickerState(null);
  };

  const resetDraftTiming = () => {
    setDraftTiming({
      openTime: shopTiming.openTime,
      closeTime: shopTiming.closeTime,
      updatedAt: shopTiming.updatedAt,
    });
    setHasUnsavedChanges(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSaveTiming = async () => {
    if (timingValidationMessage) {
      setSaveError(timingValidationMessage);
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
        userEmail: adminEmail,
      });
      await refreshShopTiming({ suppressLoading: true });
      setDraftTiming(response.shopTiming);

      setHasUnsavedChanges(false);
      setSaveSuccess(`Saved ${draftRangeLabel} to Firestore settings/shop.`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to save shop timing right now.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const pickerPreviewValue = pickerState
    ? formatTimeValue(pickerState.hour, pickerState.minute)
    : '00:00';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Admin Account</Text>
        <Text style={styles.title}>Profile & shop hours</Text>
        <Text style={styles.subtitle}>
          Control live order availability for the mobile customer flow from one place.
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>

          <Text style={styles.adminName}>{adminName || 'Coffee Hub Admin'}</Text>
          <Text style={styles.adminEmail}>{adminEmail}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.sectionTitle}>Live shop status</Text>
              <Text style={styles.sectionDescription}>
                Customer ordering is enforced in {SHOP_TIMEZONE}.
              </Text>
            </View>

            <View style={[styles.statusChip, isOpen ? styles.statusChipOpen : styles.statusChipClosed]}>
              <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
              <Text style={[styles.statusChipText, isOpen ? styles.statusChipTextOpen : styles.statusChipTextClosed]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.metaText}>Loading shop timing...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.statusTitle}>{statusTitle}</Text>
              <Text style={styles.statusMessage}>{statusMessage}</Text>
              <Text style={styles.metaText}>Hours: {formatShopTimingRange(openTime, closeTime)}</Text>
              <Text style={styles.metaText}>Current time: {formatShopTime(formatTimeValue(Math.floor(currentTime / 60), currentTime % 60))}</Text>
              {!isOpen ? (
                <Text style={styles.countdownText}>
                  {shopCountdownMessage || buildOpensInMessage(openTime, currentTime)}
                </Text>
              ) : null}
              <Text style={styles.updatedAtText}>
                Last updated: {formatUpdatedAt(shopTiming.updatedAt)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.timingCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Shop timing</Text>
              <Text style={styles.sectionDescription}>
                Saved to Firestore `settings/shop` and synced to menu, checkout, and final order placement.
              </Text>
            </View>
          </View>

          <TimingFieldCard
            label="Opening time"
            value={draftTiming.openTime}
            description="Customers can start adding items from this time."
            onPress={() => openTimePicker('openTime')}
          />

          <TimingFieldCard
            label="Closing time"
            value={draftTiming.closeTime}
            description="New orders stop at this time."
            onPress={() => openTimePicker('closeTime')}
          />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Draft window</Text>
            <Text style={styles.summaryValue}>{draftRangeLabel}</Text>
            <Text style={styles.summaryMeta}>
              Timing is stored in strict HH:MM format and midnight crossing is intentionally blocked.
            </Text>
          </View>

          {timingValidationMessage ? (
            <View style={styles.inlineErrorCard}>
              <Text style={styles.inlineErrorText}>{timingValidationMessage}</Text>
            </View>
          ) : null}

          {saveError ? (
            <View style={styles.inlineErrorCard}>
              <Text style={styles.inlineErrorText}>{saveError}</Text>
            </View>
          ) : null}

          {saveSuccess ? (
            <View style={styles.inlineSuccessCard}>
              <Text style={styles.inlineSuccessText}>{saveSuccess}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <PrimaryButton
              title="Reset"
              onPress={resetDraftTiming}
              style={styles.secondaryActionSingle}
              variant="ghost"
            />
          </View>

          <PrimaryButton
            title={isSaving ? 'Saving timing...' : 'Save shop timing'}
            onPress={() => {
              void handleSaveTiming();
            }}
            disabled={isLoading || isSaving}
            loading={isSaving}
            style={styles.primaryAction}
          />

          <Text style={styles.footerNote}>
            Source of truth: Firestore `settings/shop` with `openTime`, `closeTime`, and `updatedAt`.
          </Text>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionDescription}>
            Admin access is still derived from `admin_access/{'{email}'}` after login. Log out here to switch accounts.
          </Text>
          <Text style={styles.accountMeta}>Current account email: {adminEmail}</Text>
          <PrimaryButton
            title="Log out"
            onPress={() => {
              void logout().catch(logoutError => {
                console.error('[AdminProfileScreen] logout:error', logoutError);
              });
            }}
            style={styles.primaryAction}
            variant="secondary"
          />
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(pickerState)}
        onRequestClose={() => setPickerState(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>
                  {pickerState?.field === 'closeTime' ? 'Closing time' : 'Opening time'}
                </Text>
                <Text style={styles.modalTitle}>{pickerPreviewValue}</Text>
                <Text style={styles.modalSubtitle}>{formatShopTime(pickerPreviewValue)}</Text>
              </View>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => setPickerState(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
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
                    style={[
                      styles.quickMinuteChip,
                      isSelected ? styles.quickMinuteChipSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickMinuteText,
                        isSelected ? styles.quickMinuteTextSelected : null,
                      ]}
                    >
                      :{padTimePart(minute)}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>

            <Text style={styles.modalHint}>
              Use one-day timing only. Midnight crossing is not allowed.
            </Text>

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setPickerState(null)}
                style={styles.modalSecondaryAction}
                variant="secondary"
              />
              <PrimaryButton
                title="Apply"
                onPress={applyPickerValue}
                style={styles.modalPrimaryAction}
              />
            </View>
          </View>
        </View>
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
    paddingBottom: theme.spacing.xxl,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 22,
    marginTop: 8,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.xl,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  avatarText: {
    color: theme.colors.onPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  adminName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  adminEmail: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    marginTop: 8,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: theme.colors.tag,
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  statusHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionCopy: {
    gap: 6,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  sectionDescription: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 21,
    marginTop: 6,
  },
  statusChip: {
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipOpen: {
    backgroundColor: theme.colors.successSurface,
  },
  statusChipClosed: {
    backgroundColor: theme.colors.dangerSurface,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusDotOpen: {
    backgroundColor: theme.colors.success,
  },
  statusDotClosed: {
    backgroundColor: theme.colors.danger,
  },
  statusChipText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusChipTextOpen: {
    color: theme.colors.success,
  },
  statusChipTextClosed: {
    color: theme.colors.danger,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  statusTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: theme.spacing.lg,
  },
  statusMessage: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 21,
    marginTop: 6,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    marginTop: 6,
  },
  countdownText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  updatedAtText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    marginTop: theme.spacing.md,
  },
  timingCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  timingFieldCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  timingFieldCopy: {
    flex: 1,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  fieldDescription: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 20,
    marginTop: 6,
  },
  fieldMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  fieldDisplay: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: theme.colors.tag,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  summaryMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    marginTop: 8,
  },
  inlineErrorCard: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  inlineErrorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body,
    lineHeight: 20,
  },
  inlineSuccessCard: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.success,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  inlineSuccessText: {
    color: theme.colors.success,
    fontSize: theme.typography.body,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  secondaryActionSingle: {
    flex: 1,
  },
  primaryAction: {
    marginTop: theme.spacing.md,
  },
  footerNote: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    marginTop: theme.spacing.md,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  accountMeta: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    marginTop: theme.spacing.md,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: theme.colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.hero,
    padding: theme.spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  modalCopy: {
    flex: 1,
  },
  modalEyebrow: {
    color: theme.colors.secondary,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    marginTop: 4,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pickerStepper: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  pickerButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.tag,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pickerValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  quickMinuteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  quickMinuteChip: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickMinuteChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickMinuteText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  quickMinuteTextSelected: {
    color: theme.colors.onPrimary,
  },
  modalHint: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    marginTop: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  modalSecondaryAction: {
    flex: 0.42,
  },
  modalPrimaryAction: {
    flex: 0.58,
  },
});
