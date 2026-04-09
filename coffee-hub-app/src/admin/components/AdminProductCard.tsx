import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge as SharedStatusBadge } from '../../components/customer/StatusBadge';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { useFadeIn } from '../../theme';
import type { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminProductTag,
  getAdminSurfaceColor,
} from '../utils/designSystem';
import { ToggleSwitch } from './ToggleSwitch';

type AdminProductCardProps = {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: (value: boolean) => void;
};

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

function QuickAction({
  icon,
  label,
  tone = 'default',
  onPress,
}: QuickActionProps) {
  const isDanger = tone === 'danger';

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.97}
      style={styles.actionWrap}
    >
      <GlassSurface
        depth="floating"
        intensity={60}
        overlayColor={isDanger ? 'rgba(225, 161, 141, 0.14)' : getAdminSurfaceColor('floating')}
        style={styles.actionButton}
      >
        <Ionicons
          color={isDanger ? adminPalette.danger : adminPalette.text}
          name={icon}
          size={16}
        />
        <Text style={[styles.actionLabel, isDanger ? styles.actionLabelDanger : null]}>
          {label}
        </Text>
      </GlassSurface>
    </ScalePressable>
  );
}

export function AdminProductCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
}: AdminProductCardProps) {
  const animatedStyle = useFadeIn();
  const tag = getAdminProductTag(item);
  const description = item.description.trim() || 'No tasting notes added to this item yet.';

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.shadowWrap}>
        <GlassSurface
          depth="card"
          intensity={72}
          overlayColor={getAdminSurfaceColor('card')}
          style={styles.card}
        >
          <View style={styles.mediaWrap}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.mediaImage} />
            ) : (
              <LinearGradient
                colors={['#2C201D', '#6C4D43', '#C28E71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mediaFallback}
              >
                <Ionicons color="rgba(242, 231, 225, 0.92)" name="cafe-outline" size={30} />
              </LinearGradient>
            )}

            <View style={styles.mediaOverlay}>
              <SharedStatusBadge label={tag.label} tone={tag.tone} />
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text numberOfLines={1} style={styles.title}>
                  {item.name}
                </Text>
                <Text numberOfLines={1} style={styles.subtitle}>
                  {item.category}
                </Text>
              </View>

              <Text style={styles.price}>{formatCurrency(item.price)}</Text>
            </View>

            <Text numberOfLines={3} style={styles.description}>
              {description}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons color={adminPalette.gold} name="flame-outline" size={14} />
                <Text style={styles.metaText}>Spice {item.spice_level}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons color={adminPalette.caramel} name="star-outline" size={14} />
                <Text style={styles.metaText}>
                  {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.availabilityBlock}>
                <Text style={styles.footerLabel}>Availability</Text>
                <ToggleSwitch
                  value={item.is_available}
                  onValueChange={onToggleAvailability}
                />
              </View>

              <View style={styles.actionsRow}>
                <QuickAction icon="create-outline" label="Edit" onPress={onEdit} />
                <QuickAction
                  icon="trash-outline"
                  label="Delete"
                  tone="danger"
                  onPress={onDelete}
                />
              </View>
            </View>
          </View>
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
  },
  mediaWrap: {
    height: 166,
    position: 'relative',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    color: adminPalette.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: adminPalette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  price: {
    color: adminPalette.caramelSoft,
    fontSize: 18,
    fontWeight: '900',
  },
  description: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: adminRadius.pill,
    backgroundColor: adminPalette.ghost,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaText: {
    color: adminPalette.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  availabilityBlock: {
    gap: 8,
  },
  footerLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionWrap: {
    borderRadius: adminRadius.pill,
  },
  actionButton: {
    minHeight: 40,
    borderRadius: adminRadius.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    color: adminPalette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  actionLabelDanger: {
    color: adminPalette.danger,
  },
});
