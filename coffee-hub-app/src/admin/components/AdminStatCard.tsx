import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { useFadeIn } from '../../theme';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';

type AdminStatCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'caramel' | 'success' | 'warning' | 'danger';
  progress?: number;
  style?: StyleProp<ViewStyle>;
};

const getAccentColor = (tone: NonNullable<AdminStatCardProps['tone']>) => {
  switch (tone) {
    case 'success':
      return adminPalette.success;
    case 'warning':
      return adminPalette.warning;
    case 'danger':
      return adminPalette.danger;
    default:
      return adminPalette.caramel;
  }
};

export function AdminStatCard({
  label,
  value,
  detail,
  icon = 'sparkles-outline',
  tone = 'caramel',
  progress,
  style,
}: AdminStatCardProps) {
  const animatedStyle = useFadeIn();
  const accentColor = getAccentColor(tone);
  const resolvedProgress = typeof progress === 'number'
    ? Math.max(0, Math.min(progress, 1))
    : null;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <View style={styles.shadowWrap}>
        <GlassSurface
          depth="card"
          intensity={64}
          overlayColor={getAdminSurfaceColor('card')}
          style={styles.card}
        >
          <View style={[styles.glow, { backgroundColor: `${accentColor}22` }]} />

          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
              <Ionicons color={accentColor} name={icon} size={18} />
            </View>

            {detail ? (
              <Text numberOfLines={1} style={styles.detail}>
                {detail}
              </Text>
            ) : null}
          </View>

          <Text numberOfLines={1} style={styles.value}>
            {value}
          </Text>
          <Text style={styles.label}>{label}</Text>

          {resolvedProgress !== null ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[`${accentColor}88`, accentColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${resolvedProgress * 100}%` }]}
                />
              </View>
              <Text style={styles.progressValue}>
                {Math.round(resolvedProgress * 100)}%
              </Text>
            </View>
          ) : null}
        </GlassSurface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  card: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    minHeight: 146,
  },
  glow: {
    position: 'absolute',
    top: -34,
    right: -12,
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: {
    flex: 1,
    textAlign: 'right',
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 22,
    color: adminPalette.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  label: {
    marginTop: 8,
    color: adminPalette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  progressWrap: {
    marginTop: 18,
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: adminPalette.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressValue: {
    color: adminPalette.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
});
