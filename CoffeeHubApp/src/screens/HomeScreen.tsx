import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { Loader } from '../components/Loader';
import { MenuItemCard } from '../components/MenuItemCard';
import { palette, radius, spacing } from '../constants/theme';
import { useAuth, useCart } from '../hooks';
import { getMenu, type MenuItem } from '../services/api';

export function HomeScreen() {
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMenu = async () => {
    setIsLoading(true);

    try {
      const nextMenu = await getMenu();
      setMenuItems(nextMenu);
      setErrorMessage('');
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : 'Unable to load the menu right now.';
      setErrorMessage(nextError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
    });
  };

  const header = (
    <View style={styles.header}>
      <AppCard>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.body}>{user?.email ?? 'guest@coffeehub.app'}</Text>
      </AppCard>

      {errorMessage && menuItems.length > 0 ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not refresh the menu.</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <AppButton label="Try Again" onPress={() => void loadMenu()} variant="secondary" />
        </AppCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <Text style={styles.sectionBody}>
            Browse live items from the backend and add them to the shared cart.
          </Text>
        </View>
        <View style={styles.cartPill}>
          <Text style={styles.cartLabel}>{itemCount} in cart</Text>
        </View>
      </View>
    </View>
  );

  const emptyState = isLoading ? (
    <Loader />
  ) : errorMessage ? (
    <View style={styles.stateWrapper}>
      <AppCard style={styles.errorCard}>
        <Text style={styles.errorTitle}>Unable to load menu</Text>
        <Text style={styles.errorBody}>{errorMessage}</Text>
        <AppButton label="Try Again" onPress={() => void loadMenu()} variant="secondary" />
      </AppCard>
    </View>
  ) : (
    <View style={styles.stateWrapper}>
      <AppCard>
        <Text style={styles.stateTitle}>No menu items available</Text>
        <Text style={styles.stateBody}>
          The backend responded successfully, but the menu is empty right now.
        </Text>
      </AppCard>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={menuItems}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={item => item.id}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={header}
        onRefresh={() => void loadMenu()}
        refreshing={isLoading && menuItems.length > 0}
        renderItem={({ item }) => (
          <MenuItemCard item={item} onAddToCart={handleAddToCart} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
    rowGap: spacing.md,
  },
  heading: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionCopy: {
    flex: 1,
    paddingRight: spacing.md,
    rowGap: spacing.xs,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  cartPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  cartLabel: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    height: spacing.md,
  },
  stateWrapper: {
    paddingTop: spacing.md,
  },
  stateTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  stateBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  errorCard: {
    rowGap: spacing.md,
  },
  errorTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  errorBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
