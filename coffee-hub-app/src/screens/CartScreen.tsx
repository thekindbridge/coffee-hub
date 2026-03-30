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
import { useCartState } from '../app/providers/CartProvider';
import { CartItemRow } from '../components/CartItemRow';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type CartNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<CartNavigation>();
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

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={item => item.id}
        renderItem={renderCartItem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
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
                    : 'Add items from menu to start your order.'}
                </Text>
              </View>
            </View>

            <View style={[styles.noticeCard, !isShopOpen ? styles.warningCard : null]}>
              <View style={styles.noticeRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={isShopOpen ? COLORS.success : COLORS.secondary}
                />
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>
                    {isShopOpen ? 'Shop open now' : 'Orders paused for now'}
                  </Text>
                  <Text style={styles.noticeText}>{shopStatusMessage}</Text>
                  <Text style={styles.noticeMeta}>Ordering hours: {shopTimingRangeLabel}</Text>
                </View>
              </View>
            </View>

            {authError ? (
              <View style={[styles.noticeCard, styles.errorCard]}>
                <Text style={styles.noticeText}>{authError}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={() => {
                    void refreshAuthSession();
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry session</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={28} color={COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add items from menu to start your order.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
              onPress={openMenu}
            >
              <Text style={styles.primaryButtonText}>Browse Menu</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={hasCartItems ? (
          <View style={styles.footer}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Enter Coupon Code</Text>
              <View style={styles.couponRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={value => setCouponInput(value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  style={styles.couponInput}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.applyButton,
                    pressed ? styles.pressed : null,
                    (isApplyingCoupon || !hasCartItems) ? styles.disabled : null,
                  ]}
                  onPress={() => {
                    if (appliedCouponCode) {
                      handleRemoveCoupon();
                      return;
                    }

                    void handleApplyCoupon();
                  }}
                  disabled={isApplyingCoupon || !hasCartItems}
                >
                  <Text style={styles.applyButtonText}>
                    {appliedCouponCode ? 'Remove' : isApplyingCoupon ? 'Applying...' : 'Apply'}
                  </Text>
                </Pressable>
              </View>
              {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}
              {couponSuccess ? <Text style={styles.successText}>{couponSuccess}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(cartTotal)}</Text>
              </View>
              {discountAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountText}>Discount</Text>
                  <Text style={styles.discountText}>-{formatCurrency(discountAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Charge</Text>
                <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Final Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(payableCartTotal)}</Text>
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
                  Secure session is still getting ready. You can review your cart while we finish it.
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.pressed : null,
                !hasCartItems ? styles.disabled : null,
              ]}
              onPress={() => {
                setCheckoutError('');
                setCheckoutStep('details');
                navigation.navigate(ROOT_ROUTES.CHECKOUT_DETAILS);
              }}
              disabled={!hasCartItems}
            >
              <Text style={styles.primaryButtonText}>Proceed to checkout</Text>
            </Pressable>
          </View>
        ) : <View style={styles.spacer} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  headerCopy: { flex: 1 },
  iconButton: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.secondary },
  title: { marginTop: 4, fontSize: 30, fontWeight: '800', color: COLORS.text },
  subtitle: { marginTop: SPACING.xs, fontSize: 14, lineHeight: 21, color: COLORS.textMuted },
  noticeCard: {
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  warningCard: { borderColor: '#E7C486', backgroundColor: '#FFF4DD' },
  errorCard: { borderColor: '#F4C7C1', backgroundColor: '#FFF1EF' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  noticeText: { marginTop: 4, fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  noticeMeta: { marginTop: 4, fontSize: 12, color: COLORS.textMuted },
  emptyCard: {
    alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, padding: SPACING.xl, marginTop: SPACING.xl,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.cardMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { marginTop: SPACING.lg, fontSize: 24, fontWeight: '800', color: COLORS.text },
  emptySubtitle: { marginTop: SPACING.sm, fontSize: 14, lineHeight: 21, textAlign: 'center', color: COLORS.textMuted },
  footer: { marginTop: SPACING.sm, gap: SPACING.lg },
  card: {
    borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: SPACING.md },
  couponRow: { flexDirection: 'row', gap: SPACING.sm },
  couponInput: {
    flex: 1, minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card, paddingHorizontal: SPACING.md, color: COLORS.text, fontSize: 15, fontWeight: '600',
  },
  applyButton: {
    minWidth: 104, borderRadius: RADIUS.md, backgroundColor: COLORS.accentStrong,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md,
  },
  applyButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  summaryLabel: { fontSize: 14, color: COLORS.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  discountText: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, marginBottom: 0, marginTop: SPACING.xs },
  totalLabel: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 17, fontWeight: '800', color: COLORS.accentStrong },
  primaryButton: {
    minHeight: 52, borderRadius: RADIUS.pill, backgroundColor: COLORS.accentStrong,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg,
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  retryButton: {
    marginTop: SPACING.md, alignSelf: 'flex-start', borderRadius: RADIUS.pill, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  retryButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  errorText: { marginTop: SPACING.sm, fontSize: 13, lineHeight: 20, color: '#A23D2A' },
  successText: { marginTop: SPACING.sm, fontSize: 13, lineHeight: 20, color: COLORS.success },
  spacer: { height: SPACING.xl },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.84 },
});
