import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOffers } from '../hooks';
import type { Offer, OfferInput } from '../../types';

type DiscountType = 'percentage' | 'flat';

const toUppercaseCouponCode = (value: string) => value.trim().toUpperCase();

export function OffersManagementScreen() {
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    createOffer,
    deleteOffer,
    error,
    isLoading,
    offers,
    toggleOfferStatus,
  } = useOffers({ includeInactive: true });

  const sortedOffers = useMemo(
    () => [...offers].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    [offers],
  );

  const buildOfferPayload = (): OfferInput | null => {
    const normalizedCode = toUppercaseCouponCode(couponCode);
    const numericDiscount = Number(discountValue);

    if (!normalizedCode) {
      setFormError('Coupon code is required.');
      return null;
    }

    if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      setFormError('Use uppercase letters, numbers, "_" or "-".');
      return null;
    }

    if (!Number.isFinite(numericDiscount) || numericDiscount <= 0) {
      setFormError('Discount must be greater than 0.');
      return null;
    }

    if (discountType === 'percentage' && numericDiscount > 100) {
      setFormError('Percentage discount must be between 1 and 100.');
      return null;
    }

    return {
      title: discountType === 'percentage'
        ? `${numericDiscount}% OFF`
        : `Flat ${numericDiscount} OFF`,
      description: discountType === 'percentage'
        ? `${numericDiscount}% off with code ${normalizedCode}`
        : `Flat discount with code ${normalizedCode}`,
      couponCode: normalizedCode,
      discountType,
      discountValue: numericDiscount,
      minOrderAmount: 0,
      isActive: true,
    };
  };

  const handleCreateOffer = async () => {
    const payload = buildOfferPayload();
    if (!payload) {
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      await createOffer(payload);
      setCouponCode('');
      setDiscountValue('');
      setDiscountType('percentage');
    } catch (createError) {
      console.error('Failed to create offer', createError);
      setFormError(
        createError instanceof Error
          ? createError.message
          : 'Unable to create this offer right now.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = (offer: Offer) => {
    Alert.alert(
      'Delete Offer',
      `Do you want to permanently remove ${offer.couponCode}?`,
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

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Promo Lab</Text>
        <Text style={styles.title}>Offers Management</Text>
        <Text style={styles.subtitle}>
          Create coupon codes, toggle them live, and remove expired offers in real time.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create Coupon</Text>

        <TextInput
          autoCapitalize="characters"
          placeholder="Coupon code"
          placeholderTextColor="#6F655E"
          style={styles.input}
          value={couponCode}
          onChangeText={value => {
            setCouponCode(toUppercaseCouponCode(value));
            if (formError) {
              setFormError('');
            }
          }}
        />

        <TextInput
          keyboardType="decimal-pad"
          placeholder={discountType === 'percentage' ? 'Discount %' : 'Flat discount'}
          placeholderTextColor="#6F655E"
          style={styles.input}
          value={discountValue}
          onChangeText={value => {
            setDiscountValue(value);
            if (formError) {
              setFormError('');
            }
          }}
        />

        <View style={styles.typeRow}>
          {(['percentage', 'flat'] as DiscountType[]).map(type => {
            const isActive = discountType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
                onPress={() => {
                  setDiscountType(type);
                  if (formError) {
                    setFormError('');
                  }
                }}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                  {type === 'percentage' ? 'Percentage' : 'Flat'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(formError || error) ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{formError || error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          disabled={isSaving}
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
          onPress={() => {
            void handleCreateOffer();
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="#111111" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Coupon</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOffer = ({ item }: { item: Offer }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerCopy}>
          <Text style={styles.offerCode}>{item.couponCode}</Text>
          <Text style={styles.offerDiscount}>
            {item.discountType === 'percentage'
              ? `${item.discountValue}% OFF`
              : `Flat ${item.discountValue} OFF`}
          </Text>
          <Text style={styles.offerDescription}>{item.description}</Text>
        </View>

        <View style={[
          styles.statusBadge,
          item.isActive ? styles.statusBadgeOn : styles.statusBadgeOff,
        ]}>
          <Text style={[
            styles.statusBadgeText,
            item.isActive ? styles.statusBadgeTextOn : styles.statusBadgeTextOff,
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            void toggleOfferStatus(item.id, !item.isActive);
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            handleDeleteOffer(item);
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#C48A5A" size="large" />
          <Text style={styles.loadingText}>Loading offers from Firestore...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOffers}
          keyExtractor={item => item.id}
          renderItem={renderOffer}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No coupons have been created yet.
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#A59A92',
    fontSize: 14,
    marginTop: 14,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: '#8B5E3C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeChip: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  typeChipActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  typeChipText: {
    color: '#D0C3B9',
    fontSize: 13,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  errorCard: {
    backgroundColor: 'rgba(180, 72, 72, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  errorText: {
    color: '#F0A4A4',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C48A5A',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  offerCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  offerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  offerCopy: {
    flex: 1,
  },
  offerCode: {
    color: '#C48A5A',
    fontSize: 17,
    fontWeight: '800',
  },
  offerDiscount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  offerDescription: {
    color: '#A59A92',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeOn: {
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  statusBadgeOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadgeTextOn: {
    color: '#7ED595',
  },
  statusBadgeTextOff: {
    color: '#9A8F88',
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(196, 138, 90, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#E8D6C7',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#F2B6B6',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
