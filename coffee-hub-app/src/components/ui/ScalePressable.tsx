import type { ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { usePressScale } from '../../theme';

type ScalePressableProps = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export function ScalePressable({
  children,
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  ...props
}: ScalePressableProps) {
  const { animatedStyle, onPressIn: handlePressIn, onPressOut: handlePressOut } = usePressScale(scaleTo);

  return (
    <Pressable
      {...props}
      onPressIn={event => {
        handlePressIn();
        onPressIn?.(event);
      }}
      onPressOut={event => {
        handlePressOut();
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
