import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

let hasEnabledLayoutAnimation = false;

const ensureLayoutAnimationEnabled = () => {
  if (
    Platform.OS === 'android' &&
    !hasEnabledLayoutAnimation &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
    hasEnabledLayoutAnimation = true;
  }
};

export const animateLayout = () => {
  ensureLayoutAnimationEnabled();
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export function usePressScale(scaleTo = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (nextValue: number) => {
    Animated.spring(scale, {
      bounciness: 6,
      speed: 22,
      toValue: nextValue,
      useNativeDriver: true,
    }).start();
  };

  return {
    animatedStyle: {
      transform: [{ scale }],
    },
    onPressIn: () => animateTo(scaleTo),
    onPressOut: () => animateTo(1),
  };
}

export function useFadeIn(distance = 12) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [distance, opacity, translateY]);

  return {
    opacity,
    transform: [{ translateY }],
  };
}

export function usePulseOnChange(value: number | string, scaleTo = 1.04) {
  const scale = useRef(new Animated.Value(1)).current;
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }

    previousValue.current = value;

    Animated.sequence([
      Animated.spring(scale, {
        bounciness: 10,
        speed: 20,
        toValue: scaleTo,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        bounciness: 8,
        speed: 20,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, scaleTo, value]);

  return {
    transform: [{ scale }],
  };
}
