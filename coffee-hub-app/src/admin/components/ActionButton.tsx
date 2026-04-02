import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: '#8B5E3C',
  },
  success: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  danger: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
};

const BUTTON_SIZES = {
  small: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 12 },
  medium: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  large: { paddingHorizontal: 20, paddingVertical: 16, fontSize: 16 },
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
}) => {
  const variantStyle = BUTTON_VARIANTS[variant];
  const sizeStyle = BUTTON_SIZES[size];
  const textColor = variant === 'secondary' ? '#8B5E3C' : '#ffffff';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyle,
        sizeStyle,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: sizeStyle.fontSize }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
