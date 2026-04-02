import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { subscribeToAdminOrders } from '../services/ordersService';
import type { Order, OrderStatusCode } from '../types';
import { formatCurrency } from '../../utils/formatCurrency';

type OverviewStat = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: OrderStatusCode;
  label: string;
  value: number;
};

const statBase = [
  {
    color: '#D4A15A',
    icon: 'time-outline',
    key: 'PENDING',
    label: 'Pending Orders',
  },
  {
    color: '#63C08A',
    icon: 'checkmark-circle-outline',
    key: 'ACCEPTED',
    label: 'Accepted Orders',
  },
  {
    color: '#59A7FF',
    icon: 'cafe-outline',
    key: 'PREPARING',
    label: 'Preparing Orders',
  },
  {
    color: '#F39A5F',
    icon: 'bicycle-outline',
    key: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
  },
] as const;

export function OverviewScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAdminOrders(
      nextOrders => {
        setOrders(nextOrders);
        setError('');
      },
      snapshotError => {
        console.error('Failed to load admin overview orders', snapshotError);
        setError(snapshotError.message || 'Unable to load admin overview.');
      },
    );

    return unsubscribe;
  }, []);

  const stats = useMemo<OverviewStat[]>(() => {
    return statBase.map(stat => ({
      ...stat,
      value: orders.filter(order => order.status_code === stat.key).length,
    }));
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Coffee Hub Admin</Text>
          <Text style={styles.title}>Operations Overview</Text>
          <Text style={styles.subtitle}>
            Live Firestore stats for the kitchen and delivery queue.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.map(stat => (
            <View key={stat.key} style={styles.statCard}>
              <View style={[styles.iconWrap, { backgroundColor: `${stat.color}22` }]}>
                <Ionicons color={stat.color} name={stat.icon} size={20} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Live Order Feed</Text>
          <Text style={styles.summaryText}>
            {orders.length === 0
              ? 'No orders are in the system yet.'
              : `${orders.length} orders currently synced from Firestore.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>New orders will appear here in real time.</Text>
            </View>
          ) : (
            recentOrders.map(order => (
              <View key={order.doc_id} style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <View style={styles.orderMeta}>
                    <Text style={styles.orderId}>#{order.id}</Text>
                    <Text style={styles.customerName}>{order.customer_name || 'Walk-in Customer'}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{order.status}</Text>
                  </View>
                </View>

                <Text style={styles.orderItemsText}>
                  {order.items.length > 0
                    ? order.items.map(item => `${item.name} x${item.quantity}`).join(', ')
                    : 'Items are loading for this order.'}
                </Text>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total_amount)}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: '#8B5E3C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    minWidth: '47%',
    padding: 18,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 18,
  },
  statLabel: {
    color: '#B6AAA1',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  summaryCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  summaryText: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  orderCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  orderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderMeta: {
    flex: 1,
  },
  orderId: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  customerName: {
    color: '#CFC5BE',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 94, 60, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
    color: '#E2BC97',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderItemsText: {
    color: '#A59A92',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  orderFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
  },
  orderTotal: {
    color: '#C48A5A',
    fontSize: 16,
    fontWeight: '800',
  },
  orderDate: {
    color: '#8B8077',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: 'rgba(180, 72, 72, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: '#F0A4A4',
    fontSize: 14,
    lineHeight: 20,
  },
});
