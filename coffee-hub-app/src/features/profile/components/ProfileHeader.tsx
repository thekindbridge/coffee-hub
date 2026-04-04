import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../theme';
import { ScalePressable } from '../../../components/ui/ScalePressable';

type ProfileHeaderProps = {
  avatarUrl?: string | null;
  initials: string;
  metaLine: string;
  name: string;
  onEditPress?: () => void;
};

export function ProfileHeader({
  avatarUrl,
  initials,
  metaLine,
  name,
  onEditPress,
}: ProfileHeaderProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <LinearGradient
      colors={theme.gradients.accent}
      locations={[0, 1]}
      style={[styles.container, theme.shadows.card]}
    >
      {onEditPress ? (
        <ScalePressable
          accessibilityRole="button"
          onPress={onEditPress}
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
        </ScalePressable>
      ) : null}

      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Coffee Hub Profile</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta} numberOfLines={2}>{metaLine}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    borderRadius: theme.radius.hero,
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.78)',
  },
  name: {
    marginTop: 6,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  meta: {
    marginTop: 8,
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: 'rgba(248, 244, 239, 0.84)',
  },
  editButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
