import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ScalePressable } from '../../components/ui/ScalePressable';
import {
  adminPalette,
  adminRadius,
  adminShadow,
} from '../utils/designSystem';

type FloatingActionButtonProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function FloatingActionButton({
  label,
  onPress,
  icon = 'add',
  style,
}: FloatingActionButtonProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.96}
      style={[styles.wrap, style]}
    >
      <LinearGradient
        colors={adminPalette.buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Ionicons color="#1D1411" name={icon} size={20} />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...adminShadow,
    borderRadius: adminRadius.pill,
  },
  button: {
    minHeight: 58,
    borderRadius: adminRadius.pill,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: '#1D1411',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
