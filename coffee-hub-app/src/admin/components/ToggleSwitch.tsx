import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { adminPalette } from '../utils/designSystem';

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
}: ToggleSwitchProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      damping: 18,
      mass: 0.7,
      stiffness: 240,
      toValue: value ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  const thumbTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });

  return (
    <ScalePressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      scaleTo={0.98}
      style={[styles.wrap, disabled ? styles.disabled : null]}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: 54,
    height: 30,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: 'rgba(200, 146, 99, 0.92)',
  },
  trackOff: {
    backgroundColor: adminPalette.ghostStrong,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F9F2EE',
    shadowColor: '#120C0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
});
