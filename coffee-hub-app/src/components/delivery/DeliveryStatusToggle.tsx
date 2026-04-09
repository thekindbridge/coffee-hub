import { StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '../ui/ScalePressable';
import { useTheme, useThemedStyles } from '../../theme';

type DeliveryStatusToggleOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type DeliveryStatusToggleProps<TValue extends string> = {
  onChange: (value: TValue) => void;
  options: DeliveryStatusToggleOption<TValue>[];
  value: TValue;
};

export function DeliveryStatusToggle<TValue extends string>({
  onChange,
  options,
  value,
}: DeliveryStatusToggleProps<TValue>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {options.map(option => {
        const isActive = option.value === value;

        return (
          <ScalePressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => {
              onChange(option.value);
            }}
            scaleTo={0.97}
            style={[styles.option, isActive ? styles.optionActive : null]}
          >
            <Text style={[styles.optionLabel, isActive ? styles.optionLabelActive : null]}>
              {option.label}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  optionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionLabel: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  optionLabelActive: {
    color: theme.colors.onPrimary,
  },
});
