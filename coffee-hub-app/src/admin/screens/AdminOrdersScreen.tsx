import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/customer/AppHeader';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAuth } from '../../hooks/useAuth';
import { useShopTiming } from '../../hooks/useShopTiming';
import type { DeliveryAgent } from '../../types';
import {
  AdminOrderCard,
  AdminStatCard,
} from '../components';
import {
  subscribeToAvailableDeliveryAgents,
  subscribeToKitchenOrders,
  subscribeToPendingOrders,
  useOrderOperations,
} from '../hooks';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';
import type { Order } from '../types';

type AdminActionModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
}

function dedupeOrders(orders: Order[]) {
  return Array.from(
    orders.reduce((accumulator, order) => {
      accumulator.set(order.doc_id, order);
      return accumulator;
    }, new Map<string, Order>()).values(),
  ).sort((left, right) => (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  ));
}

function getPrimaryActionLabel(order: Order, hasAvailableAgents: boolean) {
  switch (order.status_code) {
    case 'PENDING':
      return 'Accept Order';
    case 'ACCEPTED':
      return 'Start Preparing';
    case 'PREPARING':
      return hasAvailableAgents ? 'Assign Delivery Agent' : 'No Active Agents';
    case 'OUT_FOR_DELIVERY':
      return 'Mark Delivered';
    default:
      return '';
  }
}

function AdminActionModal({
  children,
  onClose,
  title,
  visible,
}: AdminActionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalWrap}>
          <GlassSurface
            depth="card"
            intensity={70}
            overlayColor={getAdminSurfaceColor('card')}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <ScalePressable
                accessibilityRole="button"
                onPress={onClose}
                scaleTo={0.96}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseLabel}>Close</Text>
              </ScalePressable>
            </View>
            {children}
          </GlassSurface>
        </View>
      </View>
    </Modal>
  );
}

export function AdminOrdersScreen() {
  const { user } = useAuth();
  const { profileDisplayName, authPhotoUrl } = useProfileData();
  const { isOpen } = useShopTiming();
  const {
    acceptOrder,
    markDelivered,
    markOutForDelivery,
    markPreparing,
    rejectOrder,
  } = useOrderOperations();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [availableAgents, setAvailableAgents] = useState<DeliveryAgent[]>([]);
  const [pendingError, setPendingError] = useState('');
  const [kitchenError, setKitchenError] = useState('');
  const [agentsError, setAgentsError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [assignmentOrder, setAssignmentOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [modalError, setModalError] = useState('');

  const dashboardName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const headerInitials = getInitials(dashboardName);

  useEffect(() => {
    const unsubscribePending = subscribeToPendingOrders(
      nextOrders => {
        setPendingOrders(nextOrders);
        setPendingError('');
      },
      error => {
        console.error('Failed to load pending orders', error);
        setPendingOrders([]);
        setPendingError(error.message || 'Unable to sync pending orders.');
      },
    );

    const unsubscribeKitchen = subscribeToKitchenOrders(
      nextOrders => {
        setKitchenOrders(nextOrders);
        setKitchenError('');
      },
      error => {
        console.error('Failed to load kitchen orders', error);
        setKitchenOrders([]);
        setKitchenError(error.message || 'Unable to sync kitchen orders.');
      },
    );

    const unsubscribeAgents = subscribeToAvailableDeliveryAgents(
      nextAgents => {
        setAvailableAgents(nextAgents);
        setAgentsError('');
        setSelectedAgentId(currentValue => {
          if (currentValue && nextAgents.some(agent => agent.id === currentValue)) {
            return currentValue;
          }

          return nextAgents[0]?.id || '';
        });
      },
      error => {
        console.error('Failed to load delivery agents', error);
        setAvailableAgents([]);
        setAgentsError(error.message || 'Unable to load active delivery agents.');
      },
    );

    return () => {
      unsubscribePending();
      unsubscribeKitchen();
      unsubscribeAgents();
    };
  }, []);

  const newOrders = useMemo(
    () => dedupeOrders(pendingOrders),
    [pendingOrders],
  );

  const activeOrders = useMemo(
    () => dedupeOrders(kitchenOrders),
    [kitchenOrders],
  );

  const liveOrders = useMemo(
    () => dedupeOrders([...pendingOrders, ...kitchenOrders]),
    [kitchenOrders, pendingOrders],
  );

  const activeKitchenCount = useMemo(
    () => activeOrders.filter(order => (
      order.status_code === 'ACCEPTED' || order.status_code === 'PREPARING'
    )).length,
    [activeOrders],
  );

  const dispatchCount = useMemo(
    () => activeOrders.filter(order => order.status_code === 'OUT_FOR_DELIVERY').length,
    [activeOrders],
  );

  const ordersError = pendingError || kitchenError || agentsError;
  const serverStatusLabel = ordersError
    ? 'Retrying'
    : isOpen
      ? 'Synced'
      : 'Standby';

  const closeRejectModal = () => {
    setRejectingOrder(null);
    setRejectionReason('');
    setModalError('');
  };

  const closeAssignmentModal = () => {
    setAssignmentOrder(null);
    setSelectedAgentId(availableAgents[0]?.id || '');
    setModalError('');
  };

  const handlePrimaryAction = async (order: Order) => {
    if (order.status_code === 'PREPARING') {
      if (!availableAgents.length) {
        Alert.alert(
          'No Active Agents',
          'No active delivery agent is available right now. Dispatch is blocked until an agent comes online.',
        );
        return;
      }

      setAssignmentOrder(order);
      setSelectedAgentId(order.delivery_agent_id || availableAgents[0]?.id || '');
      setModalError('');
      return;
    }

    setUpdatingOrderId(order.doc_id);

    try {
      if (order.status_code === 'PENDING') {
        await acceptOrder(order);
        return;
      }

      if (order.status_code === 'ACCEPTED') {
        await markPreparing(order);
        return;
      }

      if (order.status_code === 'OUT_FOR_DELIVERY') {
        await markDelivered(order);
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

  const handleRejectConfirm = async () => {
    const order = rejectingOrder;
    if (!order) {
      return;
    }

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setModalError('Rejection reason is required.');
      return;
    }

    setUpdatingOrderId(order.doc_id);
    setModalError('');

    try {
      await rejectOrder(order, trimmedReason);
      closeRejectModal();
    } catch (updateError) {
      setModalError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to reject the order right now.',
      );
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleAssignConfirm = async () => {
    const order = assignmentOrder;
    if (!order) {
      return;
    }

    const selectedAgent = availableAgents.find(agent => agent.id === selectedAgentId) || null;
    if (!selectedAgent) {
      setModalError('Select an active delivery agent before dispatching this order.');
      return;
    }

    setUpdatingOrderId(order.doc_id);
    setModalError('');

    try {
      await markOutForDelivery(order, {
        email: selectedAgent.email,
        id: selectedAgent.id,
        name: selectedAgent.name,
        phone: selectedAgent.phone,
        vehicle_type: selectedAgent.vehicle_type,
      });
      closeAssignmentModal();
    } catch (updateError) {
      setModalError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to assign the delivery agent right now.',
      );
    } finally {
      setUpdatingOrderId('');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContent}>
            <AppHeader
              mode="admin"
              avatarUrl={authPhotoUrl}
              initials={headerInitials}
              title="COFFEE-HUB"
              subtitle="Kitchen pulse"
            />

            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>Live Order Control</Text>
              <Text style={styles.title}>Manage the full order lifecycle in real time.</Text>
              <Text style={styles.subtitle}>
                New customer orders, kitchen progress, delivery assignment, and final completion now stay synced from Firestore without refreshing the app.
              </Text>
            </View>

            <View style={styles.kitchenPulseWrap}>
              <View style={styles.statsGrid}>
                <AdminStatCard
                  label="Pending Orders"
                  value={newOrders.length}
                  detail={`${liveOrders.length} total live orders`}
                  icon="time-outline"
                  tone="warning"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="Kitchen Active"
                  value={activeKitchenCount}
                  detail={`${dispatchCount} dispatched`}
                  icon="cafe-outline"
                  tone="success"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="Delivery Agents"
                  value={availableAgents.length}
                  detail="Available for dispatch"
                  icon="bicycle-outline"
                  tone="warning"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="Server Status"
                  value={serverStatusLabel}
                  detail={isOpen ? 'Store open for orders' : 'Store closed for orders'}
                  icon="hardware-chip-outline"
                  style={styles.halfStat}
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

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>New Orders</Text>
              <Text style={styles.sectionMeta}>
                {newOrders.length ? `${newOrders.length} pending` : 'No pending orders'}
              </Text>
            </View>

            {newOrders.length ? newOrders.map(order => (
              <AdminOrderCard
                key={order.doc_id}
                order={order}
                primaryActionLabel={getPrimaryActionLabel(order, availableAgents.length > 0)}
                onPrimaryAction={() => {
                  void handlePrimaryAction(order);
                }}
                onSecondaryAction={() => {
                  setRejectingOrder(order);
                  setRejectionReason('');
                  setModalError('');
                }}
                secondaryActionLabel="Reject Order"
                secondaryActionTone="danger"
                isUpdating={updatingOrderId === order.doc_id}
              />
            )) : (
              <View style={styles.emptyWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor={getAdminSurfaceColor('card')}
                  style={styles.emptyCard}
                >
                  <Text style={styles.emptyTitle}>No pending orders right now</Text>
                  <Text style={styles.emptyText}>
                    Fresh customer orders will appear here instantly as soon as they are placed.
                  </Text>
                </GlassSurface>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Kitchen & Dispatch</Text>
              <Text style={styles.sectionMeta}>
                {activeOrders.length ? `${activeOrders.length} orders in motion` : 'Queue is clear'}
              </Text>
            </View>

            {activeOrders.length ? activeOrders.map(order => (
              <AdminOrderCard
                key={`active-${order.doc_id}`}
                order={order}
                primaryActionDisabled={order.status_code === 'PREPARING' && availableAgents.length === 0}
                primaryActionLabel={getPrimaryActionLabel(order, availableAgents.length > 0)}
                onPrimaryAction={() => {
                  void handlePrimaryAction(order);
                }}
                isUpdating={updatingOrderId === order.doc_id}
              />
            )) : (
              <View style={styles.emptyWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor={getAdminSurfaceColor('card')}
                  style={styles.emptyCard}
                >
                  <Text style={styles.emptyTitle}>No active kitchen orders</Text>
                  <Text style={styles.emptyText}>
                    Accepted, preparing, and dispatched orders will stay synced in this section.
                  </Text>
                </GlassSurface>
              </View>
            )}
          </View>
        </ScrollView>
      </ScreenTransition>

      <AdminActionModal
        title={rejectingOrder ? `Reject #${rejectingOrder.id}` : 'Reject Order'}
        visible={Boolean(rejectingOrder)}
        onClose={closeRejectModal}
      >
        <Text style={styles.modalBodyText}>
          Rejection reason is required so the customer can see the exact issue instantly in their live order history.
        </Text>
        <TextInput
          value={rejectionReason}
          onChangeText={value => {
            setRejectionReason(value);
            if (modalError) {
              setModalError('');
            }
          }}
          placeholder="Enter rejection reason"
          placeholderTextColor={adminPalette.textMuted}
          multiline
          style={styles.modalInput}
        />
        {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
        <PrimaryButton
          title={updatingOrderId === rejectingOrder?.doc_id ? 'Rejecting...' : 'Reject Order'}
          onPress={() => {
            void handleRejectConfirm();
          }}
          disabled={updatingOrderId === rejectingOrder?.doc_id}
          loading={updatingOrderId === rejectingOrder?.doc_id}
        />
      </AdminActionModal>

      <AdminActionModal
        title={assignmentOrder ? `Dispatch #${assignmentOrder.id}` : 'Assign Delivery Agent'}
        visible={Boolean(assignmentOrder)}
        onClose={closeAssignmentModal}
      >
        <Text style={styles.modalBodyText}>
          Select an active delivery agent before moving this order to out for delivery.
        </Text>
        <View style={styles.agentList}>
          {availableAgents.map(agent => {
            const isSelected = agent.id === selectedAgentId;

            return (
              <ScalePressable
                key={agent.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedAgentId(agent.id);
                  setModalError('');
                }}
                scaleTo={0.98}
                style={styles.agentCardPressable}
              >
                <GlassSurface
                  depth="floating"
                  intensity={58}
                  overlayColor={isSelected ? 'rgba(200, 146, 99, 0.24)' : getAdminSurfaceColor('floating')}
                  style={[styles.agentCard, isSelected ? styles.agentCardSelected : null]}
                >
                  <View style={styles.agentCardCopy}>
                    <Text style={styles.agentName}>{agent.name || agent.id}</Text>
                    <Text style={styles.agentMeta}>
                      {[agent.phone, agent.vehicle_type || 'Vehicle pending'].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={[styles.agentState, isSelected ? styles.agentStateSelected : null]}>
                    {isSelected ? 'Selected' : 'Active'}
                  </Text>
                </GlassSurface>
              </ScalePressable>
            );
          })}
        </View>
        {!availableAgents.length ? (
          <Text style={styles.modalError}>No active delivery agent is available right now.</Text>
        ) : null}
        {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
        <PrimaryButton
          title={updatingOrderId === assignmentOrder?.doc_id ? 'Assigning...' : 'Dispatch Order'}
          onPress={() => {
            void handleAssignConfirm();
          }}
          disabled={!availableAgents.length || updatingOrderId === assignmentOrder?.doc_id}
          loading={updatingOrderId === assignmentOrder?.doc_id}
        />
      </AdminActionModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: adminPalette.background,
  },
  content: {
    gap: 24,
    paddingBottom: 136,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    fontWeight: '900',
    lineHeight: 36,
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
  section: {
    gap: 16,
  },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: adminPalette.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionMeta: {
    color: adminPalette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingBottom: 4,
    textTransform: 'uppercase',
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
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 4, 3, 0.72)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalWrap: {
    width: '100%',
  },
  modalCard: {
    borderRadius: adminRadius.card,
    gap: 16,
    overflow: 'hidden',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    color: adminPalette.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  modalCloseLabel: {
    color: adminPalette.caramelSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBodyText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(242, 231, 225, 0.06)',
    borderColor: adminPalette.ghostStrong,
    borderRadius: adminRadius.control,
    borderWidth: 1,
    color: adminPalette.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 112,
    paddingHorizontal: 14,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  modalError: {
    color: adminPalette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  agentList: {
    gap: 10,
  },
  agentCardPressable: {
    borderRadius: adminRadius.control,
  },
  agentCard: {
    alignItems: 'center',
    borderRadius: adminRadius.control,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  agentCardSelected: {
    backgroundColor: 'rgba(200, 146, 99, 0.18)',
  },
  agentCardCopy: {
    flex: 1,
    gap: 4,
  },
  agentName: {
    color: adminPalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  agentMeta: {
    color: adminPalette.textMuted,
    fontSize: 12,
  },
  agentState: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  agentStateSelected: {
    color: adminPalette.caramelSoft,
  },
});
