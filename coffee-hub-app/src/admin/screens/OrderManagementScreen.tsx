import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../components';
import { useOrderOperations, subscribeToAdminOrders } from '../hooks';
import type { Order } from '../types';
import {
  getOrderActionLabel,
  isTerminalOrderStatus,
  ORDER_STATUS_DISPLAY,
  type OrderStatus,
} from '../types';
import { formatCurrency } from '../../utils/formatCurrency';

const FILTERS: Array<'All' | OrderStatus> = [
  'All',
  ...(Object.values(ORDER_STATUS_DISPLAY) as OrderStatus[]),
];

const formatDateTime = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown time';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
};

export function OrderManagementScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | OrderStatus>('All');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [submittingOrderId, setSubmittingOrderId] = useState('');

  const {
    acceptOrder,
    advanceOrder,
    rejectOrder,
  } = useOrderOperations();

  useEffect(() => {
    const unsubscribe = subscribeToAdminOrders(
      nextOrders => {
        setOrders(nextOrders);
        setError('');
      },
      snapshotError => {
        console.error('Failed to load admin orders', snapshotError);
        setError(snapshotError.message || 'Unable to load orders.');
      },
    );

    return unsubscribe;
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedStatus === 'All') {
      return orders;
    }

    return orders.filter(order => order.status === selectedStatus);
  }, [orders, selectedStatus]);

  const handleAdvanceOrder = async (order: Order) => {
    setSubmittingOrderId(order.doc_id);

    try {
      if (order.status_code === 'PENDING') {
        await acceptOrder(order);
      } else {
        await advanceOrder(order);
      }
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Unable to update this order right now.';
      Alert.alert('Update Failed', message);
    } finally {
      setSubmittingOrderId('');
    }
  };

  const openRejectModal = (order: Order) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setIsRejectModalVisible(true);
  };

  const closeRejectModal = () => {
    setSelectedOrder(null);
    setRejectionReason('');
    setIsRejectModalVisible(false);
    setSubmittingOrderId('');
  };

  const confirmRejectOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const nextReason = rejectionReason.trim();
    if (!nextReason) {
      Alert.alert('Reason Required', 'Enter a rejection reason before continuing.');
      return;
    }

    setSubmittingOrderId(selectedOrder.doc_id);

    try {
      await rejectOrder(selectedOrder, nextReason);
      closeRejectModal();
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Unable to reject this order right now.';
      Alert.alert('Reject Failed', message);
      setSubmittingOrderId('');
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Orders Queue</Text>
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subtitle}>
          Review every order in real time and move it through the same status flow used on the web app.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.filtersRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {FILTERS.map(filter => {
          const isActive = selectedStatus === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => {
                setSelectedStatus(filter);
              }}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const isSubmitting = submittingOrderId === item.doc_id;
    const actionLabel = getOrderActionLabel(item.status_code);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderCopy}>
            <Text style={styles.orderEyebrow}>Order ID</Text>
            <Text style={styles.orderId}>#{item.id}</Text>
            <Text style={styles.orderTime}>{formatDateTime(item.created_at)}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.metaValue}>{item.customer_name || 'Walk-in Customer'}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(item.total_amount)}</Text>
          </View>
        </View>

        <Text style={styles.metaLabel}>Items</Text>
        {item.items.length > 0 ? (
          item.items.map(orderItem => (
            <Text key={orderItem.id} style={styles.itemLine}>
              {orderItem.name} x{orderItem.quantity}
            </Text>
          ))
        ) : (
          <Text style={styles.itemLine}>Items are loading for this order.</Text>
        )}

        {item.rejection_reason ? (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>Rejection Reason</Text>
            <Text style={styles.reasonText}>{item.rejection_reason}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {item.status_code === 'PENDING' ? (
            <>
              <TouchableOpacity
                disabled={isSubmitting}
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={() => {
                  void handleAdvanceOrder(item);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Updating...' : 'Accept'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isSubmitting}
                style={[styles.rejectButton, isSubmitting && styles.disabledButton]}
                onPress={() => {
                  openRejectModal(item);
                }}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {item.status_code !== 'PENDING' && !isTerminalOrderStatus(item.status_code) ? (
            <TouchableOpacity
              disabled={isSubmitting}
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={() => {
                void handleAdvanceOrder(item);
              }}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Updating...' : actionLabel}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isTerminalOrderStatus(item.status_code) ? (
            <View style={styles.lockedState}>
              <Text style={styles.lockedStateText}>
                This order is locked because it reached a final state.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.doc_id}
        renderItem={renderOrder}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No orders match the selected filter.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="fade"
        transparent
        visible={isRejectModalVisible}
        onRequestClose={closeRejectModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRejectModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalEyebrow}>Reject Order</Text>
            <Text style={styles.modalTitle}>
              {selectedOrder ? `Reject #${selectedOrder.id}` : 'Reject Order'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter a reason that staff and the customer can understand clearly.
            </Text>

            <TextInput
              multiline
              placeholder="Example: Shop is closed for maintenance."
              placeholderTextColor="#6F655E"
              style={styles.modalInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeRejectModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={submittingOrderId === selectedOrder?.doc_id}
                style={[styles.rejectButton, submittingOrderId === selectedOrder?.doc_id && styles.disabledButton]}
                onPress={() => {
                  void confirmRejectOrder();
                }}
              >
                <Text style={styles.rejectButtonText}>
                  {submittingOrderId === selectedOrder?.doc_id ? 'Rejecting...' : 'Confirm Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
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
  filtersRow: {
    gap: 10,
    paddingBottom: 16,
  },
  filterChip: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  filterChipText: {
    color: '#D0C3B9',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  orderHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderHeaderCopy: {
    flex: 1,
  },
  orderEyebrow: {
    color: '#8B8077',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  orderId: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  orderTime: {
    color: '#8B8077',
    fontSize: 12,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    color: '#8B8077',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  totalValue: {
    color: '#C48A5A',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  itemLine: {
    color: '#D0C3B9',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  actionsRow: {
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C48A5A',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(196, 138, 90, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#E8D6C7',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  rejectButtonText: {
    color: '#F2B6B6',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  reasonCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  reasonTitle: {
    color: '#F2B6B6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reasonText: {
    color: '#F5D0D0',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  lockedState: {
    backgroundColor: '#111111',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  lockedStateText: {
    color: '#8B8077',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.68)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    width: '100%',
  },
  modalEyebrow: {
    color: '#8B5E3C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  modalSubtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
