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
import { useCartState } from '../app/providers/CartProvider';
import { OrderCard } from '../components/customer/OrderCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ScalePressable } from '../components/ui/ScalePressable';
import { PrimaryButton } from '../components/ui/PrimaryButton';
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
    () => (isAuthReady ? 'No brews yet' : 'Loading your account'),
    [isAuthReady],
  );
  const emptySubtitle = useMemo(
    () => (
      isAuthReady
        ? 'Let\'s craft your first coffee and stage every update in this room.'
        : 'Once your account finishes loading, your order history will appear here.'
    ),
    [isAuthReady],
  );

  return (
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
          <Text style={styles.eyebrow}>Order room</Text>
          <Text style={styles.title}>Placed, brewing, couriered, and remembered.</Text>
          <Text style={styles.subtitle}>
            Follow the full coffee journey from checkout to doorstep without leaving the customer app.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <GlassSurface depth="section" intensity={54} overlayColor={palette.surfaceGlass} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeOrders.length}</Text>
            <Text style={styles.summaryLabel}>Active brews</Text>
          </GlassSurface>
          <GlassSurface depth="section" intensity={54} overlayColor={palette.surfaceGlass} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{pastOrders.length}</Text>
            <Text style={styles.summaryLabel}>Past rituals</Text>
          </GlassSurface>
        </View>

        <GlassSurface depth="floating" intensity={58} overlayColor={palette.surfaceGlass} style={styles.segmentedControl}>
          <ScalePressable
            accessibilityRole="button"
            onPress={() => setActiveTab('active')}
            style={[
              styles.segment,
            ]}
          >
            {activeTab === 'active' ? (
              <LinearGradient
                colors={palette.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.segmentFill, styles.segmentActive]}
              >
                <Text style={[styles.segmentText, styles.segmentTextActive]}>
                  Active
                </Text>
                <Text style={[styles.segmentCount, styles.segmentTextActive]}>
                  {activeOrders.length}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentFill}>
                <Text style={styles.segmentText}>
                  Active
                </Text>
                <Text style={styles.segmentCount}>
                  {activeOrders.length}
                </Text>
              </View>
            )}
          </ScalePressable>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => setActiveTab('history')}
            style={[
              styles.segment,
            ]}
          >
            {activeTab === 'history' ? (
              <LinearGradient
                colors={palette.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.segmentFill, styles.segmentActive]}
              >
                <Text style={[styles.segmentText, styles.segmentTextActive]}>
                  History
                </Text>
                <Text style={[styles.segmentCount, styles.segmentTextActive]}>
                  {pastOrders.length}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentFill}>
                <Text style={styles.segmentText}>
                  History
                </Text>
                <Text style={styles.segmentCount}>
                  {pastOrders.length}
                </Text>
              </View>
            )}
          </ScalePressable>
        </GlassSurface>

        {error ? (
          <GlassSurface depth="section" intensity={52} overlayColor={palette.surfaceGlass} style={styles.messageCard}>
            <Text style={styles.messageTitle}>Unable to load orders</Text>
            <Text style={styles.messageText}>{error}</Text>
          </GlassSurface>
        ) : null}

        {orders.length === 0 && !isLoading ? (
          <GlassSurface depth="section" intensity={52} overlayColor={palette.surfaceGlass} style={styles.emptyCard}>
            <GlassSurface depth="card" style={styles.emptyIconWrap}>
              <Ionicons name="cafe-outline" size={26} color={palette.caramel} />
            </GlassSurface>
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
              <OrderCard
                key={order.doc_id || order.id}
                order={order}
              />
            ))}
          </View>
        ) : orders.length > 0 ? (
          <GlassSurface depth="section" intensity={52} overlayColor={palette.surfaceGlass} style={styles.emptyCard}>
            <GlassSurface depth="card" style={styles.emptyIconWrap}>
              <Ionicons
                name={activeTab === 'active' ? 'time-outline' : 'archive-outline'}
                size={24}
                color={palette.caramel}
              />
            </GlassSurface>
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No active brews right now' : 'No ritual archive yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'Once a new order starts moving, it will appear here with live progress.'
                : 'Delivered, rejected, and cancelled orders will settle into this archive.'}
            </Text>
          </GlassSurface>
        ) : null}
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
    header: {
      gap: 6,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    title: {
      maxWidth: '92%',
      fontSize: 35,
      lineHeight: 41,
      fontWeight: '900',
      color: palette.text,
    },
    subtitle: {
      maxWidth: '92%',
      fontSize: 15,
      lineHeight: 23,
      color: palette.textMuted,
    },
    summaryRow: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    summaryCard: {
      flex: 1,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    summaryValue: {
      fontSize: 26,
      fontWeight: '900',
      color: palette.text,
    },
    summaryLabel: {
      marginTop: 4,
      fontSize: theme.typography.caption,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    segmentedControl: {
      marginTop: theme.spacing.xl,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.hero,
      padding: 6,
    },
    segment: {
      flex: 1,
      minHeight: 54,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    segmentFill: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    segmentActive: {
      shadowColor: theme.colors.shadowStrong,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.isDark ? 0.24 : 0.16,
      shadowRadius: 18,
      elevation: 6,
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
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.hero,
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
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.hero,
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
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
      marginTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
  });
};
