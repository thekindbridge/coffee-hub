import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { ScalePressable } from '../ui/ScalePressable';
import { getDeliveryPalette, getDeliveryShadow } from './designSystem';

type DeliveryTopBarProps = {
  avatarUrl?: string | null;
  centerLabel?: string;
  initials: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  leadingLabel?: string;
  onLeadingPress?: () => void;
  onProfilePress?: () => void;
};

export function DeliveryTopBar({
  avatarUrl,
  centerLabel,
  initials,
  leadingIcon = 'menu-outline',
  leadingLabel,
  onLeadingPress,
  onProfilePress,
}: DeliveryTopBarProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <View style={styles.leftGroup}>
        <ScalePressable
          accessibilityRole={onLeadingPress ? 'button' : undefined}
          disabled={!onLeadingPress}
          onPress={onLeadingPress}
          scaleTo={0.96}
          style={styles.leadingButton}
        >
          <Ionicons name={leadingIcon} size={22} color={palette.text} />
        </ScalePressable>

        {leadingLabel ? (
          <Text numberOfLines={1} style={styles.leadingLabel}>
            {leadingLabel}
          </Text>
        ) : null}
      </View>

      {centerLabel ? (
        <Text numberOfLines={1} style={styles.centerLabel}>
          {centerLabel}
        </Text>
      ) : null}

      <ScalePressable
        accessibilityRole={onProfilePress ? 'button' : undefined}
        disabled={!onProfilePress}
        onPress={onProfilePress}
        scaleTo={0.96}
        style={styles.avatarShadow}
      >
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarLabel}>{initials}</Text>
          )}
        </View>
      </ScalePressable>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getDeliveryPalette(theme);

  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    leadingButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
    },
    leadingLabel: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: palette.text,
    },
    centerLabel: {
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.3,
      color: palette.text,
    },
    avatarShadow: {
      borderRadius: 20,
      ...getDeliveryShadow(theme),
    },
    avatarWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: palette.blush,
      backgroundColor: palette.cardStrong,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarLabel: {
      fontSize: 13,
      fontWeight: '900',
      color: palette.text,
    },
  });
};
