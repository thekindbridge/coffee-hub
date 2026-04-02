import { FlatList, StyleSheet, Text, View } from 'react-native';
import { OfferCard } from '../components/offers/OfferCard';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { useOffers } from '../hooks/useOffers';
import { useTheme, useThemedStyles } from '../theme';

export function OffersScreen() {
  const styles = useThemedStyles(createStyles);
  const { activeOffers, error, isLoading } = useOffers();

  const content = error
    ? error
    : isLoading
      ? 'Loading offers...'
      : 'No active offers available right now.';

  if (error || isLoading || activeOffers.length === 0) {
    return (
      <View style={styles.screen}>
        <ScreenTransition>
          <Text style={styles.eyebrow}>Rewards</Text>
          <Text style={styles.title}>Exclusive offers</Text>
          <View style={styles.messageCard}>
            <Text style={error ? styles.errorText : styles.messageText}>{content}</Text>
          </View>
        </ScreenTransition>
      </View>
    );
  }

  return (
    <FlatList
      data={activeOffers}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <OfferCard offer={item} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={(
        <ScreenTransition>
          <Text style={styles.eyebrow}>Rewards</Text>
          <Text style={styles.title}>Exclusive offers</Text>
        </ScreenTransition>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 112,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    marginTop: 4,
    marginBottom: theme.spacing.xl,
    fontSize: theme.typography.heading,
    fontWeight: '900',
    color: theme.colors.text,
  },
  messageCard: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  messageText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  errorText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.danger,
  },
  separator: {
    height: theme.spacing.md,
  },
});
