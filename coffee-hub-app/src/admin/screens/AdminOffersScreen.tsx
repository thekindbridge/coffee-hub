import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/customer/AppHeader';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAuth } from '../../hooks/useAuth';
import type { DiscountType, Offer, OfferInput } from '../../types';
import {
  AdminOfferCard,
  AdminStatCard,
} from '../components';
import { useOffers } from '../hooks';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';

type OfferDraft = {
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
};

type TypeChipProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

const EMPTY_DRAFT: OfferDraft = {
  title: '',
  description: '',
  couponCode: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '0',
  maxDiscountAmount: '',
};

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
}

function buildExpiryLabel(offer: Offer) {
  const created = new Date(offer.createdAt);
  if (Number.isNaN(created.getTime())) {
    return 'Not scheduled';
  }

  return `Live since ${created.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })}`;
}

function TypeChip({ isActive, label, onPress }: TypeChipProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={styles.typeChipWrap}
    >
      <GlassSurface
        depth="floating"
        intensity={58}
        overlayColor={isActive ? 'rgba(200, 146, 99, 0.24)' : getAdminSurfaceColor('floating')}
        style={[styles.typeChip, isActive ? styles.typeChipActive : null]}
      >
        <Text style={[styles.typeChipText, isActive ? styles.typeChipTextActive : null]}>
          {label}
        </Text>
      </GlassSurface>
    </ScalePressable>
  );
}

export function AdminOffersScreen() {
  const { user } = useAuth();
  const { profileDisplayName, authPhotoUrl } = useProfileData();
  const {
    createOffer,
    deleteOffer,
    error,
    offers,
    toggleOfferStatus,
    updateOffer,
  } = useOffers({ includeInactive: true });
  const [draft, setDraft] = useState<OfferDraft>(EMPTY_DRAFT);
  const [editingOfferId, setEditingOfferId] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const dashboardName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const headerInitials = getInitials(dashboardName);

  const sortedOffers = useMemo(
    () => [...offers].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    [offers],
  );

  const stats = useMemo(() => {
    const activeCount = offers.filter(offer => offer.isActive).length;
    const averageDiscount = offers.length
      ? Math.round(offers.reduce((sum, offer) => sum + offer.discountValue, 0) / offers.length)
      : 0;
    const latestOffer = sortedOffers[0] || null;

    return {
      activeCount,
      averageDiscount,
      latestOffer,
    };
  }, [offers, sortedOffers]);
  const editingOffer = useMemo(
    () => offers.find(offer => offer.id === editingOfferId) || null,
    [editingOfferId, offers],
  );

  const resetEditor = () => {
    setDraft(EMPTY_DRAFT);
    setEditingOfferId('');
    setFormError('');
    setIsEditorVisible(false);
  };

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditingOfferId('');
    setFormError('');
    setIsEditorVisible(true);
  };

  const openEdit = (offer: Offer) => {
    setDraft({
      title: offer.title,
      description: offer.description,
      couponCode: offer.couponCode,
      discountType: offer.discountType,
      discountValue: `${offer.discountValue}`,
      minOrderAmount: `${offer.minOrderAmount}`,
      maxDiscountAmount: offer.maxDiscountAmount ? `${offer.maxDiscountAmount}` : '',
    });
    setEditingOfferId(offer.id);
    setFormError('');
    setIsEditorVisible(true);
  };

  const buildPayload = (): OfferInput | null => {
    const couponCode = draft.couponCode.trim().toUpperCase();
    const discountValue = Number(draft.discountValue);
    const minOrderAmount = Number(draft.minOrderAmount || 0);
    const maxDiscountAmount = draft.maxDiscountAmount.trim()
      ? Number(draft.maxDiscountAmount)
      : undefined;

    if (!draft.title.trim() || !draft.description.trim() || !couponCode) {
      setFormError('Title, description, and coupon code are required.');
      return null;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Discount value must be greater than 0.');
      return null;
    }

    if (draft.discountType === 'percentage' && discountValue > 100) {
      setFormError('Percentage discounts must stay between 1 and 100.');
      return null;
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      setFormError('Minimum order must be 0 or more.');
      return null;
    }

    if (typeof maxDiscountAmount === 'number' && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
      setFormError('Maximum discount must be greater than 0.');
      return null;
    }

    return {
      title: draft.title.trim(),
      description: draft.description.trim(),
      couponCode,
      discountType: draft.discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      isActive: editingOffer?.isActive ?? true,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingOfferId) {
        await updateOffer(editingOfferId, payload);
      } else {
        await createOffer(payload);
      }

      resetEditor();
    } catch (saveError) {
      console.error('Failed to save offer', saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the offer right now.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (offer: Offer) => {
    Alert.alert(
      'Delete Offer',
      `Remove ${offer.couponCode} from Firestore permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteOffer(offer.id);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <FlatList
          data={sortedOffers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminOfferCard
              offer={item}
              expiryLabel={buildExpiryLabel(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
              onToggleActive={value => {
                void toggleOfferStatus(item.id, value);
              }}
            />
          )}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.headerContent}>
              <AppHeader
                mode="admin"
                avatarUrl={authPhotoUrl}
                initials={headerInitials}
                title="COFFEE-HUB"
                subtitle="Offer studio"
              />

              <View style={styles.titleBlock}>
                <Text style={styles.eyebrow}>Curate Your Exclusive Brews</Text>
                <Text style={styles.title}>Create premium campaigns without breaking the ritual.</Text>
                <Text style={styles.subtitle}>
                  Launch caramel-toned promo moments, edit live codes, and keep exclusive drops easy to control from mobile.
                </Text>
              </View>

              <PrimaryButton title="Create New Offer" onPress={openCreate} />

              <View style={styles.statsGrid}>
                <AdminStatCard
                  label="Live Campaigns"
                  value={stats.activeCount}
                  detail={`${offers.length} total offers`}
                  icon="sparkles-outline"
                  tone="success"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="Average Discount"
                  value={stats.averageDiscount || '0'}
                  detail="Average offer value"
                  icon="pricetags-outline"
                  tone="warning"
                  style={styles.halfStat}
                />
              </View>

              <View style={styles.performanceWrap}>
                <GlassSurface
                  depth="card"
                  intensity={66}
                  overlayColor={getAdminSurfaceColor('card')}
                  style={styles.performanceCard}
                >
                  <Text style={styles.performanceEyebrow}>Campaign Performance</Text>
                  <Text style={styles.performanceTitle}>
                    {stats.latestOffer?.title || 'No campaign launched yet'}
                  </Text>
                  <Text style={styles.performanceText}>
                    {stats.latestOffer
                      ? `${stats.latestOffer.couponCode} is the freshest launch in the system. Use the cards below to tune activity and keep offers current.`
                      : 'Once you create your first offer, its live metrics surface will show up here.'}
                  </Text>
                </GlassSurface>
              </View>

              {(formError || error) ? (
                <View style={styles.errorWrap}>
                  <GlassSurface
                    depth="card"
                    intensity={64}
                    overlayColor="rgba(225, 161, 141, 0.14)"
                    style={styles.errorCard}
                  >
                    <Text style={styles.errorText}>{formError || error}</Text>
                  </GlassSurface>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <GlassSurface
                depth="card"
                intensity={64}
                overlayColor={getAdminSurfaceColor('card')}
                style={styles.emptyCard}
              >
                <Text style={styles.emptyTitle}>No offers live yet</Text>
                <Text style={styles.emptyText}>
                  Create your first exclusive brew offer to activate this control room.
                </Text>
              </GlassSurface>
            </View>
          )}
        />
      </ScreenTransition>

      <Modal
        animationType="slide"
        transparent
        visible={isEditorVisible}
        onRequestClose={resetEditor}
      >
        <Pressable style={styles.modalBackdrop} onPress={resetEditor}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalEyebrow}>
              {editingOfferId ? 'Edit Offer' : 'Create Offer'}
            </Text>
            <Text style={styles.modalTitle}>
              {editingOfferId ? 'Refine the active campaign' : 'Launch a new campaign'}
            </Text>
            <Text style={styles.modalSubtitle}>
              This editor writes into the existing offers collection without changing the backend data model.
            </Text>

            <TextInput
              placeholder="Campaign title"
              placeholderTextColor={adminPalette.textMuted}
              style={styles.input}
              value={draft.title}
              onChangeText={value => setDraft(current => ({ ...current, title: value }))}
            />
            <TextInput
              multiline
              placeholder="Offer description"
              placeholderTextColor={adminPalette.textMuted}
              style={[styles.input, styles.multilineInput]}
              value={draft.description}
              onChangeText={value => setDraft(current => ({ ...current, description: value }))}
            />
            <TextInput
              autoCapitalize="characters"
              placeholder="Coupon code"
              placeholderTextColor={adminPalette.textMuted}
              style={styles.input}
              value={draft.couponCode}
              onChangeText={value => setDraft(current => ({ ...current, couponCode: value.toUpperCase() }))}
            />

            <View style={styles.typeRow}>
              <TypeChip
                label="Percentage"
                isActive={draft.discountType === 'percentage'}
                onPress={() => setDraft(current => ({ ...current, discountType: 'percentage' }))}
              />
              <TypeChip
                label="Flat"
                isActive={draft.discountType === 'flat'}
                onPress={() => setDraft(current => ({ ...current, discountType: 'flat' }))}
              />
            </View>

            <TextInput
              keyboardType="decimal-pad"
              placeholder={draft.discountType === 'percentage' ? 'Discount %' : 'Flat discount'}
              placeholderTextColor={adminPalette.textMuted}
              style={styles.input}
              value={draft.discountValue}
              onChangeText={value => setDraft(current => ({ ...current, discountValue: value }))}
            />
            <TextInput
              keyboardType="decimal-pad"
              placeholder="Minimum order amount"
              placeholderTextColor={adminPalette.textMuted}
              style={styles.input}
              value={draft.minOrderAmount}
              onChangeText={value => setDraft(current => ({ ...current, minOrderAmount: value }))}
            />
            <TextInput
              keyboardType="decimal-pad"
              placeholder="Maximum discount (optional)"
              placeholderTextColor={adminPalette.textMuted}
              style={styles.input}
              value={draft.maxDiscountAmount}
              onChangeText={value => setDraft(current => ({ ...current, maxDiscountAmount: value }))}
            />

            {(formError || error) ? (
              <View style={styles.inlineErrorWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(225, 161, 141, 0.14)"
                  style={styles.inlineErrorCard}
                >
                  <Text style={styles.inlineErrorText}>{formError || error}</Text>
                </GlassSurface>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Discard"
                variant="ghost"
                onPress={resetEditor}
                style={styles.modalAction}
              />
              <PrimaryButton
                title={editingOfferId ? 'Save Offer' : 'Create Offer'}
                onPress={() => {
                  void handleSave();
                }}
                loading={isSaving}
                disabled={isSaving}
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
    gap: 16,
  },
  headerContent: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfStat: {
    width: '48.2%',
  },
  performanceWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  performanceCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
  },
  performanceEyebrow: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  performanceTitle: {
    color: adminPalette.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
  },
  performanceText: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  errorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  errorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 16,
  },
  errorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  emptyCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: adminPalette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: adminPalette.textMuted,
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
    gap: 14,
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
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: adminPalette.ghost,
    borderRadius: adminRadius.control,
    color: adminPalette.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChipWrap: {
    flex: 1,
    borderRadius: adminRadius.pill,
  },
  typeChip: {
    borderRadius: adminRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    backgroundColor: 'rgba(200, 146, 99, 0.18)',
  },
  typeChipText: {
    color: adminPalette.textSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  typeChipTextActive: {
    color: adminPalette.caramelSoft,
  },
  inlineErrorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  inlineErrorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 14,
  },
  inlineErrorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalAction: {
    flex: 1,
  },
});
