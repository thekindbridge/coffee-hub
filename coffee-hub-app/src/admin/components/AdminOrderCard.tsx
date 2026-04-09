import React, { useState } from 'react';
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
import { useFadeIn } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  canCancelAdminOrder,
  canNotifyAdminOrder,
  getAdminOrderStage,
  getAdminOrderStageOptions,
  getAdminStatusTone,
  getAdminSurfaceColor,
  type AdminOrderStage,
} from '../utils/designSystem';
import type { Order } from '../types';

type AdminOrderCardProps = {
  order: Order;
  selectedStage: AdminOrderStage;
  onStageChange: (stage: AdminOrderStage) => void;
  onUpdate: () => void;
  onCancel: () => void;
  onNotify: () => void;
  isUpdating?: boolean;
};

type SecondaryActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
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
}: SecondaryActionProps) {
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
  order,
  selectedStage,
  onStageChange,
  onUpdate,
  onCancel,
  onNotify,
  isUpdating = false,
}: AdminOrderCardProps) {
  const animatedStyle = useFadeIn();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const stageOptions = getAdminOrderStageOptions(order.status_code);
  const statusTone = getAdminStatusTone(order.status_code);
  const canCancel = canCancelAdminOrder(order.status_code);
  const canNotify = canNotifyAdminOrder(order.status_code);
  const currentStage = getAdminOrderStage(order.status_code);

  const toggleDropdown = () => {
    if (stageOptions.length <= 1) {
      return;
    }

    setIsDropdownOpen(current => !current);
  };

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
                #{order.id} · {formatOrderTime(order.created_at)}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <SharedStatusBadge label={currentStage} tone={statusTone} />
              <Text style={styles.total}>{formatCurrency(order.total_amount)}</Text>
            </View>
          </View>

          <View style={styles.itemsWrap}>
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

          <View style={styles.stageWrap}>
            <Text style={styles.sectionLabel}>Kitchen stage</Text>
            <ScalePressable
              accessibilityRole="button"
              disabled={stageOptions.length <= 1}
              onPress={toggleDropdown}
              scaleTo={0.98}
              style={styles.dropdownWrap}
            >
              <GlassSurface
                depth="floating"
                intensity={60}
                overlayColor={getAdminSurfaceColor('floating')}
                style={styles.dropdown}
              >
                <View>
                  <Text style={styles.dropdownValue}>{selectedStage}</Text>
                  <Text style={styles.dropdownHint}>
                    {stageOptions.length > 1
                      ? 'Select the next visible stage'
                      : 'No alternate stage available'}
                  </Text>
                </View>

                <Ionicons
                  color={adminPalette.textMuted}
                  name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                />
              </GlassSurface>
            </ScalePressable>

            {isDropdownOpen ? (
              <View style={styles.optionWrap}>
                {stageOptions.map(option => {
                  const isActive = option === selectedStage;

                  return (
                    <ScalePressable
                      key={`${order.doc_id}-${option}`}
                      accessibilityRole="button"
                      onPress={() => {
                        onStageChange(option);
                        setIsDropdownOpen(false);
                      }}
                      scaleTo={0.98}
                      style={styles.optionPressable}
                    >
                      <GlassSurface
                        depth="floating"
                        intensity={58}
                        overlayColor={isActive ? 'rgba(200, 146, 99, 0.24)' : getAdminSurfaceColor('floating')}
                        style={[styles.optionCard, isActive ? styles.optionCardActive : null]}
                      >
                        <Text style={[styles.optionLabel, isActive ? styles.optionLabelActive : null]}>
                          {option}
                        </Text>
                      </GlassSurface>
                    </ScalePressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.actionsColumn}>
            <PrimaryButton
              title={isUpdating ? 'Updating...' : 'Update'}
              onPress={onUpdate}
              loading={isUpdating}
              disabled={isUpdating}
              style={styles.updateButton}
            />

            {(canCancel || canNotify) ? (
              <View style={styles.secondaryRow}>
                {canCancel ? (
                  <SecondaryAction
                    icon="close-outline"
                    label="Cancel"
                    tone="danger"
                    onPress={onCancel}
                  />
                ) : null}
                {canNotify ? (
                  <SecondaryAction
                    icon="notifications-outline"
                    label="Notify Customer"
                    onPress={onNotify}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
  },
  customerName: {
    color: adminPalette.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  orderMeta: {
    marginTop: 6,
    color: adminPalette.textMuted,
    fontSize: 13,
    fontWeight: '600',
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
  itemsWrap: {
    gap: 8,
  },
  sectionLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  itemLine: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  stageWrap: {
    gap: 10,
  },
  dropdownWrap: {
    borderRadius: adminRadius.control,
  },
  dropdown: {
    borderRadius: adminRadius.control,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  dropdownValue: {
    color: adminPalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownHint: {
    marginTop: 4,
    color: adminPalette.textMuted,
    fontSize: 12,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionPressable: {
    borderRadius: adminRadius.pill,
  },
  optionCard: {
    borderRadius: adminRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionCardActive: {
    backgroundColor: 'rgba(200, 146, 99, 0.18)',
  },
  optionLabel: {
    color: adminPalette.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  optionLabelActive: {
    color: adminPalette.caramelSoft,
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
    flex: 1,
    borderRadius: adminRadius.pill,
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: adminRadius.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
