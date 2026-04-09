import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { getCustomerPalette } from '../customer/designSystem';

type GlassSurfaceProps = PropsWithChildren<{
  depth?: 'section' | 'card' | 'floating';
  intensity?: number;
  overlayColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

const getHighlightColors = (isDark: boolean): readonly [string, string, string] => (
  isDark
    ? ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0.08)']
    : ['rgba(255, 255, 255, 0.34)', 'rgba(255, 255, 255, 0.12)', 'rgba(75, 46, 43, 0.04)']
);

export function GlassSurface({
  children,
  depth = 'card',
  intensity,
  overlayColor,
  style,
}: GlassSurfaceProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const resolvedOverlayColor = overlayColor ?? (
    depth === 'floating'
      ? palette.surfaceGlassStrong
      : depth === 'section'
        ? palette.surfaceGlass
        : theme.isDark
          ? 'rgba(61, 47, 43, 0.6)'
          : 'rgba(255, 249, 244, 0.6)'
  );
  const resolvedIntensity = intensity ?? (
    depth === 'floating'
      ? 84
      : depth === 'section'
        ? 52
        : 64
  );

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: resolvedOverlayColor,
        },
        style,
      ]}
    >
      <BlurView
        tint={theme.isDark ? 'dark' : 'light'}
        intensity={Platform.OS === 'android' ? Math.max(44, resolvedIntensity - 12) : resolvedIntensity}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          { backgroundColor: resolvedOverlayColor },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={getHighlightColors(theme.isDark)}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    opacity: 0.82,
  },
});
