import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { getDeliveryPalette } from './designSystem';

type DeliveryMapBackdropProps = {
  badgeLabel?: string;
  badgeTitle?: string;
  compact?: boolean;
  variant?: 'city' | 'world';
};

export function DeliveryMapBackdrop({
  badgeLabel,
  badgeTitle,
  compact = false,
  variant = 'city',
}: DeliveryMapBackdropProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.shell, compact ? styles.shellCompact : null]}>
      <LinearGradient
        colors={variant === 'world'
          ? ['#0B5969', '#09333E', '#120C0A']
          : palette.mapGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {variant === 'world' ? (
        <>
          <View style={[styles.continent, styles.continentNorthAmerica]} />
          <View style={[styles.continent, styles.continentEurope]} />
          <View style={[styles.continent, styles.continentAsia]} />
          <View style={[styles.continent, styles.continentAustralia]} />
        </>
      ) : (
        <>
          <View style={[styles.street, styles.streetOne]} />
          <View style={[styles.street, styles.streetTwo]} />
          <View style={[styles.street, styles.streetThree]} />
          <View style={[styles.street, styles.streetFour]} />
          <View style={[styles.street, styles.streetFive]} />
          <View style={[styles.path, compact ? styles.pathCompact : null]} />
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.marker,
                compact ? styles.markerCompact : null,
                index === 0 ? styles.markerOne : null,
                index === 1 ? styles.markerTwo : null,
                index === 2 ? (compact ? styles.markerThreeCompact : styles.markerThree) : null,
                index === 3 ? styles.markerFour : null,
                index === 4 ? styles.markerFive : null,
              ]}
            >
              <Ionicons
                color={palette.text}
                name={index === 2 ? 'bicycle' : 'receipt-outline'}
                size={compact ? 11 : 13}
              />
            </View>
          ))}
        </>
      )}

      {badgeLabel || badgeTitle ? (
        <View style={styles.badge}>
          <View style={[styles.badgeIconWrap, compact ? styles.badgeIconWrapCompact : null]}>
            <Ionicons name="bicycle" size={compact ? 16 : 18} color={palette.blush} />
          </View>
          <View>
            {badgeLabel ? (
              <Text style={styles.badgeLabel}>{badgeLabel}</Text>
            ) : null}
            {badgeTitle ? (
              <Text style={styles.badgeTitle}>{badgeTitle}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {compact ? (
        <View style={styles.compactPill}>
          <View style={styles.compactDot} />
          <Text style={styles.compactPillText}>Active Tracking</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getDeliveryPalette(theme);

  return StyleSheet.create({
    shell: {
      minHeight: 288,
      borderRadius: theme.radius.hero,
      overflow: 'hidden',
      backgroundColor: palette.mapSurface,
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    shellCompact: {
      minHeight: 170,
      justifyContent: 'flex-end',
      padding: theme.spacing.md,
    },
    continent: {
      position: 'absolute',
      backgroundColor: 'rgba(116, 156, 74, 0.82)',
      opacity: 0.92,
    },
    continentNorthAmerica: {
      top: 56,
      left: 22,
      width: 132,
      height: 94,
      borderRadius: 44,
      transform: [{ rotate: '-12deg' }],
    },
    continentEurope: {
      top: 48,
      left: 152,
      width: 72,
      height: 58,
      borderRadius: 28,
      transform: [{ rotate: '10deg' }],
    },
    continentAsia: {
      top: 64,
      right: 12,
      width: 166,
      height: 112,
      borderRadius: 58,
      transform: [{ rotate: '8deg' }],
    },
    continentAustralia: {
      bottom: 54,
      right: 46,
      width: 78,
      height: 52,
      borderRadius: 26,
      transform: [{ rotate: '-8deg' }],
    },
    street: {
      position: 'absolute',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 999,
    },
    streetOne: {
      left: -30,
      right: 18,
      top: 54,
      height: 1,
      transform: [{ rotate: '18deg' }],
    },
    streetTwo: {
      left: 12,
      right: -44,
      top: 88,
      height: 1,
      transform: [{ rotate: '-12deg' }],
    },
    streetThree: {
      left: -22,
      right: 26,
      top: 122,
      height: 1,
      transform: [{ rotate: '8deg' }],
    },
    streetFour: {
      top: 12,
      bottom: 24,
      left: 98,
      width: 1,
      transform: [{ rotate: '-14deg' }],
    },
    streetFive: {
      top: 18,
      bottom: 8,
      right: 96,
      width: 1,
      transform: [{ rotate: '12deg' }],
    },
    path: {
      position: 'absolute',
      left: 74,
      right: 70,
      top: 86,
      height: 2,
      borderRadius: 999,
      backgroundColor: 'rgba(229, 187, 181, 0.46)',
      transform: [{ rotate: '32deg' }],
    },
    pathCompact: {
      top: 98,
      left: 76,
      right: 74,
    },
    marker: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    markerCompact: {
      width: 26,
      height: 26,
    },
    markerOne: {
      left: 40,
      top: 84,
    },
    markerTwo: {
      left: 92,
      bottom: 48,
    },
    markerThree: {
      alignItems: 'center',
      backgroundColor: 'rgba(232, 188, 183, 0.92)',
      borderColor: 'rgba(232, 188, 183, 0.92)',
      right: 126,
      top: 104,
    },
    markerThreeCompact: {
      alignItems: 'center',
      backgroundColor: 'rgba(232, 188, 183, 0.92)',
      borderColor: 'rgba(232, 188, 183, 0.92)',
      right: 126,
      top: 82,
    },
    markerFour: {
      right: 42,
      top: 72,
    },
    markerFive: {
      right: 36,
      bottom: 34,
    },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderRadius: 18,
      backgroundColor: 'rgba(49, 41, 38, 0.94)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    badgeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#8E4D1D',
    },
    badgeIconWrapCompact: {
      width: 34,
      height: 34,
    },
    badgeLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    badgeTitle: {
      marginTop: 2,
      fontSize: 18,
      fontWeight: '900',
      color: '#FFF5EF',
    },
    compactPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      backgroundColor: 'rgba(17, 12, 10, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    compactDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.blush,
    },
    compactPillText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: '#FFF6F1',
    },
  });
};
