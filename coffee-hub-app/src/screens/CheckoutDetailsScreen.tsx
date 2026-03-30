import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/formatCurrency';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CheckoutDetailsScreen() {
  const navigation = useNavigation<CheckoutNavigation>();
  const insets = useSafeAreaInsets();
  const {
    authError,
    cart,
    cartCount,
    cartTotal,
    checkoutAddressSummary,
    checkoutError,
    checkoutPrimaryActionLabel,
    checkoutStep,
    customerDetails,
    customerLocationError,
    deliveryFee,
    discountAmount,
    draftOrderId,
    handleCaptureCustomerLocation,
    handlePlaceOrder,
    hasCartItems,
    hasCheckoutAddressSelectionRef,
    isAuthReady,
    isCheckoutAddressListOpen,
    isLocatingCustomer,
    isPlacingOrder,
    isShopOpen,
    payableCartTotal,
    placedOrder,
    savedAddressOptions,
    selectedAddressIndex,
    selectedAddressLabel,
    setCheckoutError,
    setCheckoutStep,
    setCustomerDetails,
    setIsCheckoutAddressListOpen,
    setPlacedOrder,
    setSelectedAddressIndex,
    shopStatusMessage,
  } = useCartState();

  const goToOrders = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROOT_ROUTES.MAIN_TABS, params: { screen: TAB_ROUTES.ORDERS } }],
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (checkoutStep !== 'success') {
        setCheckoutStep('details');
      }
    }, [checkoutStep, setCheckoutStep]),
  );

  useEffect(() => {
    if (checkoutStep !== 'success' || !placedOrder) {
      return;
    }

    const timeoutId = setTimeout(() => {
      goToOrders();
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [checkoutStep, goToOrders, placedOrder]);

  const handleBack = () => {
    setCheckoutError('');
    if (checkoutStep === 'success') {
      setCheckoutStep('cart');
      setPlacedOrder(null);
      goToOrders();
      return;
    }

    setCheckoutStep('cart');
    navigation.goBack();
  };

  const updateCustomerField = (
    field: 'name' | 'phone' | 'address',
    value: string,
  ) => {
    setCheckoutError('');
    setCustomerDetails(previousDetails => ({ ...previousDetails, [field]: value }));
  };

  const selectAddress = (nextIndex: number | 'new') => {
    setCheckoutError('');
    hasCheckoutAddressSelectionRef.current = true;
    setSelectedAddressIndex(nextIndex);
  };

  if (!hasCartItems && checkoutStep !== 'success') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Checkout</Text>
            <Text style={styles.title}>Your cart is empty</Text>
          </View>
        </View>

        <View style={styles.content}>
          <CardContainer>
            <Text style={styles.panelTitle}>Add items before checkout</Text>
            <Text style={styles.bodyText}>
              Head back to the menu, choose a few favorites, and return here to place your order.
            </Text>
            <PrimaryButton
              title="Browse Menu"
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: ROOT_ROUTES.MAIN_TABS, params: { screen: TAB_ROUTES.MENU } }],
                });
              }}
              style={styles.standaloneButton}
            />
          </CardContainer>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          checkoutStep !== 'success' ? { paddingBottom: 148 + insets.bottom } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Checkout</Text>
            <Text style={styles.title}>
              {checkoutStep === 'success' ? 'Order confirmed' : 'Confirm your order'}
            </Text>
          </View>
        </View>

        {checkoutStep === 'success' ? (
          <CardContainer style={styles.successPanel}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.successEyebrow}>Freshly confirmed</Text>
            <Text style={styles.successTitle}>Order placed</Text>
            <Text style={[styles.bodyText, styles.centerText]}>
              Your order #{placedOrder?.id || draftOrderId || '...'} is waiting for confirmation.
            </Text>
            <Text style={styles.successMeta}>Cash on delivery selected.</Text>
            <PrimaryButton
              title="Track Order"
              onPress={goToOrders}
              style={styles.standaloneButton}
            />
          </CardContainer>
        ) : (
          <>
            {!isShopOpen ? (
              <CardContainer variant="tinted" style={styles.warningCard}>
                <Text style={styles.noticeTitle}>Ordering update</Text>
                <Text style={styles.noticeText}>{shopStatusMessage}</Text>
              </CardContainer>
            ) : null}

            {authError ? (
              <CardContainer style={styles.errorCard}>
                <Text style={styles.noticeTitle}>Session issue</Text>
                <Text style={styles.noticeText}>{authError}</Text>
              </CardContainer>
            ) : null}

            <CardContainer style={styles.sectionCard}>
              <SectionHeader
                eyebrow="Price breakdown"
                title="Order summary"
                subtitle={`${cartCount} item${cartCount === 1 ? '' : 's'} in this order`}
              />

              <View style={styles.summaryList}>
                {cart.map(item => (
                  <View key={`summary-${item.id}`} style={styles.summaryRow}>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.summaryName}>{item.name}</Text>
                      <Text style={styles.noteText}>Qty {item.quantity}</Text>
                    </View>
                    <Text style={styles.summaryAmount}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.noteText}>Items total</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(cartTotal)}</Text>
              </View>
              {discountAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountText}>Discount</Text>
                  <Text style={styles.discountText}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.noteText}>Delivery fee</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(deliveryFee)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalText}>Total</Text>
                <Text style={styles.totalPrice}>{formatCurrency(payableCartTotal)}</Text>
              </View>
            </CardContainer>

            <CardContainer style={styles.sectionCard}>
              <SectionHeader
                eyebrow="Delivery"
                title="Customer details"
                subtitle="Add the basics so delivery reaches the right doorstep."
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full name</Text>
                <TextInput
                  style={styles.input}
                  value={customerDetails.name}
                  onChangeText={value => updateCustomerField('name', value)}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  value={customerDetails.phone}
                  onChangeText={value => updateCustomerField('phone', value)}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address</Text>

                {savedAddressOptions.length > 0 ? (
                  <>
                    <View style={styles.addressSummary}>
                      <View style={styles.summaryCopy}>
                        <Text style={styles.selectedAddressLabel}>{selectedAddressLabel}</Text>
                        <Text style={styles.bodyText} numberOfLines={2}>
                          {checkoutAddressSummary || 'Add a delivery address.'}
                        </Text>
                      </View>
                      <Ionicons name="location-outline" size={16} color={COLORS.accentStrong} />
                    </View>

                    <PrimaryButton
                      title={isCheckoutAddressListOpen ? 'Hide addresses' : 'Choose address'}
                      onPress={() => setIsCheckoutAddressListOpen(previous => !previous)}
                      variant="secondary"
                    />

                    {isCheckoutAddressListOpen ? (
                      <View style={styles.addressList}>
                        {savedAddressOptions.map(option => {
                          const isSelected = selectedAddressIndex === option.index;
                          return (
                            <Pressable
                              key={`saved-address-${option.index}`}
                              accessibilityRole="button"
                              style={({ pressed }) => [
                                styles.addressCard,
                                isSelected ? styles.addressCardSelected : null,
                                pressed ? styles.pressed : null,
                              ]}
                              onPress={() => {
                                selectAddress(option.index);
                                setIsCheckoutAddressListOpen(false);
                              }}
                            >
                              <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
                                {isSelected ? <View style={styles.radioInner} /> : null}
                              </View>
                              <View style={styles.summaryCopy}>
                                <Text style={styles.summaryName}>{option.label}</Text>
                                <Text style={styles.noteText} numberOfLines={2}>
                                  {option.value}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}

                        <Pressable
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.addressCard,
                            selectedAddressIndex === 'new'
                              ? styles.addressCardSelected
                              : null,
                            pressed ? styles.pressed : null,
                          ]}
                          onPress={() => selectAddress('new')}
                        >
                          <View
                            style={[
                              styles.radio,
                              selectedAddressIndex === 'new'
                                ? styles.radioSelected
                                : null,
                            ]}
                          >
                            {selectedAddressIndex === 'new' ? <View style={styles.radioInner} /> : null}
                          </View>
                          <View style={styles.summaryCopy}>
                            <Text style={styles.summaryName}>Enter new address</Text>
                            <Text style={styles.noteText}>Type a fresh delivery address.</Text>
                          </View>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {(savedAddressOptions.length === 0 || selectedAddressIndex === 'new') ? (
                  <TextInput
                    multiline
                    value={customerDetails.address}
                    onChangeText={value => {
                      selectAddress('new');
                      updateCustomerField('address', value);
                    }}
                    placeholder="Street, landmark, city"
                    placeholderTextColor={COLORS.textMuted}
                    style={[styles.input, styles.textArea]}
                  />
                ) : null}
              </View>
            </CardContainer>

            <CardContainer style={styles.sectionCard}>
              <SectionHeader
                eyebrow="Live delivery"
                title="Location pin"
                subtitle="Capture your current location for easier last-mile delivery."
              />

              <PrimaryButton
                title={isLocatingCustomer ? 'Locating...' : 'Use current location'}
                onPress={() => {
                  void handleCaptureCustomerLocation();
                }}
                icon={<Ionicons name="navigate-outline" size={18} color={COLORS.inkInverse} />}
                disabled={isLocatingCustomer}
                style={styles.locationAction}
              />

              <View style={styles.locationStatus}>
                {customerDetails.location ? (
                  <>
                    <Text style={styles.summaryName}>Location captured successfully.</Text>
                    <Text style={styles.noteText}>
                      Lat {customerDetails.location.lat.toFixed(4)} | Lng {customerDetails.location.lng.toFixed(4)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noteText}>Location not added yet.</Text>
                )}
              </View>

              {customerLocationError ? (
                <Text style={styles.errorText}>{customerLocationError}</Text>
              ) : null}
            </CardContainer>

            <CardContainer variant="tinted" style={styles.sectionCard}>
              <SectionHeader
                eyebrow="Payment"
                title="Cash on delivery"
                subtitle="Pay once your order reaches you."
              />

              <View style={styles.paymentCard}>
                <View style={styles.iconChip}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.accentStrong} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryName}>Cash on Delivery</Text>
                  <Text style={styles.noteText}>
                    Simple and familiar for local coffee-house orders.
                  </Text>
                </View>
              </View>
            </CardContainer>

            {checkoutError ? (
              <CardContainer style={styles.errorCard}>
                <Text style={styles.noticeText}>{checkoutError}</Text>
              </CardContainer>
            ) : null}

            {!isAuthReady ? (
              <CardContainer variant="tinted">
                <Text style={styles.noticeText}>
                  Secure session is still getting ready. You can keep reviewing details while it finishes.
                </Text>
              </CardContainer>
            ) : null}
          </>
        )}
      </ScrollView>

      {checkoutStep !== 'success' ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
          <PrimaryButton
            title="Back"
            onPress={handleBack}
            variant="secondary"
            style={styles.backAction}
          />
          <PrimaryButton
            title={checkoutPrimaryActionLabel}
            onPress={() => {
              void handlePlaceOrder();
            }}
            disabled={isPlacingOrder || !hasCartItems || !isShopOpen}
            loading={isPlacingOrder}
            style={styles.placeAction}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.accentStrong,
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  warningCard: {
    marginBottom: SPACING.lg,
  },
  errorCard: {
    marginBottom: SPACING.lg,
    backgroundColor: '#FFF4F1',
    borderColor: '#F1C5B9',
  },
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
  },
  centerText: {
    textAlign: 'center',
  },
  summaryList: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    alignItems: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  totalRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  fieldGroup: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    textAlignVertical: 'top',
  },
  addressSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardMuted,
    padding: SPACING.md,
  },
  selectedAddressLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.accentStrong,
    marginBottom: 6,
  },
  addressList: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  addressCardSelected: {
    borderColor: COLORS.accentStrong,
    backgroundColor: COLORS.cardMuted,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.accentStrong,
    backgroundColor: COLORS.accentStrong,
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
  },
  locationAction: {
    marginTop: SPACING.lg,
  },
  locationStatus: {
    marginTop: SPACING.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardMuted,
    padding: SPACING.md,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.danger,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  backAction: {
    flex: 0.38,
  },
  placeAction: {
    flex: 0.62,
  },
  standaloneButton: {
    marginTop: SPACING.lg,
  },
  successPanel: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5F6E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEyebrow: {
    marginTop: SPACING.lg,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.success,
  },
  successTitle: {
    marginTop: SPACING.sm,
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  successMeta: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentStrong,
  },
  pressed: {
    opacity: 0.84,
  },
});
