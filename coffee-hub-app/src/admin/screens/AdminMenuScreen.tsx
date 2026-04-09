import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/customer/AppHeader';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAdminMenuManager } from '../hooks';
import { useAuth } from '../../hooks/useAuth';
import { useMenu } from '../../hooks/useMenu';
import type { MenuItem } from '../../types';
import {
  AdminProductCard,
  AdminStatCard,
  FloatingActionButton,
  ToggleSwitch,
} from '../components';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminSurfaceColor,
} from '../utils/designSystem';

type MenuTab = 'active' | 'archived';

type TabPillProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

type EditorFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  onChangeText: (value: string) => void;
};

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
}

function TabPill({ label, isActive, onPress }: TabPillProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={styles.tabWrap}
    >
      <GlassSurface
        depth="floating"
        intensity={60}
        overlayColor={isActive ? 'rgba(200, 146, 99, 0.24)' : getAdminSurfaceColor('floating')}
        style={[styles.tabPill, isActive ? styles.tabPillActive : null]}
      >
        <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
          {label}
        </Text>
      </GlassSurface>
    </ScalePressable>
  );
}

function EditorField({
  label,
  value,
  placeholder,
  keyboardType = 'default',
  onChangeText,
}: EditorFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={adminPalette.textMuted}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function AdminMenuScreen() {
  const { user } = useAuth();
  const { profileDisplayName, authPhotoUrl } = useProfileData();
  const { menu } = useMenu();
  const {
    closeEditor,
    deleteMenuItem,
    editMenuItem,
    editingId,
    isEditorOpen,
    isFormValid,
    isSaving,
    managerError,
    menuForm,
    menuItems,
    openCreate,
    saveMenuItem,
    toggleAvailability,
    updateMenuForm,
  } = useAdminMenuManager();
  const [activeTab, setActiveTab] = useState<MenuTab>('active');

  const dashboardName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const headerInitials = getInitials(dashboardName);

  const filteredItems = useMemo(
    () => menuItems.filter(item => (
      activeTab === 'active' ? item.is_available : !item.is_available
    )),
    [activeTab, menuItems],
  );

  const bestseller = useMemo(() => {
    const list = menuItems.length ? menuItems : menu;
    return [...list].sort((left, right) => right.rating - left.rating)[0] || null;
  }, [menu, menuItems]);

  const currentEditingItem = useMemo(
    () => menuItems.find(item => item.id === editingId) || null,
    [editingId, menuItems],
  );

  const handleDeleteItem = (menuItemId: string) => {
    Alert.alert(
      'Delete Menu Item',
      'This item will be removed from the mobile menu immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteMenuItem(menuItemId);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminProductCard
              item={item}
              onEdit={() => editMenuItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
              onToggleAvailability={_value => {
                void toggleAvailability(item.id, item.is_available);
              }}
            />
          )}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.headerContent}>
              <AppHeader
                mode="admin"
                avatarUrl={authPhotoUrl}
                initials={headerInitials}
                title="COFFEE-HUB"
                subtitle="Menu atelier"
              />

              <View style={styles.titleBlock}>
                <Text style={styles.eyebrow}>Menu Management</Text>
                <Text style={styles.title}>Shape the live menu with premium control.</Text>
                <Text style={styles.subtitle}>
                  Switch items in and out of service, keep signature brews polished, and maintain a clean customer-facing board.
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
              >
                <TabPill
                  label="Active Menu"
                  isActive={activeTab === 'active'}
                  onPress={() => setActiveTab('active')}
                />
                <TabPill
                  label="Archived"
                  isActive={activeTab === 'archived'}
                  onPress={() => setActiveTab('archived')}
                />
              </ScrollView>

              <View style={styles.statsGrid}>
                <AdminStatCard
                  label="Total Items"
                  value={menuItems.length}
                  detail={`${filteredItems.length} visible`}
                  icon="grid-outline"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="In Stock"
                  value={menu.length}
                  detail={`${menuItems.length - menu.length} archived`}
                  icon="leaf-outline"
                  tone="success"
                  style={styles.halfStat}
                />
                <AdminStatCard
                  label="Bestseller"
                  value={bestseller?.name || 'No ratings yet'}
                  detail={bestseller ? `${bestseller.rating.toFixed(1)} rating` : 'Awaiting reviews'}
                  icon="star-outline"
                  tone="warning"
                />
              </View>

              {managerError ? (
                <View style={styles.errorWrap}>
                  <GlassSurface
                    depth="card"
                    intensity={64}
                    overlayColor="rgba(225, 161, 141, 0.14)"
                    style={styles.errorCard}
                  >
                    <Text style={styles.errorText}>{managerError}</Text>
                  </GlassSurface>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <GlassSurface
                depth="card"
                intensity={64}
                overlayColor={getAdminSurfaceColor('card')}
                style={styles.emptyCard}
              >
                <Text style={styles.emptyTitle}>
                  {activeTab === 'active' ? 'No live menu items' : 'No archived menu items'}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'active'
                    ? 'Use the add item button to publish a fresh brew or snack.'
                    : 'Items you take offline will gather here for easy relaunch later.'}
                </Text>
              </GlassSurface>
            </View>
          )}
        />

        <FloatingActionButton
          label="Add Item"
          onPress={openCreate}
          style={styles.fab}
        />
      </ScreenTransition>

      <Modal
        animationType="slide"
        transparent
        visible={isEditorOpen}
        onRequestClose={closeEditor}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeEditor}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalEyebrow}>
              {editingId ? 'Edit Menu Item' : 'Create Menu Item'}
            </Text>
            <Text style={styles.modalTitle}>
              {editingId ? 'Update the menu surface' : 'Add a new brew to the board'}
            </Text>
            <Text style={styles.modalSubtitle}>
              This editor uses the existing Firestore admin payload, so it follows the same fields already wired in the app.
            </Text>

            <EditorField
              label="Item Name"
              value={menuForm.name}
              placeholder="Cappuccino"
              onChangeText={value => {
                updateMenuForm(current => ({ ...current, name: value }));
              }}
            />
            <EditorField
              label="Category"
              value={menuForm.category}
              placeholder="Coffee"
              onChangeText={value => {
                updateMenuForm(current => ({ ...current, category: value }));
              }}
            />
            <EditorField
              label="Price"
              value={menuForm.price}
              placeholder="199"
              keyboardType="decimal-pad"
              onChangeText={value => {
                updateMenuForm(current => ({ ...current, price: value }));
              }}
            />
            <EditorField
              label="Spice Level"
              value={menuForm.spiceLevel}
              placeholder="0"
              keyboardType="number-pad"
              onChangeText={value => {
                updateMenuForm(current => ({ ...current, spiceLevel: value }));
              }}
            />
            <EditorField
              label="Image URL"
              value={menuForm.image}
              placeholder="https://..."
              onChangeText={value => {
                updateMenuForm(current => ({ ...current, image: value }));
              }}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Vegetarian</Text>
                <Text style={styles.switchSubtitle}>
                  Mark the dish exactly the way the current mobile data model expects.
                </Text>
              </View>
              <ToggleSwitch
                value={menuForm.veg}
                onValueChange={value => {
                  updateMenuForm(current => ({ ...current, veg: value }));
                }}
              />
            </View>

            {currentEditingItem?.description ? (
              <View style={styles.noteCard}>
                <Text style={styles.noteLabel}>Current description</Text>
                <Text style={styles.noteText}>{currentEditingItem.description}</Text>
              </View>
            ) : null}

            {managerError ? (
              <View style={styles.inlineErrorWrap}>
                <GlassSurface
                  depth="card"
                  intensity={64}
                  overlayColor="rgba(225, 161, 141, 0.14)"
                  style={styles.inlineErrorCard}
                >
                  <Text style={styles.inlineErrorText}>{managerError}</Text>
                </GlassSurface>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Discard"
                variant="ghost"
                onPress={closeEditor}
                style={styles.modalAction}
              />
              <PrimaryButton
                title={editingId ? 'Save Item' : 'Create Item'}
                onPress={() => {
                  void saveMenuItem();
                }}
                disabled={!isFormValid || isSaving}
                loading={isSaving}
                style={styles.modalAction}
              />
            </View>

            {editingId ? (
              <PrimaryButton
                title="Delete Item"
                variant="secondary"
                onPress={() => handleDeleteItem(editingId)}
              />
            ) : null}

            {isSaving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={adminPalette.caramelSoft} size="small" />
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: adminPalette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
    gap: 16,
  },
  headerContent: {
    gap: 20,
  },
  titleBlock: {
    gap: 10,
  },
  eyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: adminPalette.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: adminPalette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  tabsRow: {
    gap: 10,
  },
  tabWrap: {
    borderRadius: adminRadius.pill,
  },
  tabPill: {
    borderRadius: adminRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabPillActive: {
    backgroundColor: 'rgba(200, 146, 99, 0.18)',
  },
  tabLabel: {
    color: adminPalette.textSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: adminPalette.caramelSoft,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfStat: {
    width: '48.2%',
  },
  errorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  errorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 16,
  },
  errorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  emptyCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: adminPalette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 6, 0.6)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: adminPalette.backdrop,
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  modalEyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: adminPalette.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: adminPalette.ghost,
    borderRadius: adminRadius.control,
    color: adminPalette.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    backgroundColor: adminPalette.ghost,
    borderRadius: adminRadius.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchCopy: {
    flex: 1,
    gap: 6,
  },
  switchTitle: {
    color: adminPalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  switchSubtitle: {
    color: adminPalette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  noteCard: {
    backgroundColor: adminPalette.ghost,
    borderRadius: adminRadius.card,
    padding: 14,
    gap: 6,
  },
  noteLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noteText: {
    color: adminPalette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineErrorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  inlineErrorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 14,
  },
  inlineErrorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalAction: {
    flex: 1,
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
