import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CartItemRow } from '../components/CartItemRow';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type CartNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<CartNavigation>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isCustomer, role } = useUserRole();
  const {
    appliedCouponCode,
    authError,
    cart,
    cartCount,
    cartTotal,
    checkoutError,
    couponError,
    couponInput,
    couponSuccess,
    deliveryFee,
    discountAmount,
    handleAddToCart,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleRemoveFromCart,
    hasCartItems,
    isApplyingCoupon,
    isAuthReady,
    isShopOpen,
    isShopTimingLoading,
    payableCartTotal,
    refreshAuthState,
    setCheckoutError,
    setCheckoutStep,
    setCouponInput,
    shopStatusMessage,
    shopCountdownMessage,
    shopTimingRangeLabel,
  } = useCartState();

  useFocusEffect(
    useCallback(() => {
      setCheckoutStep('cart');
      setCheckoutError('');
    }, [setCheckoutError, setCheckoutStep]),
  );

  const renderCartItem = ({ item }: ListRenderItemInfo<CartItem>) => (
    <CartItemRow
      item={item}
      onQuantityChange={handleAddToCart}
      onRemove={handleRemoveFromCart}
    />
  );

  const openMenu = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROOT_ROUTES.MAIN_TABS, params: { screen: TAB_ROUTES.MENU } }],
    });
  };

  const goToCheckout = () => {
    if (!isCustomer) {
      setCheckoutError(
        role === 'admin'
          ? 'Admin accounts cannot place customer orders on mobile.'
          : 'Delivery accounts cannot place customer orders on mobile.',
      );
      return;
    }

    setCheckoutError('');
    setCheckoutStep('details');
    navigation.navigate(ROOT_ROUTES.CHECKOUT_DETAILS);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={cart}
        keyExtractor={item => item.id}
        renderItem={renderCartItem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          hasCartItems ? { paddingBottom: 176 + insets.bottom } : null,
        ]}
        ListHeaderComponent={(
          <ScreenTransition>
            <View style={styles.header}>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </ScalePressable>

              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Cart</Text>
                <Text style={styles.title}>Your cart</Text>
                <Text style={styles.subtitle}>
                  {hasCartItems
                    ? `${cartCount} item${cartCount === 1 ? '' : 's'} ready for checkout.`
                    : 'Add a few cafe favorites and come back here to review everything.'}
                </Text>
              </View>
            </View>

            <CardContainer
              variant={isShopTimingLoading || isShopOpen ? 'light' : 'tinted'}
              style={!isShopTimingLoading && !isShopOpen ? styles.warningCard : undefined}
            >
              <View style={styles.noticeRow}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={isShopTimingLoading || isShopOpen ? theme.colors.success : theme.colors.primary}
                />
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>
                    {isShopTimingLoading
                      ? 'Checking shop hours'
                      : isShopOpen
                        ? 'Cafe is open now'
                        : 'Ordering is paused'}
                  </Text>
                  <Text style={styles.noticeText}>{shopStatusMessage}</Text>
                  {!isShopTimingLoading ? (
                    <Text style={styles.noticeMeta}>
                      Hours: {shopTimingRangeLabel}
                      {!isShopOpen && shopCountdownMessage ? ` | ${shopCountdownMessage}` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            </CardContainer>

            {authError ? (
              <CardContainer style={styles.errorCard}>
                <Text style={styles.noticeTitle}>Account issue</Text>
                <Text style={styles.noticeText}>{authError}</Text>
                <PrimaryButton
                  title="Retry account check"
                  onPress={() => {
                    void refreshAuthState();
                  }}
                  variant="secondary"
                  style={styles.retryButton}
                />
              </CardContainer>
            ) : null}
          </ScreenTransition>
        )}
        ListEmptyComponent={(
          <CardContainer style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Browse the menu, add a few warm picks, and they will appear here instantly.
            </Text>
            <PrimaryButton
              title="Browse Menu"
              onPress={openMenu}
              style={styles.emptyButton}
            />
          </CardContainer>
        )}
        ListFooterComponent={hasCartItems ? (
          <View style={styles.footer}>
            <CardContainer>
              <SectionHeader
                eyebrow="Rewards"
                title="Coupon code"
                subtitle="Apply a cafe offer before you place the order."
              />

              <View style={styles.couponRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={value => setCouponInput(value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  style={styles.couponInput}
                />
                <PrimaryButton
                  title={
                    appliedCouponCode
                      ? 'Remove'
                      : isApplyingCoupon
                        ? 'Applying...'
                        : 'Apply'
                  }
                  onPress={() => {
                    if (appliedCouponCode) {
                      handleRemoveCoupon();
                      return;
                    }

                    void handleApplyCoupon();
                  }}
                  variant={appliedCouponCode ? 'secondary' : 'primary'}
                  disabled={isApplyingCoupon || !hasCartItems}
                  style={styles.applyButton}
                />
              </View>
              {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}
              {couponSuccess ? <Text style={styles.successText}>{couponSuccess}</Text> : null}
            </CardContainer>

            <CardContainer>
              <SectionHeader
                eyebrow="Price breakdown"
                title="Order summary"
                subtitle="Everything you pay, clearly listed."
              />

              <View style={styles.summaryBlock}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items total</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(cartTotal)}</Text>
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
                  <Text style={styles.summaryLabel}>Delivery fee</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(payableCartTotal)}</Text>
                </View>
              </View>
            </CardContainer>

            {checkoutError ? (
              <CardContainer style={styles.errorCard}>
                <Text style={styles.noticeText}>{checkoutError}</Text>
              </CardContainer>
            ) : null}

            {!isCustomer ? (
              <CardContainer variant="tinted" style={styles.warningCard}>
                <Text style={styles.noticeTitle}>Checkout disabled for this role</Text>
                <Text style={styles.noticeText}>
                  {role === 'admin'
                    ? 'Admin accounts can review catalog and staff tools, but customer checkout is intentionally blocked.'
                    : 'Delivery accounts use the delivery workspace only, so checkout is intentionally blocked.'}
                </Text>
              </CardContainer>
            ) : null}

            {!isAuthReady ? (
              <CardContainer variant="tinted">
                <Text style={styles.noticeText}>
                  Account details are still loading. You can keep reviewing your cart while that finishes.
                </Text>
              </CardContainer>
            ) : null}
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      />

      {hasCartItems ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.md }]}>
          <View style={styles.bottomBarCopy}>
            <Text style={styles.bottomBarLabel}>Total</Text>
            <Text style={styles.bottomBarValue}>{formatCurrency(payableCartTotal)}</Text>
          </View>

          <PrimaryButton
            title={isCustomer ? 'Checkout' : 'Checkout unavailable'}
            onPress={goToCheckout}
            disabled={!hasCartItems || !isCustomer}
            style={styles.checkoutButton}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: theme.colors.textMuted,
  },
  warningCard: {
    marginBottom: theme.spacing.lg,
  },
  errorCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  noticeText: {
    marginTop: 4,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  noticeMeta: {
    marginTop: 4,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptySubtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 21,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
  emptyButton: {
    marginTop: theme.spacing.lg,
    alignSelf: 'stretch',
  },
  footer: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.lg,
  },
  couponRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  couponInput: {
    flex: 1,
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
  applyButton: {
    minWidth: 112,
  },
  summaryBlock: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  discountText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.success,
  },
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.danger,
  },
  successText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.success,
  },
  spacer: {
    height: theme.spacing.xl,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  bottomBarCopy: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  bottomBarValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  checkoutButton: {
    flex: 1,
  },
});
