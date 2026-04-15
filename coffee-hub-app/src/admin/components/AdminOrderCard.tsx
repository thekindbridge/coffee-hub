import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge as SharedStatusBadge } from '../../components/customer/StatusBadge';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import {
  getOrderStatusCustomerCopy,
  getOrderStatusLabel,
} from '../../shared/orderStatus';
import { useFadeIn } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminStatusTone,
  getAdminSurfaceColor,
} from '../utils/designSystem';
import type { Order } from '../types';

type AdminOrderCardProps = {
  isUpdating?: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  order: Order;
  primaryActionDisabled?: boolean;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  secondaryActionTone?: 'default' | 'danger';
};

const formatOrderTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
};

function SecondaryAction({
  icon,
  label,
  tone = 'default',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const isDanger = tone === 'danger';

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.97}
      style={styles.secondaryActionWrap}
    >
      <GlassSurface
        depth="floating"
        intensity={60}
        overlayColor={isDanger ? 'rgba(225, 161, 141, 0.14)' : getAdminSurfaceColor('floating')}
        style={styles.secondaryAction}
      >
        <Ionicons
          color={isDanger ? adminPalette.danger : adminPalette.text}
          name={icon}
          size={16}
        />
        <Text style={[styles.secondaryActionLabel, isDanger ? styles.secondaryActionLabelDanger : null]}>
          {label}
        </Text>
      </GlassSurface>
    </ScalePressable>
  );
}

export function AdminOrderCard({
  isUpdating = false,
  onPrimaryAction,
  onSecondaryAction,
  order,
  primaryActionDisabled = false,
  primaryActionLabel,
  secondaryActionLabel,
  secondaryActionTone = 'default',
}: AdminOrderCardProps) {
  const animatedStyle = useFadeIn();
  const statusLabel = getOrderStatusLabel(order.status_code);
  const statusTone = getAdminStatusTone(order.status_code);
  const hasAssignedAgent = Boolean(order.delivery_agent_name || order.delivery_agent_id);
  const stageSummary = getOrderStatusCustomerCopy(order.status_code);
  const rejectionReason = order.rejection_reason?.trim();

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.shadowWrap}>
        <GlassSurface
          depth="card"
          intensity={70}
          overlayColor={getAdminSurfaceColor('card')}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={styles.customerName}>
                {order.customer_name || 'Walk-in Customer'}
              </Text>
              <Text style={styles.orderMeta}>
                #{order.id} · {formatOrderTime(order.timestamps.createdAt || order.created_at)}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <SharedStatusBadge label={statusLabel} tone={statusTone} />
              <Text style={styles.total}>{formatCurrency(order.total_amount)}</Text>
            </View>
          </View>

          <View style={styles.summaryStrip}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Lifecycle</Text>
              <Text style={styles.summaryValue}>{stageSummary}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{order.items?.length ?? 0}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Phone</Text>
              <Text numberOfLines={1} style={styles.summaryValue}>{order.phone || 'Not shared'}</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {order.address || 'Address is still syncing from Firestore.'}
            </Text>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>Items</Text>
            {order.items?.length ? (
              order.items.map(item => (
                <Text key={item.id} style={styles.itemLine}>
                  {item.name} x{item.quantity}
                </Text>
              ))
            ) : (
              <Text style={styles.itemLine}>Order items are syncing.</Text>
            )}
          </View>

          {hasAssignedAgent ? (
            <View style={styles.assignmentCard}>
              <View style={styles.assignmentHeader}>
                <Ionicons color={adminPalette.caramelSoft} name="bicycle-outline" size={16} />
                <Text style={styles.assignmentLabel}>Assigned Delivery Agent</Text>
              </View>
              <Text style={styles.assignmentValue}>
                {order.delivery_agent_name || order.delivery_agent_id}
              </Text>
              <Text style={styles.assignmentMeta}>
                {order.delivery_agent_phone || order.delivery_agent_vehicle || 'Dispatch ready'}
              </Text>
            </View>
          ) : null}

          {rejectionReason ? (
            <View style={styles.noticeCard}>
              <Ionicons color={adminPalette.danger} name="alert-circle-outline" size={16} />
              <Text style={styles.noticeText}>{rejectionReason}</Text>
            </View>
          ) : null}

          {(primaryActionLabel || secondaryActionLabel) ? (
            <View style={styles.actionsColumn}>
              {primaryActionLabel && onPrimaryAction ? (
                <PrimaryButton
                  title={isUpdating ? 'Updating...' : primaryActionLabel}
                  onPress={onPrimaryAction}
                  loading={isUpdating}
                  disabled={isUpdating || primaryActionDisabled}
                  style={styles.updateButton}
                />
              ) : null}

              {secondaryActionLabel && onSecondaryAction ? (
                <View style={styles.secondaryRow}>
                  <SecondaryAction
                    icon={secondaryActionTone === 'danger' ? 'close-outline' : 'ellipsis-horizontal-outline'}
                    label={secondaryActionLabel}
                    tone={secondaryActionTone}
                    onPress={onSecondaryAction}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </GlassSurface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  card: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 16,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  customerName: {
    color: adminPalette.text,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  orderMeta: {
    color: adminPalette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  total: {
    color: adminPalette.caramelSoft,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryStrip: {
    alignItems: 'stretch',
    backgroundColor: 'rgba(242, 231, 225, 0.04)',
    borderRadius: adminRadius.control,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryBlock: {
    flex: 1,
    gap: 4,
  },
  summaryDivider: {
    backgroundColor: adminPalette.ghostStrong,
    marginHorizontal: 10,
    width: 1,
  },
  summaryLabel: {
    color: adminPalette.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: adminPalette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  detailsSection: {
    gap: 8,
  },
  sectionLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  itemLine: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  assignmentCard: {
    backgroundColor: 'rgba(200, 146, 99, 0.12)',
    borderRadius: adminRadius.control,
    gap: 6,
    padding: 14,
  },
  assignmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  assignmentLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  assignmentValue: {
    color: adminPalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  assignmentMeta: {
    color: adminPalette.textSoft,
    fontSize: 13,
  },
  noticeCard: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.dangerSurface,
    borderRadius: adminRadius.control,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  noticeText: {
    color: adminPalette.danger,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsColumn: {
    gap: 10,
  },
  updateButton: {
    minHeight: 48,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionWrap: {
    borderRadius: adminRadius.pill,
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: adminRadius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryActionLabel: {
    color: adminPalette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryActionLabelDanger: {
    color: adminPalette.danger,
  },
});
