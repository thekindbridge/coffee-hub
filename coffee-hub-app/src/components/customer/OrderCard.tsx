import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Order, OrderStatusCode } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { PrimaryButton } from '../ui/PrimaryButton';
import { GlassSurface } from '../ui/GlassSurface';
import { getCustomerPalette } from './designSystem';
import { StatusBadge } from './StatusBadge';

type OrderCardProps = {
  order: Order;
  onTrack?: () => void;
};

const ORDER_STEPS = ['Placed', 'Brewing', 'Courier', 'Arrived'] as const;
const STEP_NOTES = [
  'We locked in your coffee ritual and sent it to the bar.',
  'Your order is on the grinder, pour-over, and plating line.',
  'A delivery partner is carrying it through the final stretch.',
  'Your order reached the destination and the session is complete.',
] as const;

const getHeadline = (order: Order) => {
  if (order.items?.[0]?.name) {
    return order.items.length > 1
      ? `${order.items[0].name} +${order.items.length - 1} more`
      : order.items[0].name;
  }

  return 'COFFEE-HUB order';
};

const getStepIndex = (status: OrderStatusCode) => {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'ACCEPTED':
    case 'PREPARING':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    case 'REJECTED':
    case 'CANCELLED':
    default:
      return 0;
  }
};

const getStatusTone = (status: OrderStatusCode) => {
  switch (status) {
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
  const stepIndex = getStepIndex(order.status_code);
  const isDeliveryTrackable = order.status_code === 'OUT_FOR_DELIVERY' && typeof onTrack === 'function';
  const dotScale = useRef(ORDER_STEPS.map(() => new Animated.Value(0.86))).current;
  const dotOpacity = useRef(ORDER_STEPS.map(() => new Animated.Value(0.42))).current;
  const lineFill = useRef(ORDER_STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;
  const activePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = ORDER_STEPS.flatMap((_, index) => {
      const isComplete = index <= stepIndex;
      const isCurrent = index === stepIndex;
      const stepAnimations: Animated.CompositeAnimation[] = [
        Animated.parallel([
          Animated.spring(dotScale[index], {
            damping: 17,
            mass: 0.7,
            stiffness: 260,
            toValue: isComplete ? (isCurrent ? 1.08 : 1) : 0.86,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity[index], {
            duration: 220,
            toValue: isComplete ? 1 : 0.42,
            useNativeDriver: true,
          }),
        ]),
      ];

      if (index < lineFill.length) {
        stepAnimations.push(
          Animated.timing(lineFill[index], {
            duration: 260,
            toValue: index < stepIndex ? 1 : 0,
            useNativeDriver: false,
          }),
        );
      }

      return stepAnimations;
    });

    Animated.stagger(85, animations).start();
  }, [dotOpacity, dotScale, lineFill, stepIndex]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, {
          duration: 900,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(activePulse, {
          duration: 900,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    if (order.status_code !== 'DELIVERED' && order.status_code !== 'REJECTED' && order.status_code !== 'CANCELLED') {
      pulseLoop.start();
    }

    return () => {
      pulseLoop.stop();
      activePulse.stopAnimation();
    };
  }, [activePulse, order.status_code]);

  const activePulseScale = activePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const activePulseOpacity = activePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0],
  });

  return (
    <GlassSurface depth="card" intensity={52} overlayColor={palette.surfaceGlass} style={[styles.card, theme.shadows.soft]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.orderEyebrow}>Order #{order.id}</Text>
          <Text style={styles.orderTitle}>{getHeadline(order)}</Text>
          <Text style={styles.orderMeta}>{formatOrderDate(order.created_at)}</Text>
        </View>
        <StatusBadge label={order.status} tone={getStatusTone(order.status_code)} />
      </View>

      <View style={styles.itemsWrap}>
        {(order.items?.length ?? 0) > 0 ? (
          order.items!.slice(0, 3).map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{item.name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.itemPlaceholder}>Item details will appear once the order syncs.</Text>
        )}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(order.total_amount || order.final_total || 0)}
        </Text>
      </View>

      {(order.status_code === 'REJECTED' || order.status_code === 'CANCELLED') && (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={palette.danger} />
          <Text style={styles.noticeText}>
            {order.rejection_reason || order.cancellation_reason || 'This order is no longer active.'}
          </Text>
        </View>
      )}

      {order.status_code !== 'REJECTED' && order.status_code !== 'CANCELLED' ? (
        <View style={styles.progressWrap}>
          {ORDER_STEPS.map((step, index) => {
            const isComplete = index <= stepIndex;
            const isCurrent = index === stepIndex;
            const isLast = index === ORDER_STEPS.length - 1;
            const animatedLineHeight = index < lineFill.length
              ? lineFill[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 34],
              })
              : 0;

            return (
              <View key={step} style={styles.progressStep}>
                <View style={styles.progressRail}>
                  <Animated.View
                    style={[
                      styles.progressDotWrap,
                      isCurrent ? styles.progressDotWrapCurrent : null,
                      {
                        opacity: dotOpacity[index],
                        transform: [{ scale: dotScale[index] }],
                      },
                    ]}
                  >
                    {isCurrent ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.progressPulse,
                          {
                            opacity: activePulseOpacity,
                            transform: [{ scale: activePulseScale }],
                          },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.progressDot,
                        isComplete ? styles.progressDotActive : null,
                        isCurrent ? styles.progressDotCurrent : null,
                      ]}
                    />
                  </Animated.View>
                  {!isLast ? (
                    <View style={styles.progressLineTrack}>
                      <Animated.View
                        style={[
                          styles.progressLineFill,
                          index < stepIndex ? styles.progressLineFillActive : null,
                          { height: animatedLineHeight },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.progressCopy}>
                  <Text style={[styles.progressLabel, isComplete ? styles.progressLabelActive : null]}>
                    {step}
                  </Text>
                  <Text style={[styles.progressNote, isComplete ? styles.progressNoteActive : null]}>
                    {STEP_NOTES[index]}
                  </Text>
                </View>

                {isCurrent ? (
                  <View style={styles.progressLivePill}>
                    <Text style={styles.progressLiveText}>Live</Text>
                  </View>
                ) : (
                  <View style={styles.progressGhostSpacer} />
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {order.status_code !== 'DELIVERED' ? (
        <PrimaryButton
          title="Track Live Location"
          onPress={() => {
            if (onTrack) {
              onTrack();
            }
          }}
          disabled={!isDeliveryTrackable}
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
      borderRadius: theme.radius.hero,
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
    },
    orderEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    orderTitle: {
      marginTop: 6,
      fontSize: 20,
      fontWeight: '900',
      color: palette.text,
    },
    orderMeta: {
      marginTop: 4,
      fontSize: theme.typography.caption,
      color: palette.textMuted,
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
    itemLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      color: palette.textSoft,
    },
    itemQuantity: {
      fontSize: theme.typography.body,
      fontWeight: '700',
      color: palette.textMuted,
    },
    itemPlaceholder: {
      fontSize: theme.typography.body,
      color: palette.textMuted,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    totalLabel: {
      fontSize: theme.typography.body,
      color: palette.textMuted,
    },
    totalValue: {
      fontSize: 21,
      fontWeight: '900',
      color: palette.caramel,
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
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.danger,
    },
    progressWrap: {
      gap: theme.spacing.sm,
    },
    progressStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    progressRail: {
      alignItems: 'center',
      width: 20,
    },
    progressDotWrap: {
      position: 'relative',
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressDotWrapCurrent: {
      shadowColor: palette.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: theme.isDark ? 0.36 : 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    progressPulse: {
      position: 'absolute',
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(227, 191, 127, 0.28)',
    },
    progressDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.ghost,
    },
    progressDotActive: {
      backgroundColor: palette.blush,
    },
    progressDotCurrent: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.gold,
    },
    progressLineTrack: {
      width: 2,
      height: 34,
      marginTop: 6,
      borderRadius: 1,
      overflow: 'hidden',
      backgroundColor: palette.outlineGhost,
    },
    progressLineFill: {
      width: 2,
      height: 0,
      borderRadius: 1,
      backgroundColor: 'rgba(232, 188, 183, 0.48)',
    },
    progressLineFillActive: {
      backgroundColor: palette.blush,
    },
    progressCopy: {
      flex: 1,
      paddingBottom: 4,
    },
    progressLabel: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.textMuted,
    },
    progressLabelActive: {
      color: palette.text,
    },
    progressNote: {
      marginTop: 4,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: palette.textMuted,
    },
    progressNoteActive: {
      color: palette.textSoft,
    },
    progressLivePill: {
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(227, 191, 127, 0.16)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    progressLiveText: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.gold,
    },
    progressGhostSpacer: {
      width: 40,
    },
    trackButton: {
      marginTop: theme.spacing.xs,
    },
  });
};
