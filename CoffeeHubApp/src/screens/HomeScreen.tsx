import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { Banner } from '../components/Banner';
import { Loader } from '../components/Loader';
import { MenuItemCard } from '../components/MenuItemCard';
import { ROUTES } from '../constants/routes';
import { palette, radius, spacing } from '../constants/theme';
import { useCart, useMenuCatalog } from '../hooks';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { MenuItem } from '../services/api';

const HERO_IMAGE =
  'https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg';
const MAPS_URL = 'https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6';

const infoTiles = [
  {
    body: 'Compact checkout built for quick repeat orders on mobile.',
    icon: <Feather color={palette.secondary} name="clock" size={20} />,
    title: 'Fast lanes',
    tone: palette.primarySoft,
  },
  {
    body: 'Quick COD checkout, clean prep, and order tracking from one drawer.',
    icon: <Feather color={palette.highlight} name="shield" size={20} />,
    title: 'Fresh & safe',
    tone: 'rgba(255, 179, 71, 0.12)',
  },
] as const;

const reasonsToLove = [
  {
    icon: <Feather color={palette.highlight} name="star" size={16} />,
    label: '4.5+ Local Rating',
    tone: '#2B1A0F',
  },
  {
    icon: <MaterialCommunityIcons color="#F6C18B" name="chef-hat" size={16} />,
    label: 'Freshly Prepared Food',
    tone: '#241510',
  },
  {
    icon: <Feather color="#7DD3FC" name="truck" size={16} />,
    label: 'Fast Delivery in Inkollu',
    tone: '#14202A',
  },
  {
    icon: <Feather color="#C4B5FD" name="gift" size={16} />,
    label: 'Daily Offers & Rewards',
    tone: '#1F1A2F',
  },
] as const;

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { addItem, cartQuantityById, itemCount } = useCart();
  const { errorMessage, isLoading, menuItems, reloadMenu } = useMenuCatalog();

  const quickPicks = menuItems.slice(0, 6);
  const featuredCategories = Array.from(
    new Set(
      menuItems
        .map(item => item.category.trim())
        .filter(category => category.length > 0),
    ),
  ).slice(0, 6);

  const heroMetrics = [
    { label: 'Delivery', value: '20-30m' },
    { label: 'Fresh picks', value: `${menuItems.length}+` },
    { label: 'In cart', value: `${itemCount}` },
  ];

  const handleAddToCart = (item: MenuItem, delta: number) => {
    addItem(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        image_url: item.image_url,
        is_veg: item.is_veg,
        rating: item.rating,
        spice_level: item.spice_level,
      },
      delta,
    );
  };

  const renderQuickPicks = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingShell}>
          <Loader />
        </View>
      );
    }

    if (errorMessage && quickPicks.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Unable to load the menu</Text>
          <Text style={styles.stateBody}>{errorMessage}</Text>
          <AppButton label="Try Again" onPress={() => void reloadMenu()} variant="secondary" />
        </View>
      );
    }

    if (quickPicks.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No menu items available</Text>
          <Text style={styles.stateBody}>
            The backend responded successfully, but there are no quick picks to show right now.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.quickPicksContent}
        data={quickPicks}
        horizontal
        ItemSeparatorComponent={() => <View style={styles.quickPicksSeparator} />}
        keyExtractor={item => item.id}
        nestedScrollEnabled
        renderItem={({ item }) => (
          <View style={styles.menuCardSlot}>
            <MenuItemCard
              cartQuantity={cartQuantityById.get(item.id) ?? 0}
              item={item}
              onAddToCart={handleAddToCart}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Banner
            backgroundImageUri={HERO_IMAGE}
            badges={[
              {
                icon: <Feather color={palette.secondary} name="coffee" size={12} />,
                label: 'Inkollu coffee kitchen',
              },
              {
                icon: <Feather color={palette.textSecondary} name="map-pin" size={12} />,
                label: 'Fast local delivery',
              },
            ]}
            description="Compact ordering for hungry evenings, quick reorders, and warm coffee-house vibes."
            eyebrow="Brewed for mobile ordering"
            metrics={heroMetrics}
            primaryAction={{
              icon: <Feather color={palette.textPrimary} name="shopping-bag" size={16} />,
              label: 'View menu',
              onPress: () => navigation.navigate(ROUTES.Menu),
            }}
            secondaryAction={{
              icon: <Feather color={palette.textSecondary} name="shopping-cart" size={16} />,
              label: 'View cart',
              onPress: () => navigation.navigate(ROUTES.Cart),
              variant: 'secondary',
            }}
            title="Hot bowls, rich bites, fast pours."
          />
        </View>

        {featuredCategories.length > 0 ? (
          <View style={styles.discoverySection}>
            <View style={styles.discoveryHeader}>
              <View>
                <Text style={styles.discoveryEyebrow}>Browse by craving</Text>
                <Text style={styles.discoveryTitle}>Fresh categories for today</Text>
              </View>
              <AppButton
                fullWidth={false}
                icon={<Feather color={palette.secondary} name="arrow-right" size={16} />}
                label="Menu"
                onPress={() => navigation.navigate(ROUTES.Menu)}
                style={styles.discoveryButton}
                variant="ghost"
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.discoveryRail}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {featuredCategories.map((category, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={category}
                  onPress={() => navigation.navigate(ROUTES.Menu)}
                  style={({ pressed }) => [
                    styles.discoveryCard,
                    pressed && styles.pressed,
                    index === 0 ? styles.discoveryCardFeatured : undefined,
                  ]}
                >
                  <View
                    style={[
                      styles.discoveryIconShell,
                      index === 0 ? styles.discoveryIconShellFeatured : undefined,
                    ]}
                  >
                    <Feather
                      color={index === 0 ? palette.textPrimary : palette.secondary}
                      name="coffee"
                      size={16}
                    />
                  </View>
                  <Text style={styles.discoveryCardTitle}>{category}</Text>
                  <Text style={styles.discoveryCardBody}>Fresh brews and fast bites</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {errorMessage && quickPicks.length > 0 ? (
          <View style={styles.inlineErrorCard}>
            <Text style={styles.inlineErrorTitle}>Could not refresh quick picks.</Text>
            <Text style={styles.inlineErrorBody}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionEyebrow}>Popular right now</Text>
              <Text style={styles.sectionTitle}>Quick picks</Text>
              <Text style={styles.sectionBody}>Customer favorites that are easy to reorder.</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate(ROUTES.Menu)}
              style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
            >
              <Text style={styles.inlineActionText}>Menu</Text>
              <Feather color={palette.textSecondary} name="chevron-right" size={16} />
            </Pressable>
          </View>

          {renderQuickPicks()}
        </View>

        <View style={styles.infoGrid}>
          {infoTiles.map(tile => (
            <AppCard key={tile.title} style={styles.infoTile} variant="soft">
              <View style={[styles.infoIconShell, { backgroundColor: tile.tone }]}>{tile.icon}</View>
              <Text style={styles.infoTitle}>{tile.title}</Text>
              <Text style={styles.infoBody}>{tile.body}</Text>
            </AppCard>
          ))}
        </View>

        <View style={styles.reasonsCard}>
          <View style={styles.reasonsHeader}>
            <Feather color={palette.secondary} name="zap" size={14} />
            <Text style={styles.reasonsEyebrow}>Why customers love Coffee Hub</Text>
          </View>

          <View style={styles.reasonsGrid}>
            {reasonsToLove.map(reason => (
              <View key={reason.label} style={styles.reasonPill}>
                <View style={[styles.reasonIconShell, { backgroundColor: reason.tone }]}>{reason.icon}</View>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationEyebrow}>Serving Inkollu & Nearby Areas</Text>

          <View style={styles.locationList}>
            <View style={styles.locationRow}>
              <View style={styles.locationIconShell}>
                <Feather color={palette.secondary} name="truck" size={16} />
              </View>
              <Text style={styles.locationText}>Average delivery time: 20-30 minutes</Text>
            </View>

            <View style={styles.locationRow}>
              <View style={styles.locationIconShell}>
                <Feather color={palette.secondary} name="map-pin" size={16} />
              </View>
              <Text style={styles.locationText}>Inkollu Coffee Kitchen</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(MAPS_URL)}
            style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
          >
            <Text style={styles.locationButtonText}>Open in Google Maps</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  heroSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  discoverySection: {
    paddingTop: spacing.lg,
  },
  discoveryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  discoveryEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  discoveryTitle: {
    color: palette.accent,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  discoveryButton: {
    minHeight: 40,
    paddingHorizontal: 0,
  },
  discoveryRail: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  discoveryCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    minWidth: 156,
    padding: spacing.md,
  },
  discoveryCardFeatured: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.borderStrong,
  },
  discoveryIconShell: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  discoveryIconShellFeatured: {
    backgroundColor: palette.primary,
  },
  discoveryCardTitle: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  discoveryCardBody: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  inlineErrorCard: {
    backgroundColor: palette.warningSoft,
    borderColor: 'rgba(244, 193, 110, 0.24)',
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineErrorTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineErrorBody: {
    color: '#F5DDBB',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderCopy: {
    gap: 4,
    maxWidth: '70%',
  },
  sectionEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: palette.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  sectionBody: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineAction: {
    alignItems: 'center',
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  inlineActionText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingShell: {
    alignItems: 'center',
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 240,
  },
  quickPicksContent: {
    paddingRight: spacing.md,
  },
  quickPicksSeparator: {
    width: spacing.sm,
  },
  menuCardSlot: {
    width: 248,
  },
  stateCard: {
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  stateTitle: {
    color: palette.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  stateBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  infoTile: {
    flex: 1,
  },
  infoIconShell: {
    alignItems: 'center',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  infoTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  infoBody: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  reasonsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  reasonsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reasonsEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reasonPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 13, 11, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: '47%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reasonIconShell: {
    alignItems: 'center',
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reasonLabel: {
    color: palette.accent,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  locationCard: {
    backgroundColor: 'rgba(18, 12, 9, 0.94)',
    borderColor: palette.border,
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  locationEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  locationList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  locationRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  locationIconShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 20, 17, 1)',
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  locationText: {
    color: palette.accent,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: palette.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  locationButtonText: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
