import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect } from 'react';
import {
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
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';
import { formatCurrency } from '../utils/formatCurrency';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CheckoutDetailsScreen() {
  const navigation = useNavigation<CheckoutNavigation>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isCustomer, role } = useUserRole();
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
    isShopTimingLoading,
    payableCartTotal,
    placedOrder,
    savedAddressOptions,
    selectedAddressId,
    selectedAddressLabel,
    setCheckoutError,
    setCheckoutStep,
    setCustomerDetails,
    setIsCheckoutAddressListOpen,
    setPlacedOrder,
    setSelectedAddressId,
    shopCountdownMessage,
    shopStatusMessage,
    shopTimingRangeLabel,
  } = useCartState();
  const { isProfileComplete } = useProfileData();

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

  const selectAddress = (nextId: string | 'new') => {
    setCheckoutError('');
    hasCheckoutAddressSelectionRef.current = true;
    setSelectedAddressId(nextId);
  };

  if (!hasCartItems && checkoutStep !== 'success') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ScalePressable
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </ScalePressable>
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

  if (!isCustomer && checkoutStep !== 'success') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ScalePressable
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </ScalePressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Checkout</Text>
            <Text style={styles.title}>Checkout is unavailable</Text>
          </View>
        </View>

        <View style={styles.content}>
          <CardContainer variant="tinted">
            <Text style={styles.panelTitle}>Customer-only flow</Text>
            <Text style={styles.bodyText}>
              {role === 'admin'
                ? 'Admin accounts are routed into the admin workspace, so customer checkout is intentionally blocked on mobile.'
                : 'Delivery accounts are routed into the delivery workspace, so customer checkout is intentionally blocked on mobile.'}
            </Text>
            <PrimaryButton
              title="Back to Profile"
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{
                    name: ROOT_ROUTES.MAIN_TABS,
                    params: {
                      screen: TAB_ROUTES.PROFILE,
                    },
                  }],
                });
              }}
              style={styles.standaloneButton}
              variant="secondary"
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
        <ScreenTransition>
          <View style={styles.header}>
            <ScalePressable
              accessibilityRole="button"
              onPress={handleBack}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
            </ScalePressable>
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
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
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
              {!isShopTimingLoading && !isShopOpen ? (
                <CardContainer variant="tinted" style={styles.warningCard}>
                  <Text style={styles.noticeTitle}>Ordering update</Text>
                  <Text style={styles.noticeText}>{shopStatusMessage}</Text>
                  <Text style={styles.noticeMeta}>
                    Hours: {shopTimingRangeLabel}
                    {shopCountdownMessage ? ` | ${shopCountdownMessage}` : ''}
                  </Text>
                </CardContainer>
              ) : null}

              {authError ? (
                <CardContainer style={styles.errorCard}>
                  <Text style={styles.noticeTitle}>Account issue</Text>
                  <Text style={styles.noticeText}>{authError}</Text>
                </CardContainer>
              ) : null}

              {!isProfileComplete ? (
                <CardContainer variant="tinted" style={styles.warningCard}>
                  <Text style={styles.noticeTitle}>Complete your profile</Text>
                  <Text style={styles.noticeText}>
                    Name, phone, and a primary address should come from your saved profile so checkout stays fast next time.
                  </Text>
                  <PrimaryButton
                    title="Go to Profile"
                    onPress={() => {
                      navigation.reset({
                        index: 0,
                        routes: [{
                          name: ROOT_ROUTES.MAIN_TABS,
                          params: {
                            screen: TAB_ROUTES.PROFILE,
                            params: {
                              openEdit: true,
                            },
                          },
                        }],
                      });
                    }}
                    style={styles.profileAction}
                    variant="secondary"
                  />
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
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone number</Text>
                  <TextInput
                    style={styles.input}
                    value={customerDetails.phone}
                    onChangeText={value => updateCustomerField('phone', value)}
                    placeholder="Phone number"
                    placeholderTextColor={theme.colors.textMuted}
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
                        <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                      </View>

                      <PrimaryButton
                        title={isCheckoutAddressListOpen ? 'Hide addresses' : 'Choose address'}
                        onPress={() => setIsCheckoutAddressListOpen(previous => !previous)}
                        variant="secondary"
                      />

                      {isCheckoutAddressListOpen ? (
                        <View style={styles.addressList}>
                          {savedAddressOptions.map(option => {
                            const isSelected = selectedAddressId === option.id;
                            return (
                              <ScalePressable
                                key={`saved-address-${option.id}`}
                                accessibilityRole="button"
                                onPress={() => {
                                  selectAddress(option.id);
                                  setIsCheckoutAddressListOpen(false);
                                }}
                                style={[
                                  styles.addressCard,
                                  isSelected ? styles.addressCardSelected : null,
                                ]}
                              >
                                <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
                                  {isSelected ? <View style={styles.radioInner} /> : null}
                                </View>
                                <View style={styles.summaryCopy}>
                                  <Text style={styles.summaryName}>
                                    {option.label}
                                    {option.isPrimary ? ' | Primary' : ''}
                                  </Text>
                                  <Text style={styles.noteText} numberOfLines={2}>
                                    {option.value}
                                  </Text>
                                </View>
                              </ScalePressable>
                            );
                          })}

                          <ScalePressable
                            accessibilityRole="button"
                            onPress={() => selectAddress('new')}
                            style={[
                              styles.addressCard,
                              selectedAddressId === 'new' ? styles.addressCardSelected : null,
                            ]}
                          >
                            <View
                              style={[
                                styles.radio,
                                selectedAddressId === 'new' ? styles.radioSelected : null,
                              ]}
                            >
                              {selectedAddressId === 'new' ? <View style={styles.radioInner} /> : null}
                            </View>
                            <View style={styles.summaryCopy}>
                              <Text style={styles.summaryName}>Enter new address</Text>
                              <Text style={styles.noteText}>Type a fresh delivery address.</Text>
                            </View>
                          </ScalePressable>
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  {(savedAddressOptions.length === 0 || selectedAddressId === 'new') ? (
                    <TextInput
                      multiline
                      value={customerDetails.address}
                      onChangeText={value => {
                        selectAddress('new');
                        updateCustomerField('address', value);
                      }}
                      placeholder="Street, landmark, city"
                      placeholderTextColor={theme.colors.textMuted}
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
                  icon={<Ionicons name="navigate-outline" size={18} color={theme.colors.onPrimary} />}
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
                    <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
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
                    Account details are still loading. You can keep reviewing checkout details while that finishes.
                  </Text>
                </CardContainer>
              ) : null}
            </>
          )}
        </ScreenTransition>
      </ScrollView>

      {checkoutStep !== 'success' ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.md }]}>
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
            disabled={isPlacingOrder || isShopTimingLoading || !hasCartItems || !isShopOpen}
            loading={isPlacingOrder}
            style={styles.placeAction}
          />
        </View>
      ) : null}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  warningCard: {
    marginBottom: theme.spacing.lg,
  },
  profileAction: {
    marginTop: theme.spacing.md,
  },
  errorCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  bodyText: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  noteText: {
    fontSize: theme.typography.body,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
  centerText: {
    textAlign: 'center',
  },
  summaryList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryName: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  summaryAmount: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  discountText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.success,
  },
  fieldGroup: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.input,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    textAlignVertical: 'top',
  },
  addressSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  selectedAddressLabel: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  addressList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  addressCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceMuted,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onPrimary,
  },
  locationAction: {
    marginTop: theme.spacing.lg,
  },
  locationStatus: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  noticeMeta: {
    marginTop: 6,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.danger,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backAction: {
    flex: 0.38,
  },
  placeAction: {
    flex: 0.62,
  },
  standaloneButton: {
    marginTop: theme.spacing.lg,
  },
  successPanel: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEyebrow: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.success,
  },
  successTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  successMeta: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
