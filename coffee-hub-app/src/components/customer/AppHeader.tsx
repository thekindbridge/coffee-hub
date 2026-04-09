import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';
import { ScalePressable } from '../ui/ScalePressable';
import { getAmbientShadow, getCustomerPalette } from './designSystem';

type CustomerHeaderProps = {
  mode?: 'customer';
  avatarUrl?: string | null;
  initials: string;
  locationLabel: string;
  locationValue: string;
  onAvatarPress?: () => void;
};

type AdminHeaderProps = {
  mode: 'admin';
  avatarUrl?: string | null;
  initials: string;
  title: string;
  subtitle?: string;
  onAvatarPress?: () => void;
  onLeadingPress?: () => void;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
};

type AppHeaderProps = CustomerHeaderProps | AdminHeaderProps;

export function AppHeader({
  avatarUrl,
  initials,
  onAvatarPress,
  mode = 'customer',
  ...rest
}: AppHeaderProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const isAdmin = mode === 'admin';
  const adminProps = isAdmin
    ? rest as Omit<AdminHeaderProps, 'avatarUrl' | 'initials' | 'mode' | 'onAvatarPress'>
    : null;
  const customerProps = !isAdmin
    ? rest as Omit<CustomerHeaderProps, 'avatarUrl' | 'initials' | 'mode' | 'onAvatarPress'>
    : null;

  return (
    <View style={styles.row}>
      {isAdmin ? (
        <>
          <ScalePressable
            accessibilityRole={adminProps?.onLeadingPress ? 'button' : undefined}
            disabled={!adminProps?.onLeadingPress}
            onPress={adminProps?.onLeadingPress}
            style={[styles.adminLeadingWrap, styles.ambientShadow]}
          >
            <GlassSurface
              intensity={74}
              overlayColor={palette.surfaceGlassStrong}
              style={styles.adminLeadingGlass}
            >
              <Ionicons
                name={adminProps?.leadingIcon || 'menu-outline'}
                size={20}
                color={palette.text}
              />
            </GlassSurface>
          </ScalePressable>

          <View style={styles.adminTitleWrap}>
            <Text numberOfLines={1} style={styles.adminTitle}>
              {adminProps?.title}
            </Text>
            {adminProps?.subtitle ? (
              <Text numberOfLines={1} style={styles.adminSubtitle}>
                {adminProps.subtitle}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <GlassSurface
          intensity={68}
          overlayColor={palette.surfaceGlass}
          style={[styles.locationCard, styles.ambientShadow]}
        >
          <View style={styles.locationIconWrap}>
            <Ionicons name="location-outline" size={16} color={palette.caramel} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>{customerProps?.locationLabel}</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {customerProps?.locationValue}
            </Text>
          </View>
        </GlassSurface>
      )}

      <ScalePressable
        accessibilityRole={onAvatarPress ? 'button' : undefined}
        disabled={!onAvatarPress}
        onPress={onAvatarPress}
        style={[styles.avatarWrap, styles.ambientShadow]}
      >
        <GlassSurface intensity={72} overlayColor={palette.surfaceGlassStrong} style={styles.avatarGlass}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </GlassSurface>
      </ScalePressable>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    ambientShadow: getAmbientShadow(theme),
    adminLeadingWrap: {
      width: 58,
      height: 58,
      borderRadius: 29,
    },
    adminLeadingGlass: {
      width: '100%',
      height: '100%',
      borderRadius: 29,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminTitleWrap: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    adminTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.text,
    },
    adminSubtitle: {
      fontSize: theme.typography.caption,
      fontWeight: '700',
      color: palette.textMuted,
    },
    locationCard: {
      flex: 1,
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderRadius: 24,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    locationIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: palette.ghost,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationCopy: {
      flex: 1,
    },
    locationLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    locationValue: {
      marginTop: 4,
      fontSize: theme.typography.body,
      fontWeight: '700',
      color: palette.text,
    },
    avatarWrap: {
      width: 58,
      height: 58,
      borderRadius: 29,
      overflow: 'visible',
    },
    avatarGlass: {
      width: '100%',
      height: '100%',
      borderRadius: 29,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.text,
    },
  });
};
