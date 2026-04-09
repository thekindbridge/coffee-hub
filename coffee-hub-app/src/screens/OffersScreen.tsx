import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCartState } from '../app/providers/CartProvider';
import { OfferCard } from '../components/offers/OfferCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { useOffers } from '../hooks/useOffers';
import type { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';
import { getCustomerPalette } from '../components/customer/designSystem';

type OffersNavigation = NativeStackNavigationProp<RootStackParamList>;

const OFFER_TAGS = ['Limited', 'Member', 'Seasonal'] as const;

export function OffersScreen() {
  const navigation = useNavigation<OffersNavigation>();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { activeOffers, error, isLoading } = useOffers();
  const { cartCount, handleApplyCouponCode } = useCartState();
  const [selectedCouponCode, setSelectedCouponCode] = useState('');

  const rewardCopy = useMemo(() => {
    if (activeOffers.length === 0) {
      return 'No active drops right now';
    }

    return `${activeOffers.length} offer${activeOffers.length === 1 ? '' : 's'} live today`;
  }, [activeOffers.length]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={(
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => undefined}
          tintColor={theme.colors.primary}
        />
      )}
    >
      <ScreenTransition>
        <LinearGradient
          colors={palette.offerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBanner, theme.shadows.card]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroChip}>
              <Ionicons name="sparkles-outline" size={14} color="rgba(248, 244, 239, 0.92)" />
              <Text style={styles.heroChipText}>Sensory Rewards</Text>
            </View>
            <Text style={styles.heroCount}>{rewardCopy}</Text>
          </View>

          <Text style={styles.heroTitle}>Save your next ritual before it cools down.</Text>
          <Text style={styles.heroSubtitle}>
            Claim seasonal discounts, member-only pours, and limited-time coupon drops built into the COFFEE-HUB flow.
          </Text>
        </LinearGradient>

        {error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Offers unavailable</Text>
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : null}

        {!error && activeOffers.length === 0 && !isLoading ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>No active offers right now</Text>
            <Text style={styles.messageText}>
              The rewards shelf is empty for the moment. Browse the menu and check back for the next drop.
            </Text>
            <PrimaryButton
              title="Browse Menu"
              onPress={() => navigation.navigate(ROOT_ROUTES.MAIN_TABS, { screen: TAB_ROUTES.MENU })}
              style={styles.emptyAction}
            />
          </View>
        ) : null}

        <View style={styles.list}>
          {activeOffers.map((offer, index) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              tagLabel={OFFER_TAGS[index % OFFER_TAGS.length]}
              isApplied={selectedCouponCode === offer.couponCode}
              actionLabel={cartCount > 0 ? 'Apply' : 'Save code'}
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
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: 120,
    },
    heroBanner: {
      borderRadius: theme.radius.hero,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    heroChipText: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(248, 244, 239, 0.92)',
    },
    heroCount: {
      fontSize: theme.typography.caption,
      color: 'rgba(248, 244, 239, 0.82)',
    },
    heroTitle: {
      maxWidth: '88%',
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '900',
      color: 'rgba(248, 244, 239, 0.98)',
    },
    heroSubtitle: {
      maxWidth: '92%',
      fontSize: theme.typography.body,
      lineHeight: 21,
      color: 'rgba(248, 244, 239, 0.84)',
    },
    messageCard: {
      marginTop: theme.spacing.xl,
      borderRadius: theme.radius.hero,
      backgroundColor: palette.surfaceHigh,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    messageTitle: {
      fontSize: theme.typography.subheading,
      fontWeight: '800',
      color: palette.text,
    },
    messageText: {
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
    },
    emptyAction: {
      marginTop: theme.spacing.sm,
    },
    list: {
      marginTop: theme.spacing.xl,
      gap: theme.spacing.md,
    },
  });
};
