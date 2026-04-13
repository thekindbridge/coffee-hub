import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  getOrderStatusLabel,
  isTerminalOrderStatus,
  normalizeOrderStatusCode,
} from '../../shared/orderStatus';
import { PrimaryButton } from '../ui/PrimaryButton';
import { GlassSurface } from '../ui/GlassSurface';
import { getCustomerPalette } from './designSystem';
import { StatusBadge } from './StatusBadge';

type OrderCardProps = {
  order: Order;
  onTrack?: () => void;
};

const ORDER_STEPS = ['Placed', 'Brewing', 'Out', 'Delivered'] as const;

const getHeadline = (order: Order) => {
  if (order.items?.[0]?.name) {
    return order.items.length > 1
      ? `${order.items[0].name} +${order.items.length - 1} more`
      : order.items[0].name;
  }

  return 'COFFEE-HUB order';
};

const getStepIndex = (status: string) => {
  const normalizedStatus = normalizeOrderStatusCode(status);

  switch (normalizedStatus) {
    case 'PENDING':
      return 0;
    case 'ACCEPTED':
    case 'PREPARING':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
};

const getStatusTone = (status: string) => {
  const normalizedStatus = normalizeOrderStatusCode(status);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'pending' as const;
    case 'ACCEPTED':
    case 'PREPARING':
      return 'progress' as const;
    case 'OUT_FOR_DELIVERY':
      return 'delivery' as const;
    case 'DELIVERED':
      return 'success' as const;
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
};

const getStageMessage = (status: string) => {
  const normalizedStatus = normalizeOrderStatusCode(status);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'Waiting for cafe confirmation';
    case 'ACCEPTED':
    case 'PREPARING':
      return 'Baristas are preparing your order';
    case 'OUT_FOR_DELIVERY':
      return 'Your order is on the way';
    case 'DELIVERED':
      return 'Delivered successfully';
    case 'REJECTED':
      return 'This order was rejected';
    case 'CANCELLED':
      return 'This order was cancelled';
    default:
      return 'Tracking your order';
  }
};

const formatOrderDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown time';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function OrderCard({
  order,
  onTrack,
}: OrderCardProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const normalizedStatus = normalizeOrderStatusCode(order.status_code);
  const stepIndex = getStepIndex(normalizedStatus);
  const isTerminal = isTerminalOrderStatus(normalizedStatus);
  const totalAmount = order.total_amount || order.final_total || 0;
  const canTrack = normalizedStatus === 'OUT_FOR_DELIVERY' && typeof onTrack === 'function';
  const visibleItems = order.items?.slice(0, 2) ?? [];
  const hiddenItemCount = Math.max((order.items?.length ?? 0) - visibleItems.length, 0);
  const cancellationReason = order.rejection_reason || order.cancellation_reason || 'This order is no longer active.';

  return (
    <GlassSurface
      depth="card"
      intensity={52}
      overlayColor={palette.surfaceGlass}
      style={[styles.card, theme.shadows.soft]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.orderEyebrow}>Order #{order.id}</Text>
          <Text style={styles.orderTitle}>{getHeadline(order)}</Text>
          <Text style={styles.orderMeta}>{formatOrderDate(order.created_at)}</Text>
        </View>
        <StatusBadge
          label={getOrderStatusLabel(normalizedStatus)}
          tone={getStatusTone(normalizedStatus)}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>{order.items?.length ?? 0}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>Stage</Text>
          <Text style={styles.summaryValue}>{getStageMessage(normalizedStatus)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {visibleItems.length > 0 ? (
        <View style={styles.itemsWrap}>
          {visibleItems.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>x{item.quantity}</Text>
            </View>
          ))}

          {hiddenItemCount > 0 ? (
            <Text style={styles.moreItemsText}>+{hiddenItemCount} more item{hiddenItemCount === 1 ? '' : 's'}</Text>
          ) : null}
        </View>
      ) : null}

      {!isTerminal ? (
        <View style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            {ORDER_STEPS.map((step, index) => {
              const isComplete = index <= stepIndex;
              const isCurrent = index === stepIndex;

              return (
                <View key={step} style={styles.timelineStep}>
                  {index < ORDER_STEPS.length - 1 ? (
                    <View style={styles.connectorTrack}>
                      <View
                        style={[
                          styles.connectorFill,
                          index < stepIndex ? styles.connectorFillActive : null,
                        ]}
                      />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.timelineDot,
                      isComplete ? styles.timelineDotComplete : null,
                      isCurrent ? styles.timelineDotCurrent : null,
                    ]}
                  />
                  <Text
                    style={[
                      styles.timelineLabel,
                      isComplete ? styles.timelineLabelActive : null,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={palette.danger} />
          <Text style={styles.noticeText}>{cancellationReason}</Text>
        </View>
      )}

      {canTrack ? (
        <PrimaryButton
          title="Track Live Location"
          onPress={() => {
            if (onTrack) {
              onTrack();
            }
          }}
          style={styles.trackButton}
          variant="secondary"
        />
      ) : null}
    </GlassSurface>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    orderEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    orderTitle: {
      fontSize: 21,
      lineHeight: 25,
      fontWeight: '900',
      color: palette.text,
    },
    orderMeta: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: theme.radius.lg,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    summaryCopy: {
      flex: 1,
      gap: 4,
    },
    summaryDivider: {
      width: 1,
      marginHorizontal: theme.spacing.sm,
      backgroundColor: palette.outlineGhost,
    },
    summaryLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    summaryValue: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
      color: palette.text,
    },
    itemsWrap: {
      gap: 8,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    itemName: {
      flex: 1,
      fontSize: 15,
      color: palette.textSoft,
    },
    itemMeta: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.textMuted,
    },
    moreItemsText: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    timelineCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    timelineStep: {
      flex: 1,
      alignItems: 'center',
      position: 'relative',
      gap: 10,
    },
    connectorTrack: {
      position: 'absolute',
      top: 5,
      left: '50%',
      width: '100%',
      height: 2,
      backgroundColor: palette.outlineGhost,
    },
    connectorFill: {
      width: '100%',
      height: 2,
      backgroundColor: palette.outlineGhost,
    },
    connectorFillActive: {
      backgroundColor: palette.blush,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.outlineGhost,
      zIndex: 1,
    },
    timelineDotComplete: {
      backgroundColor: palette.blush,
    },
    timelineDotCurrent: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: palette.gold,
    },
    timelineLabel: {
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
      color: palette.textMuted,
    },
    timelineLabelActive: {
      color: palette.text,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: theme.radius.lg,
      backgroundColor: palette.dangerSurface,
      padding: theme.spacing.md,
    },
    noticeText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: palette.danger,
    },
    trackButton: {
      marginTop: theme.spacing.xs,
    },
  });
};
