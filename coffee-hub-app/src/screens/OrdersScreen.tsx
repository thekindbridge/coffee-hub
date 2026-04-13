import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { OrderCard } from '../components/customer/OrderCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { TAB_ROUTES } from '../constants/routes';
import { useOrders } from '../hooks/useOrders';
import type { MainTabParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';
import { getCustomerPalette } from '../components/customer/designSystem';

type OrdersNavigation = BottomTabNavigationProp<MainTabParamList>;

export function OrdersScreen() {
  const navigation = useNavigation<OrdersNavigation>();
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { currentUserId, isAuthReady, placedOrder, setPlacedOrder } = useCartState();
  const {
    activeOrders,
    error,
    isLoading,
    orders,
    pastOrders,
    refreshOrders,
  } = useOrders({
    currentUserId,
    optimisticOrder: placedOrder,
  });
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders]),
  );

  useEffect(() => {
    if (!placedOrder) {
      return;
    }

    const existsInOrders = orders.some(order => (
      order.doc_id === placedOrder.doc_id || order.id === placedOrder.id
    ));

    if (existsInOrders) {
      setPlacedOrder(null);
    }
  }, [orders, placedOrder, setPlacedOrder]);

  useEffect(() => {
    if (activeTab === 'active' && activeOrders.length === 0 && pastOrders.length > 0) {
      setActiveTab('history');
      return;
    }

    if (activeTab === 'history' && pastOrders.length === 0 && activeOrders.length > 0) {
      setActiveTab('active');
    }
  }, [activeOrders.length, activeTab, pastOrders.length]);

  const visibleOrders = activeTab === 'active' ? activeOrders : pastOrders;
  const emptyTitle = useMemo(
    () => (isAuthReady ? 'No orders yet' : 'Loading your account'),
    [isAuthReady],
  );
  const emptySubtitle = useMemo(
    () => (
      isAuthReady
        ? 'Your next coffee order will appear here with a clear status timeline.'
        : 'Once the account is ready, your active and past orders will sync here.'
    ),
    [isAuthReady],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refreshOrders();
            }}
            tintColor={theme.colors.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Your Brews</Text>
            <Text style={styles.title}>Track current cravings and past delights.</Text>
            <Text style={styles.subtitle}>
              Every order is grouped into a cleaner card with a simple progress timeline.
            </Text>
          </View>

          <GlassSurface depth="floating" overlayColor={palette.surfaceGlass} style={styles.segmentedControl}>
            <ScalePressable
              accessibilityRole="button"
              onPress={() => setActiveTab('active')}
              style={styles.segment}
            >
              {activeTab === 'active' ? (
                <LinearGradient
                  colors={palette.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentFill}
                >
                  <Text style={[styles.segmentText, styles.segmentTextActive]}>Active</Text>
                  <Text style={[styles.segmentCount, styles.segmentTextActive]}>{activeOrders.length}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentFill}>
                  <Text style={styles.segmentText}>Active</Text>
                  <Text style={styles.segmentCount}>{activeOrders.length}</Text>
                </View>
              )}
            </ScalePressable>

            <ScalePressable
              accessibilityRole="button"
              onPress={() => setActiveTab('history')}
              style={styles.segment}
            >
              {activeTab === 'history' ? (
                <LinearGradient
                  colors={palette.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentFill}
                >
                  <Text style={[styles.segmentText, styles.segmentTextActive]}>History</Text>
                  <Text style={[styles.segmentCount, styles.segmentTextActive]}>{pastOrders.length}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentFill}>
                  <Text style={styles.segmentText}>History</Text>
                  <Text style={styles.segmentCount}>{pastOrders.length}</Text>
                </View>
              )}
            </ScalePressable>
          </GlassSurface>

          {error ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.messageCard}>
              <Text style={styles.messageTitle}>Unable to load orders</Text>
              <Text style={styles.messageText}>{error}</Text>
            </GlassSurface>
          ) : null}

          {orders.length === 0 && !isLoading ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={24} color={palette.caramel} />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyText}>{emptySubtitle}</Text>
              {isAuthReady ? (
                <PrimaryButton
                  title="Browse Menu"
                  onPress={() => navigation.navigate(TAB_ROUTES.MENU)}
                  style={styles.emptyAction}
                />
              ) : null}
            </GlassSurface>
          ) : null}

          {visibleOrders.length > 0 ? (
            <View style={styles.list}>
              {visibleOrders.map(order => (
                <OrderCard key={order.doc_id || order.id} order={order} />
              ))}
            </View>
          ) : orders.length > 0 ? (
            <GlassSurface depth="section" overlayColor={palette.surfaceGlass} style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={activeTab === 'active' ? 'time-outline' : 'archive-outline'}
                  size={24}
                  color={palette.caramel}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'active' ? 'No active orders' : 'No past orders yet'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'Once a fresh order starts moving, it will appear here instantly.'
                  : 'Delivered, rejected, and cancelled orders will settle into this history tab.'}
              </Text>
            </GlassSurface>
          ) : null}
        </ScreenTransition>
      </ScrollView>
    </SafeAreaView>
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
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: 120,
      gap: theme.spacing.xl,
    },
    header: {
      gap: 8,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    title: {
      maxWidth: '92%',
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '900',
      color: palette.text,
    },
    subtitle: {
      maxWidth: '92%',
      fontSize: 15,
      lineHeight: 22,
      color: palette.textMuted,
    },
    segmentedControl: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      padding: 6,
    },
    segment: {
      flex: 1,
      minHeight: 52,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    segmentFill: {
      minHeight: 52,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    segmentText: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.textMuted,
    },
    segmentTextActive: {
      color: palette.background,
    },
    segmentCount: {
      fontSize: theme.typography.caption,
      fontWeight: '900',
      color: palette.textMuted,
    },
    messageCard: {
      borderRadius: theme.radius.xl,
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
    emptyCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHighest,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: palette.text,
    },
    emptyText: {
      fontSize: theme.typography.body,
      lineHeight: 21,
      color: palette.textMuted,
    },
    emptyAction: {
      marginTop: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.md,
    },
  });
};
