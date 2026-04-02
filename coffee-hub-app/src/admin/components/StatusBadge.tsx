import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: 'small' | 'medium' | 'large';
}

const STATUS_COLORS: Record<string, string> = {
  'Pending': '#FFA500',
  'Accepted': '#4CAF50',
  'Preparing': '#2196F3',
  'Out for Delivery': '#FF9800',
  'Delivered': '#4CAF50',
  'Rejected': '#F44336',
  'Cancelled': '#F44336',
};

const STATUS_SIZES = {
  small: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 4 },
  medium: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6 },
  large: { fontSize: 14, paddingHorizontal: 16, paddingVertical: 8 },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const color = STATUS_COLORS[status] || '#666';
  const sizeStyle = STATUS_SIZES[size];

  return (
    <View style={[styles.badge, { backgroundColor: color }, sizeStyle]}>
      <Text style={[styles.text, { fontSize: sizeStyle.fontSize }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
