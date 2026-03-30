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
import { useCartState } from '../app/providers/CartProvider';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/formatCurrency';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CheckoutDetailsScreen() {
  const navigation = useNavigation<CheckoutNavigation>();
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

  const updateCustomerField = (field: 'name' | 'phone' | 'address', value: string) => {
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
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Checkout details</Text>
            <Text style={styles.title}>Your cart is empty</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Add items before checkout</Text>
          <Text style={styles.bodyText}>
            Head back to the menu, add a few favorites, and return here to place your order.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: ROOT_ROUTES.MAIN_TABS, params: { screen: TAB_ROUTES.MENU } }],
              });
            }}
          >
            <Text style={styles.primaryButtonText}>Browse Menu</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Checkout details</Text>
            <Text style={styles.title}>
              {checkoutStep === 'success' ? 'Order ready' : 'Confirm your order'}
            </Text>
          </View>
        </View>

        {checkoutStep === 'success' ? (
          <View style={[styles.panel, styles.successPanel]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.successEyebrow}>Freshly confirmed</Text>
            <Text style={styles.successTitle}>Order confirmed</Text>
            <Text style={[styles.bodyText, styles.centerText]}>
              Your order #{placedOrder?.id || draftOrderId || '...'} is waiting for admin confirmation.
            </Text>
            <Text style={styles.successMeta}>Cash on delivery selected.</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
              onPress={goToOrders}
            >
              <Text style={styles.primaryButtonText}>Track Order</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {!isShopOpen ? (
              <View style={[styles.noticeCard, styles.warningCard]}>
                <Text style={styles.noticeTitle}>Ordering update</Text>
                <Text style={styles.noticeText}>{shopStatusMessage}</Text>
              </View>
            ) : null}

            {authError ? (
              <View style={[styles.noticeCard, styles.errorCard]}>
                <Text style={styles.noticeText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.panel}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.eyebrowMuted}>Order summary</Text>
                  <Text style={styles.noteText}>
                    {cartCount} item{cartCount === 1 ? '' : 's'} in this order
                  </Text>
                </View>
                <Text style={styles.priceStrong}>{formatCurrency(payableCartTotal)}</Text>
              </View>

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
                <Text style={styles.noteText}>Subtotal</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(cartTotal)}</Text>
              </View>
              {discountAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountText}>Discount</Text>
                  <Text style={styles.discountText}>-{formatCurrency(discountAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.noteText}>Delivery Charge</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(deliveryFee)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalText}>Total Amount</Text>
                <Text style={styles.totalPrice}>{formatCurrency(payableCartTotal)}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.eyebrowMuted}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={customerDetails.name}
                onChangeText={value => updateCustomerField('name', value)}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.eyebrowMuted}>Phone Number</Text>
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
              <Text style={styles.eyebrowMuted}>Delivery Address</Text>
              {savedAddressOptions.length > 0 ? (
                <>
                  <View style={styles.addressSummary}>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.eyebrowMuted}>{selectedAddressLabel}</Text>
                      <Text style={styles.bodyText} numberOfLines={2}>
                        {checkoutAddressSummary || 'Add a delivery address.'}
                      </Text>
                    </View>
                    <Ionicons name="location-outline" size={16} color={COLORS.secondary} />
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
                    onPress={() => setIsCheckoutAddressListOpen(previous => !previous)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {isCheckoutAddressListOpen ? 'Hide Addresses' : 'All Addresses'}
                    </Text>
                  </Pressable>

                  {isCheckoutAddressListOpen ? (
                    <View style={styles.addressList}>
                      {savedAddressOptions.map(option => {
                        const isSelected = selectedAddressIndex === option.index;
                        return (
                          <Pressable
                            key={`saved-address-${option.index}`}
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
                              <Text style={styles.noteText} numberOfLines={2}>{option.value}</Text>
                            </View>
                          </Pressable>
                        );
                      })}

                      <Pressable
                        style={({ pressed }) => [
                          styles.addressCard,
                          selectedAddressIndex === 'new' ? styles.addressCardSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                        onPress={() => selectAddress('new')}
                      >
                        <View style={[styles.radio, selectedAddressIndex === 'new' ? styles.radioSelected : null]}>
                          {selectedAddressIndex === 'new' ? <View style={styles.radioInner} /> : null}
                        </View>
                        <View style={styles.summaryCopy}>
                          <Text style={styles.summaryName}>Enter New Address</Text>
                          <Text style={styles.noteText}>Type a new delivery address.</Text>
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

            <View style={styles.panel}>
              <View style={styles.summaryHeader}>
                <Text style={styles.eyebrowMuted}>Live Delivery Location</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.locationButton,
                    pressed ? styles.pressed : null,
                    isLocatingCustomer ? styles.disabled : null,
                  ]}
                  onPress={() => {
                    void handleCaptureCustomerLocation();
                  }}
                  disabled={isLocatingCustomer}
                >
                  <Text style={styles.locationButtonText}>
                    {isLocatingCustomer ? 'Locating...' : 'Location'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.locationStatus}>
                {customerDetails.location ? (
                  <>
                    <Text style={styles.summaryName}>Location captured successfully.</Text>
                    <Text style={styles.noteText}>
                      Lat {customerDetails.location.lat.toFixed(4)} • Lng {customerDetails.location.lng.toFixed(4)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noteText}>Location not added yet.</Text>
                )}
              </View>

              {customerLocationError ? <Text style={styles.errorText}>{customerLocationError}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.eyebrowMuted}>Payment Method</Text>
              <View style={styles.paymentCard}>
                <View style={styles.iconChip}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.secondary} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryName}>Cash on Delivery</Text>
                  <Text style={styles.noteText}>Pay when your order arrives at your doorstep.</Text>
                </View>
              </View>
            </View>

            {checkoutError ? (
              <View style={[styles.noticeCard, styles.errorCard]}>
                <Text style={styles.noticeText}>{checkoutError}</Text>
              </View>
            ) : null}

            {!isAuthReady ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>
                  Secure session is still getting ready. You can review your details while we finish it.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {checkoutStep !== 'success' ? (
        <View style={styles.bottomBar}>
          <Pressable style={({ pressed }) => [styles.backAction, pressed ? styles.pressed : null]} onPress={handleBack}>
            <Text style={styles.backActionText}>Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.placeAction,
              pressed ? styles.pressed : null,
              (isPlacingOrder || !hasCartItems || !isShopOpen) ? styles.disabled : null,
            ]}
            onPress={() => {
              void handlePlaceOrder();
            }}
            disabled={isPlacingOrder || !hasCartItems || !isShopOpen}
          >
            <Text style={styles.placeActionText}>{checkoutPrimaryActionLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  headerCopy: { flex: 1 },
  iconButton: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.secondary },
  eyebrowMuted: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: SPACING.sm },
  title: { marginTop: 4, fontSize: 28, fontWeight: '800', color: COLORS.text },
  panel: { borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.lg, marginBottom: SPACING.lg },
  panelTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  bodyText: { fontSize: 14, lineHeight: 22, color: COLORS.textMuted },
  noteText: { fontSize: 13, lineHeight: 19, color: COLORS.textMuted },
  centerText: { textAlign: 'center' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  summaryList: { gap: SPACING.sm, marginTop: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, alignItems: 'center' },
  summaryCopy: { flex: 1 },
  summaryName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  priceStrong: { fontSize: 22, fontWeight: '800', color: COLORS.accentStrong },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  totalRow: { marginTop: SPACING.xs },
  totalText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalPrice: { fontSize: 16, fontWeight: '800', color: COLORS.accentStrong },
  discountText: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  fieldGroup: { marginBottom: SPACING.lg },
  input: {
    minHeight: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md, color: COLORS.text, fontSize: 15, fontWeight: '600',
  },
  textArea: { minHeight: 100, paddingTop: SPACING.md, paddingBottom: SPACING.md, textAlignVertical: 'top' },
  addressSummary: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  secondaryButton: {
    minHeight: 48, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  addressList: { gap: SPACING.sm, marginBottom: SPACING.sm },
  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.md,
  },
  addressCardSelected: { borderColor: COLORS.secondary, backgroundColor: '#FFF5E9' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary },
  radioInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.surface },
  locationButton: { minHeight: 42, borderRadius: RADIUS.pill, backgroundColor: COLORS.accentStrong, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  locationButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.surface },
  locationStatus: { marginTop: SPACING.md, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: SPACING.md },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: 24, borderWidth: 1, borderColor: '#D8C1A8', backgroundColor: '#F3E2D3', padding: SPACING.md },
  iconChip: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8D2BC', alignItems: 'center', justifyContent: 'center' },
  noticeCard: { borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: SPACING.lg },
  warningCard: { borderColor: '#E7C486', backgroundColor: '#FFF4DD' },
  errorCard: { borderColor: '#F4C7C1', backgroundColor: '#FFF1EF' },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  noticeText: { fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  errorText: { marginTop: SPACING.sm, fontSize: 13, lineHeight: 20, color: '#A23D2A' },
  bottomBar: { flexDirection: 'row', gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.lg },
  backAction: { width: '34%', minHeight: 52, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  backActionText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  placeAction: { flex: 1, minHeight: 52, borderRadius: RADIUS.pill, backgroundColor: COLORS.accentStrong, alignItems: 'center', justifyContent: 'center' },
  placeActionText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  primaryButton: { minHeight: 52, borderRadius: RADIUS.pill, backgroundColor: COLORS.accentStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  successPanel: { alignItems: 'center', paddingVertical: SPACING.xxl },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5F6E8', alignItems: 'center', justifyContent: 'center' },
  successEyebrow: { marginTop: SPACING.lg, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.success },
  successTitle: { marginTop: SPACING.sm, fontSize: 28, fontWeight: '800', color: COLORS.text },
  successMeta: { marginTop: SPACING.sm, fontSize: 14, fontWeight: '700', color: COLORS.secondary },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.84 },
});
