import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { ShopStatusBanner } from '../components/ShopStatusBanner';
import { useTheme, useThemedStyles } from '../theme';

export function CustomerAppShell({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const {
    currentTime,
    isShopOpen,
    isShopTimingLoading,
    shopTiming,
  } = useCartState();

  const shouldShowBanner = !isShopTimingLoading && !isShopOpen;

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top }]}>
        {shouldShowBanner ? (
          <View style={styles.bannerWrap}>
            <ShopStatusBanner
              closeTime={shopTiming.closeTime}
              currentTime={currentTime}
              openTime={shopTiming.openTime}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.navigatorWrap}>
        {children}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerArea: {
    backgroundColor: theme.colors.background,
  },
  bannerWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  navigatorWrap: {
    flex: 1,
  },
});
