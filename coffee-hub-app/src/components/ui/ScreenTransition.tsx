import type { PropsWithChildren } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useFadeIn } from '../../theme';

type ScreenTransitionProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function ScreenTransition({ children, style }: ScreenTransitionProps) {
  const animatedStyle = useFadeIn();

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
