import { FlatList, StyleSheet, Text, View } from 'react-native';
import { OfferCard } from '../components/offers/OfferCard';
import { COLORS, SPACING } from '../constants/theme';
import { useOffers } from '../hooks/useOffers';

export function OffersScreen() {
  const { activeOffers, error, isLoading } = useOffers();

  if (error) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Exclusive Offers</Text>
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Exclusive Offers</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Loading offers...</Text>
        </View>
      </View>
    );
  }

  if (activeOffers.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Exclusive Offers</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>No active offers available right now.</Text>
        </View>
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
      ListHeaderComponent={<Text style={styles.title}>Exclusive Offers</Text>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: 112,
  },
  title: {
    marginBottom: SPACING.xl,
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
  },
  messageCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    padding: SPACING.md,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.accent,
  },
  separator: {
    height: SPACING.md,
  },
});
