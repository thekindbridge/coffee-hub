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
  LayoutAnimation.configureNext({
    duration: 260,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
};

export function usePressScale(scaleTo = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateTo = (nextScale: number, nextOpacity: number, nextTranslateY: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        damping: 18,
        mass: 0.7,
        stiffness: 280,
        toValue: nextScale,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
        toValue: nextOpacity,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
        toValue: nextTranslateY,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    animatedStyle: {
      opacity,
      transform: [{ scale }, { translateY }],
    },
    onPressIn: () => animateTo(scaleTo, 0.98, 1),
    onPressOut: () => animateTo(1, 1, 0),
  };
}

export function useFadeIn(distance = 12) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [distance, opacity, scale, translateY]);

  return {
    opacity,
    transform: [{ translateY }, { scale }],
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
