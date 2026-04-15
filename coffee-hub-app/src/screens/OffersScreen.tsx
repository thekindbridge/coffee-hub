import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { CUSTOMER_SCREEN_BOTTOM_PADDING } from '../components/customer/designSystem';
import { OfferCard } from '../components/offers/OfferCard';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type OffersNavigation = NativeStackNavigationProp<RootStackParamList>;

const OFFER_IMAGES = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=85',
] as const;

const sensory = {
  background: '#151311',
  caramel: '#f2be8c',
  muted: '#9f928a',
  onCaramel: '#482904',
  surfaceContainer: '#221f1d',
  text: '#f7eee8',
};

export function OffersScreen() {
  const navigation = useNavigation<OffersNavigation>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { activeOffers, error, isLoading } = useOffers();
  const { cartCount, handleApplyCouponCode } = useCartState();
  const [selectedCouponCode, setSelectedCouponCode] = useState('');

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + CUSTOMER_SCREEN_BOTTOM_PADDING },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.headerBlock}>
            <View style={styles.brandRow}>
              <Ionicons name="cafe" size={15} color={sensory.caramel} />
              <Text style={styles.brandText}>Coffee Hub</Text>
            </View>
            <Text style={styles.title}>Offers & Rewards</Text>
            <Text style={styles.subtitle}>Exclusive treats just for you, brewed to perfection.</Text>
          </View>

          {error ? (
            <View style={[styles.messageCard, theme.shadows.card]}>
              <Text style={styles.messageTitle}>Offers unavailable</Text>
              <Text style={styles.messageText}>{error}</Text>
            </View>
          ) : null}

          {!error && activeOffers.length === 0 && !isLoading ? (
            <View style={[styles.messageCard, theme.shadows.card]}>
              <Text style={styles.messageTitle}>No active offers right now</Text>
              <Text style={styles.messageText}>
                Browse the menu and check back soon for the next premium reward drop.
              </Text>
              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU })}
                style={styles.emptyAction}
              >
                <Text style={styles.emptyActionText}>Browse Menu</Text>
              </ScalePressable>
            </View>
          ) : null}

          <View style={styles.list}>
            {activeOffers.map((offer, index) => (
              <OfferCard
                imageUrl={OFFER_IMAGES[index % OFFER_IMAGES.length]}
                key={offer.id}
                offer={offer}
                isApplied={selectedCouponCode === offer.couponCode}
                actionLabel="Claim Offer"
                onApply={async nextOffer => {
                  await handleApplyCouponCode(nextOffer.couponCode);
                  setSelectedCouponCode(nextOffer.couponCode);

                  if (cartCount > 0) {
                    navigation.navigate(ROOT_ROUTES.CART);
                    return;
                  }

                  navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU });
                }}
              />
            ))}
          </View>
        </ScreenTransition>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: sensory.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    headerBlock: {
      gap: 7,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandText: {
      fontSize: 13,
      fontWeight: '900',
      color: sensory.caramel,
    },
    title: {
      marginTop: 2,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '900',
      color: sensory.text,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: sensory.muted,
    },
    messageCard: {
      borderRadius: 24,
      backgroundColor: sensory.surfaceContainer,
      padding: 24,
      gap: 12,
    },
    messageTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '900',
      color: sensory.text,
    },
    messageText: {
      fontSize: theme.typography.body,
      lineHeight: 21,
      color: sensory.muted,
    },
    emptyAction: {
      minHeight: 50,
      marginTop: 8,
      borderRadius: 24,
      backgroundColor: sensory.caramel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyActionText: {
      fontSize: 14,
      fontWeight: '900',
      color: sensory.onCaramel,
    },
    list: {
      gap: 24,
    },
  });
};
