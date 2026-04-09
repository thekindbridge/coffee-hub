import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../theme';
import { getCustomerPalette } from '../customer/designSystem';
import { GlassSurface } from './GlassSurface';
import { ScalePressable } from './ScalePressable';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const primarySheen: readonly [string, string, string] = theme.isDark
    ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0.06)']
    : ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)'];

  return (
    <ScalePressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.button,
        isPrimary ? theme.shadows.card : null,
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={(disabled || loading) ? palette.ctaGradientDisabled : palette.ctaGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryBackground}
        >
          <LinearGradient
            colors={primarySheen}
            locations={[0, 0.42, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primarySheen}
          />
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={palette.background} size="small" />
            ) : icon ? (
              <View style={styles.icon}>{icon}</View>
            ) : null}

            <Text style={[styles.title, styles.primaryTitle]}>{title}</Text>
          </View>
        </LinearGradient>
      ) : (
        <GlassSurface
          depth={isSecondary ? 'floating' : 'card'}
          intensity={56}
          overlayColor={isSecondary ? palette.surfaceGlassStrong : palette.surfaceGlass}
          style={[
            styles.secondaryBackground,
            isSecondary ? styles.secondaryButton : styles.ghostButton,
          ]}
        >
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator
                color={isSecondary ? palette.text : palette.caramel}
                size="small"
              />
            ) : icon ? (
              <View style={styles.icon}>{icon}</View>
            ) : null}

            <Text
              style={[
                styles.title,
                isSecondary ? styles.secondaryTitle : styles.ghostTitle,
              ]}
            >
              {title}
            </Text>
          </View>
        </GlassSurface>
      )}
    </ScalePressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    button: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    primaryBackground: {
      minHeight: 56,
      position: 'relative',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    primarySheen: {
      ...StyleSheet.absoluteFillObject,
    },
    secondaryBackground: {
      minHeight: 56,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    secondaryButton: {
      backgroundColor: palette.surfaceGlassStrong,
    },
    ghostButton: {
      backgroundColor: palette.surfaceGlass,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      zIndex: 1,
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    primaryTitle: {
      color: palette.background,
    },
    secondaryTitle: {
      color: palette.text,
    },
    ghostTitle: {
      color: palette.caramel,
    },
    disabled: {
      opacity: 0.56,
    },
  });
};
