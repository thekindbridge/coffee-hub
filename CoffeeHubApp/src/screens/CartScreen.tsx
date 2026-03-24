import { Feather } from '@expo/vector-icons';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ROUTES } from '../constants/routes';
import { palette, radius, spacing } from '../constants/theme';
import { useCart } from '../hooks';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type CartScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const noop = () => {};

export function CartScreen() {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { addItem, clearCart, itemCount, items, removeItem, subtotal } = useCart();
  const hasItems = items.length > 0;

  const handleBrowseMenu = () => {
    navigation.navigate(ROUTES.Menu);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            hasItems ? styles.contentWithFooter : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Feather color={palette.secondary} name="shopping-bag" size={14} />
              <Text style={styles.heroBadgeText}>Cart</Text>
            </View>
            <Text style={styles.title}>Ready for your next coffee run.</Text>
            <Text style={styles.subtitle}>
              Review every item, update quantities, and keep your order polished before checkout.
            </Text>
          </View>

          <AppCard style={styles.summaryHero} variant="raised">
            <View style={styles.summaryHeroTop}>
              <View>
                <Text style={styles.summaryEyebrow}>Order summary</Text>
                <Text style={styles.summaryTitle}>
                  {hasItems ? `${itemCount} item${itemCount === 1 ? '' : 's'} in cart` : 'No items added yet'}
                </Text>
              </View>
              <View style={styles.summaryTotalBadge}>
                <Text style={styles.summaryTotalLabel}>Subtotal</Text>
                <Text style={styles.summaryTotalValue}>Rs. {subtotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryHighlights}>
              <View style={styles.summaryHighlight}>
                <Feather color={palette.highlight} name="clock" size={16} />
                <Text style={styles.summaryHighlightText}>20-30 min delivery</Text>
              </View>
              <View style={styles.summaryHighlight}>
                <Feather color={palette.success} name="check-circle" size={16} />
                <Text style={styles.summaryHighlightText}>Freshly prepared on order</Text>
              </View>
            </View>
          </AppCard>

          {!hasItems ? (
            <AppCard style={styles.emptyCard} variant="soft">
              <View style={styles.emptyIconShell}>
                <Feather color={palette.secondary} name="coffee" size={30} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptyBody}>
                Explore the menu to add your favorite brews, bowls, and quick bites.
              </Text>
              <AppButton
                icon={<Feather color={palette.textPrimary} name="arrow-right" size={16} />}
                label="Browse Menu"
                onPress={handleBrowseMenu}
              />
            </AppCard>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Items in your order</Text>
                  <Text style={styles.sectionTitle}>Fresh picks, ready to edit</Text>
                </View>
                <AppButton
                  fullWidth={false}
                  icon={<Feather color={palette.secondary} name="plus" size={16} />}
                  label="Add more"
                  onPress={handleBrowseMenu}
                  variant="ghost"
                />
              </View>

              <View style={styles.itemsList}>
                {items.map(item => {
                  const imageUri = item.image_url?.trim();
                  const hasImage = Boolean(imageUri);

                  return (
                    <AppCard key={item.id} style={styles.itemCard} variant="soft">
                      <View style={styles.itemImageShell}>
                        {hasImage ? (
                          <Image source={{ uri: imageUri }} style={styles.itemImage} />
                        ) : (
                          <View style={[styles.itemImage, styles.itemImageFallback]}>
                            <Feather color={palette.secondary} name="coffee" size={24} />
                          </View>
                        )}
                      </View>

                      <View style={styles.itemCopy}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemHeaderText}>
                            <Text numberOfLines={1} style={styles.itemName}>
                              {item.name}
                            </Text>
                            <Text style={styles.itemPrice}>Rs. {item.price.toFixed(2)}</Text>
                          </View>
                          <Text style={styles.itemTotal}>
                            Rs. {(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>

                        {item.description ? (
                          <Text numberOfLines={2} style={styles.itemDescription}>
                            {item.description}
                          </Text>
                        ) : null}

                        <View style={styles.itemFooter}>
                          <View style={styles.quantityControls}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => addItem(item, -1)}
                              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                            >
                              <Feather color={palette.textSecondary} name="minus" size={16} />
                            </Pressable>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => addItem(item, 1)}
                              style={({ pressed }) => [
                                styles.primaryIconButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Feather color={palette.textPrimary} name="plus" size={16} />
                            </Pressable>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => removeItem(item.id)}
                            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                          >
                            <Text style={styles.removeButtonText}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    </AppCard>
                  );
                })}
              </View>

              <AppCard style={styles.noteCard} variant="soft">
                <View style={styles.noteIconShell}>
                  <Feather color={palette.highlight} name="map-pin" size={16} />
                </View>
                <View style={styles.noteCopy}>
                  <Text style={styles.noteTitle}>Delivery around Inkollu</Text>
                  <Text style={styles.noteBody}>
                    Double-check your cart now and move through checkout smoothly once details are confirmed.
                  </Text>
                </View>
              </AppCard>
            </>
          )}
        </ScrollView>

        {hasItems ? (
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <View>
                <Text style={styles.footerLabel}>Total payable</Text>
                <Text style={styles.footerTitle}>Rs. {subtotal.toFixed(2)}</Text>
              </View>
              <Text style={styles.footerMeta}>{itemCount} item{itemCount === 1 ? '' : 's'}</Text>
            </View>

            <Text style={styles.footerHint}>Fresh, secure, and ready for the final checkout step.</Text>

            <View style={styles.footerActions}>
              <AppButton
                fullWidth={false}
                icon={<Feather color={palette.accent} name="trash-2" size={16} />}
                label="Clear"
                onPress={clearCart}
                style={styles.secondaryFooterButton}
                variant="secondary"
              />
              <AppButton
                disabled
                fullWidth={false}
                icon={<Feather color={palette.textPrimary} name="arrow-right" size={16} />}
                label="Place Order"
                onPress={noop}
                style={styles.primaryFooterButton}
              />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    rowGap: spacing.lg,
  },
  contentWithFooter: {
    paddingBottom: 176,
  },
  hero: {
    gap: spacing.sm,
  },
  heroBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryHero: {
    gap: spacing.md,
  },
  summaryHeroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  summaryTotalBadge: {
    alignItems: 'flex-end',
    backgroundColor: palette.surfaceSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryTotalLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryTotalValue: {
    color: palette.accent,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryHighlights: {
    gap: spacing.sm,
  },
  summaryHighlight: {
    alignItems: 'center',
    backgroundColor: palette.surfaceSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryHighlightText: {
    color: palette.accent,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyIconShell: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  itemsList: {
    rowGap: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
  },
  itemImageShell: {
    borderRadius: radius.lg,
    height: 96,
    overflow: 'hidden',
    width: 96,
  },
  itemImage: {
    height: '100%',
    width: '100%',
  },
  itemImageFallback: {
    alignItems: 'center',
    backgroundColor: palette.surfaceRaised,
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemHeaderText: {
    flex: 1,
  },
  itemName: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemPrice: {
    color: palette.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  itemTotal: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  itemDescription: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  itemFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantityControls: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 13, 11, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  primaryIconButton: {
    alignItems: 'center',
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quantityText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeButtonText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  noteCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteIconShell: {
    alignItems: 'center',
    backgroundColor: palette.highlightSoft,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  noteCopy: {
    flex: 1,
  },
  noteTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  noteBody: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  footer: {
    backgroundColor: 'rgba(18, 13, 11, 0.98)',
    borderTopColor: palette.borderStrong,
    borderTopWidth: 1,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    position: 'absolute',
    width: '100%',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  footerTitle: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  footerMeta: {
    color: palette.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  footerHint: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryFooterButton: {
    flex: 0.95,
  },
  primaryFooterButton: {
    flex: 1.35,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
});
