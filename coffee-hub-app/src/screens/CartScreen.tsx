import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
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
import { SectionHeader } from '../components/ui/SectionHeader';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type CartNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<CartNavigation>();
  const insets = useSafeAreaInsets();
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
    payableCartTotal,
    refreshAuthSession,
    setCheckoutError,
    setCheckoutStep,
    setCouponInput,
    shopStatusMessage,
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
          <>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Cart drawer</Text>
                <Text style={styles.title}>Your cart</Text>
                <Text style={styles.subtitle}>
                  {hasCartItems
                    ? `${cartCount} item${cartCount === 1 ? '' : 's'} ready for checkout.`
                    : 'Add a few cafe favorites and come back here to review everything.'}
                </Text>
              </View>
            </View>

            <CardContainer
              variant={isShopOpen ? 'light' : 'tinted'}
              style={!isShopOpen ? styles.warningCard : undefined}
            >
              <View style={styles.noticeRow}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={isShopOpen ? COLORS.success : COLORS.accentStrong}
                />
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>
                    {isShopOpen ? 'Cafe is open now' : 'Ordering is paused'}
                  </Text>
                  <Text style={styles.noticeText}>{shopStatusMessage}</Text>
                  <Text style={styles.noticeMeta}>Hours: {shopTimingRangeLabel}</Text>
                </View>
              </View>
            </CardContainer>

            {authError ? (
              <CardContainer style={styles.errorCard}>
                <Text style={styles.noticeTitle}>Session issue</Text>
                <Text style={styles.noticeText}>{authError}</Text>
                <PrimaryButton
                  title="Retry session"
                  onPress={() => {
                    void refreshAuthSession();
                  }}
                  variant="secondary"
                  style={styles.retryButton}
                />
              </CardContainer>
            ) : null}
          </>
        )}
        ListEmptyComponent={(
          <CardContainer style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={28} color={COLORS.accentStrong} />
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
                  placeholderTextColor={COLORS.textMuted}
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

            {!isAuthReady ? (
              <CardContainer variant="tinted">
                <Text style={styles.noticeText}>
                  Secure session is still getting ready. You can keep reviewing your cart while it finishes.
                </Text>
              </CardContainer>
            ) : null}
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      />

      {hasCartItems ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
          <View style={styles.bottomBarCopy}>
            <Text style={styles.bottomBarLabel}>Total</Text>
            <Text style={styles.bottomBarValue}>{formatCurrency(payableCartTotal)}</Text>
          </View>

          <PrimaryButton
            title="Checkout"
            onPress={goToCheckout}
            disabled={!hasCartItems}
            style={styles.checkoutButton}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  warningCard: {
    marginBottom: SPACING.lg,
  },
  errorCard: {
    marginTop: SPACING.lg,
    backgroundColor: '#FFF4F1',
    borderColor: '#F1C5B9',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  noticeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  noticeMeta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  retryButton: {
    marginTop: SPACING.md,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: SPACING.lg,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtitle: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
  emptyButton: {
    marginTop: SPACING.lg,
    alignSelf: 'stretch',
  },
  footer: {
    marginTop: SPACING.sm,
    gap: SPACING.lg,
  },
  couponRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  couponInput: {
    flex: 1,
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
  applyButton: {
    minWidth: 112,
  },
  summaryBlock: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  totalRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.danger,
  },
  successText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.success,
  },
  spacer: {
    height: SPACING.xl,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  bottomBarCopy: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  bottomBarValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  checkoutButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.84,
  },
});
