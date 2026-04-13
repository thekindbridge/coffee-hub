import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { ScalePressable } from '../ui/ScalePressable';
import { getDeliveryPalette } from './designSystem';

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
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);

  return (
    <View style={[styles.container, { backgroundColor: palette.cardMuted, borderColor: palette.divider }]}>
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
            style={styles.option}
          >
            {isActive ? (
              <LinearGradient
                colors={palette.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activePill}
              >
                <Text style={[styles.label, { color: palette.background }]}>
                  {option.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={[styles.label, { color: palette.text }]}>
                  {option.label}
                </Text>
              </View>
            )}
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 6,
  },
  option: {
    flex: 1,
  },
  activePill: {
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inactivePill: {
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
});
