import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardContainer } from '../../../components/ui/CardContainer';
import { useTheme, useThemedStyles } from '../../../theme';

type ProfileSectionCardProps = PropsWithChildren<{
  action?: ReactNode;
  subtitle?: string;
  title: string;
}>;

export function ProfileSectionCard({
  action,
  children,
  subtitle,
  title,
}: ProfileSectionCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <CardContainer style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>

        {action}
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </CardContainer>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    marginTop: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  content: {
    marginTop: theme.spacing.md,
  },
});
