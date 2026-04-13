import { StyleSheet, Text } from 'react-native';
import { CardContainer } from '../ui/CardContainer';
import { useTheme, useThemedStyles } from '../../theme';

type DeliveryEarningsCardProps = {
  caption?: string;
  title: string;
  value: string;
};

export function DeliveryEarningsCard({
  caption,
  title,
  value,
}: DeliveryEarningsCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <CardContainer style={styles.card} variant="light">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? (
        <Text style={styles.caption}>{caption}</Text>
      ) : null}
    </CardContainer>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  value: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  caption: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
});
