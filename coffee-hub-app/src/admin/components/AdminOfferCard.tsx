import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBadge as SharedStatusBadge } from '../../components/customer/StatusBadge';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { useFadeIn } from '../../theme';
import type { Offer } from '../../types';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminOfferGradient,
  getAdminSurfaceColor,
} from '../utils/designSystem';
import { ToggleSwitch } from './ToggleSwitch';

type AdminOfferCardProps = {
  offer: Offer;
  expiryLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (value: boolean) => void;
};

type MiniActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

function MiniAction({
  icon,
  label,
  tone = 'default',
  onPress,
}: MiniActionProps) {
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
        intensity={62}
        overlayColor={isDanger ? 'rgba(225, 161, 141, 0.14)' : getAdminSurfaceColor('floating')}
        style={styles.actionButton}
      >
        <Ionicons
          color={isDanger ? adminPalette.danger : adminPalette.text}
          name={icon}
          size={16}
        />
        <Text style={[styles.actionText, isDanger ? styles.actionTextDanger : null]}>
          {label}
        </Text>
      </GlassSurface>
    </ScalePressable>
  );
}

export function AdminOfferCard({
  offer,
  expiryLabel,
  onEdit,
  onDelete,
  onToggleActive,
}: AdminOfferCardProps) {
  const animatedStyle = useFadeIn();
  const offerGradient = getAdminOfferGradient(offer);

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.shadowWrap}>
        <GlassSurface
          depth="card"
          intensity={72}
          overlayColor={getAdminSurfaceColor('card')}
          style={styles.card}
        >
          <LinearGradient
            colors={offerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerRow}>
              <SharedStatusBadge
                label={offer.isActive ? 'Active' : 'Inactive'}
                tone={offer.isActive ? 'success' : 'danger'}
              />

              <View style={styles.bannerIcon}>
                <Ionicons color="rgba(22, 15, 13, 0.92)" name="sparkles-outline" size={18} />
              </View>
            </View>

            <Text numberOfLines={1} style={styles.bannerCode}>
              {offer.couponCode}
            </Text>
            <Text numberOfLines={2} style={styles.bannerTitle}>
              {offer.title}
            </Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.discount}>
              {offer.discountType === 'percentage'
                ? `${offer.discountValue}% OFF`
                : `Flat ${offer.discountValue} OFF`}
            </Text>

            <Text style={styles.description}>
              {offer.description.trim() || 'Curated offer copy will appear here.'}
            </Text>

            <View style={styles.metaWrap}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Expiry</Text>
                <Text style={styles.metaValue}>{expiryLabel}</Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Min order</Text>
                <Text style={styles.metaValue}>
                  {offer.minOrderAmount > 0 ? `Rs ${offer.minOrderAmount}` : 'No minimum'}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.toggleBlock}>
                <Text style={styles.toggleLabel}>Campaign live</Text>
                <ToggleSwitch
                  value={offer.isActive}
                  onValueChange={onToggleActive}
                />
              </View>

              <View style={styles.actionsRow}>
                <MiniAction icon="create-outline" label="Edit" onPress={onEdit} />
                <MiniAction
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
  banner: {
    minHeight: 156,
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(242, 231, 225, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCode: {
    color: 'rgba(248, 241, 237, 0.84)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: '#F9F1ED',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  content: {
    padding: 18,
    gap: 14,
  },
  discount: {
    color: adminPalette.caramelSoft,
    fontSize: 22,
    fontWeight: '900',
  },
  description: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  metaWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  metaCard: {
    flex: 1,
    borderRadius: adminRadius.control,
    backgroundColor: adminPalette.ghost,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metaLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: 6,
    color: adminPalette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  toggleBlock: {
    gap: 8,
  },
  toggleLabel: {
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
  actionText: {
    color: adminPalette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  actionTextDanger: {
    color: adminPalette.danger,
  },
});
