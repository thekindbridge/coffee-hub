import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/customer/AppHeader';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAuth } from '../../hooks/useAuth';
import { useShopTiming } from '../../hooks/useShopTiming';
import {
  AdminOrderCard,
  AdminStatCard,
} from '../components';
import { subscribeToAdminOrders, useOrderOperations } from '../hooks';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminOrderStage,
  getAdminSurfaceColor,
  type AdminOrderStage,
} from '../utils/designSystem';
import type { Order } from '../types';

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
}

const isLiveOrder = (order: Order) => (
  order.status_code !== 'DELIVERED'
  && order.status_code !== 'REJECTED'
  && order.status_code !== 'CANCELLED'
);

export function AdminOrdersScreen() {
  const { user } = useAuth();
  const { profileDisplayName, authPhotoUrl } = useProfileData();
  const { isOpen } = useShopTiming();
  const {
    acceptOrder,
    advanceOrder,
    updateOrderStatus,
  } = useOrderOperations();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [selectedStages, setSelectedStages] = useState<Record<string, AdminOrderStage>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState('');

  const dashboardName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const headerInitials = getInitials(dashboardName);

  useEffect(() => {
    const unsubscribe = subscribeToAdminOrders(
      nextOrders => {
        setOrders(nextOrders);
        setOrdersError('');
      },
      error => {
        console.error('Failed to load admin live orders', error);
        setOrdersError(error.message || 'Unable to sync live orders.');
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    setSelectedStages(current => {
      const next = { ...current };

      orders.forEach(order => {
        if (!next[order.doc_id]) {
          next[order.doc_id] = getAdminOrderStage(order.status_code);
        }
      });

      return next;
    });
  }, [orders]);

  const liveOrders = useMemo(
    () => orders.filter(isLiveOrder),
    [orders],
  );
  const pendingCount = useMemo(
    () => liveOrders.filter(order => order.status_code === 'PENDING').length,
    [liveOrders],
  );
  const activeKitchenCount = useMemo(
    () => liveOrders.filter(order => (
      order.status_code === 'ACCEPTED' || order.status_code === 'PREPARING'
    )).length,
    [liveOrders],
  );
  const serverStatusLabel = ordersError
    ? 'Retrying'
    : isOpen
      ? 'Synced'
      : 'Standby';

  const handleUpdate = async (order: Order) => {
    setUpdatingOrderId(order.doc_id);

    try {
      if (order.status_code === 'PENDING') {
        await acceptOrder(order);
      } else {
        await advanceOrder(order);
      }
    } catch (updateError) {
      Alert.alert(
        'Update Failed',
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update the order right now.',
      );
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleCancel = (order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Cancel #${order.id} from the active queue?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => {
            setUpdatingOrderId(order.doc_id);
            void updateOrderStatus(order, 'CANCELLED')
              .catch(cancelError => {
                Alert.alert(
                  'Cancel Failed',
                  cancelError instanceof Error
                    ? cancelError.message
                    : 'Unable to cancel the order right now.',
                );
              })
              .finally(() => {
                setUpdatingOrderId('');
              });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <FlatList
          data={liveOrders}
          keyExtractor={item => item.doc_id}
          renderItem={({ item }) => (
            <AdminOrderCard
              order={item}
              selectedStage={selectedStages[item.doc_id] || getAdminOrderStage(item.status_code)}
              onStageChange={stage => {
                setSelectedStages(current => ({
                  ...current,
                  [item.doc_id]: stage,
                }));
              }}
              onUpdate={() => {
                void handleUpdate(item);
              }}
              onCancel={() => handleCancel(item)}
              onNotify={() => {
                Alert.alert(
                  'Notify Customer',
                  'Customer notification delivery is not wired in the current mobile codebase yet.',
                );
              }}
              isUpdating={updatingOrderId === item.doc_id}
            />
          )}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.headerContent}>
              <AppHeader
                mode="admin"
                avatarUrl={authPhotoUrl}
                initials={headerInitials}
                title="COFFEE-HUB"
                subtitle="Kitchen pulse"
              />

              <View style={styles.titleBlock}>
                <Text style={styles.eyebrow}>Live Orders</Text>
                <Text style={styles.title}>Keep the brew line moving in real time.</Text>
                <Text style={styles.subtitle}>
                  Order updates follow the existing Firestore workflow already used in the app, surfaced here with a cleaner control UI for the kitchen.
                </Text>
              </View>

              <View style={styles.kitchenPulseWrap}>
                <View style={styles.statsGrid}>
                  <AdminStatCard
                    label="Pending Count"
                    value={pendingCount}
                    detail={`${liveOrders.length} live orders`}
                    icon="time-outline"
                    tone="warning"
                    style={styles.halfStat}
                  />
                  <AdminStatCard
                    label="Active Count"
                    value={activeKitchenCount}
                    detail="Brewing right now"
                    icon="cafe-outline"
                    tone="success"
                    style={styles.halfStat}
                  />
                  <AdminStatCard
                    label="Server Status"
                    value={serverStatusLabel}
                    detail={isOpen ? 'Store open for orders' : 'Store closed for orders'}
                    icon="hardware-chip-outline"
                  />
                </View>
              </View>

              {ordersError ? (
                <View style={styles.errorWrap}>
                  <GlassSurface
                    depth="card"
                    intensity={64}
                    overlayColor="rgba(225, 161, 141, 0.14)"
                    style={styles.errorCard}
                  >
                    <Text style={styles.errorText}>{ordersError}</Text>
                  </GlassSurface>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <GlassSurface
                depth="card"
                intensity={64}
                overlayColor={getAdminSurfaceColor('card')}
                style={styles.emptyCard}
              >
                <Text style={styles.emptyTitle}>No live orders right now</Text>
                <Text style={styles.emptyText}>
                  Fresh orders will populate this queue as soon as customers place them.
                </Text>
              </GlassSurface>
            </View>
          )}
        />
      </ScreenTransition>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: adminPalette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
  headerContent: {
    gap: 20,
  },
  titleBlock: {
    gap: 10,
  },
  eyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: adminPalette.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: adminPalette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  kitchenPulseWrap: {
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfStat: {
    width: '48.2%',
  },
  errorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  errorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 16,
  },
  errorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  emptyCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: adminPalette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
