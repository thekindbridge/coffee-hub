import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { formatShopTime } from '../../shared/shopTiming';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';

type TimePickerInputProps = {
  label: string;
  value: string;
  description: string;
  onPress: () => void;
};

export function TimePickerInput({
  label,
  value,
  description,
  onPress,
}: TimePickerInputProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={styles.shadowWrap}
    >
      <GlassSurface
        depth="card"
        intensity={64}
        overlayColor={getAdminSurfaceColor('card')}
        style={styles.card}
      >
        <View style={styles.copy}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value || '--:--'}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.prettyTime}>{value ? formatShopTime(value) : '--'}</Text>
          <Ionicons color={adminPalette.textMuted} name="chevron-forward" size={18} />
        </View>
      </GlassSurface>
    </ScalePressable>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 6,
    color: adminPalette.text,
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    marginTop: 6,
    color: adminPalette.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  prettyTime: {
    color: adminPalette.caramelSoft,
    fontSize: 12,
    fontWeight: '800',
  },
});
