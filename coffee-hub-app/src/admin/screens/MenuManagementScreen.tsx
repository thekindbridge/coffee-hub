import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminMenuManager } from '../hooks';
import type { MenuItem } from '../types';
import { CURRENCY_SYMBOL } from '../utils/constants';

export function MenuManagementScreen() {
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

  const handleDeleteItem = (menuItemId: string) => {
    Alert.alert(
      'Delete Menu Item',
      'Do you want to permanently remove this menu item?',
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

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Menu Editor</Text>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>
            Create, edit, delete, and toggle live availability for menu items.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
          <Ionicons color="#111111" name="add" size={18} />
          <Text style={styles.primaryButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {managerError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{managerError}</Text>
        </View>
      ) : null}

      {isEditorOpen ? (
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>
            {editingId ? 'Edit Menu Item' : 'Create Menu Item'}
          </Text>

          <TextInput
            placeholder="Item name"
            placeholderTextColor="#6F655E"
            style={styles.input}
            value={menuForm.name}
            onChangeText={value => {
              updateMenuForm(current => ({ ...current, name: value }));
            }}
          />

          <TextInput
            placeholder="Category"
            placeholderTextColor="#6F655E"
            style={styles.input}
            value={menuForm.category}
            onChangeText={value => {
              updateMenuForm(current => ({ ...current, category: value }));
            }}
          />

          <TextInput
            placeholder="Price"
            placeholderTextColor="#6F655E"
            keyboardType="decimal-pad"
            style={styles.input}
            value={menuForm.price}
            onChangeText={value => {
              updateMenuForm(current => ({ ...current, price: value }));
            }}
          />

          <TextInput
            placeholder="Spice level (0 - 5)"
            placeholderTextColor="#6F655E"
            keyboardType="number-pad"
            style={styles.input}
            value={menuForm.spiceLevel}
            onChangeText={value => {
              updateMenuForm(current => ({ ...current, spiceLevel: value }));
            }}
          />

          <TextInput
            placeholder="Image URL"
            placeholderTextColor="#6F655E"
            style={styles.input}
            value={menuForm.image}
            onChangeText={value => {
              updateMenuForm(current => ({ ...current, image: value }));
            }}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Vegetarian</Text>
              <Text style={styles.switchSubtitle}>
                Match the existing web admin payload fields.
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#413831', true: '#8B5E3C' }}
              thumbColor="#FFFFFF"
              value={menuForm.veg}
              onValueChange={value => {
                updateMenuForm(current => ({ ...current, veg: value }));
              }}
            />
          </View>

          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={closeEditor}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!isFormValid || isSaving}
              style={[styles.primaryButton, (!isFormValid || isSaving) && styles.disabledButton]}
              onPress={() => {
                void saveMenuItem();
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#111111" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editingId ? 'Update Item' : 'Create Item'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {editingId ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                handleDeleteItem(editingId);
              }}
            >
              <Ionicons color="#F0B1B1" name="trash-outline" size={16} />
              <Text style={styles.deleteButtonText}>Delete Item</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const hasImage = item.image_url.trim().length > 0;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTopRow}>
            <View style={styles.imageWrap}>
              {hasImage ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              ) : (
                <View style={styles.imageFallback}>
                  <Ionicons color="#8B5E3C" name="image-outline" size={20} />
                </View>
              )}
            </View>

            <View style={styles.itemMeta}>
              <View style={styles.itemHeadingRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[
                  styles.liveBadge,
                  item.is_available ? styles.liveBadgeOn : styles.liveBadgeOff,
                ]}>
                  <Text style={[
                    styles.liveBadgeText,
                    item.is_available ? styles.liveBadgeTextOn : styles.liveBadgeTextOff,
                  ]}>
                    {item.is_available ? 'Live' : 'Off'}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemPrice}>{CURRENCY_SYMBOL}{item.price}</Text>
              <Text style={styles.itemSubMeta}>
                Spice {item.spice_level} • {item.is_veg ? 'Veg' : 'Non-veg'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              editMenuItem(item);
            }}
          >
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              void toggleAvailability(item.id, item.is_available);
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {item.is_available ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButtonInline}
            onPress={() => {
              handleDeleteItem(item.id);
            }}
          >
            <Ionicons color="#F0B1B1" name="trash-outline" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={menuItems}
        keyExtractor={item => item.id}
        renderItem={renderMenuItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No menu items found in Firestore yet.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 16,
  },
  headerCopy: {
    marginBottom: 16,
  },
  eyebrow: {
    color: '#8B5E3C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#C48A5A',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(196, 138, 90, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#E8D6C7',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorCard: {
    backgroundColor: 'rgba(180, 72, 72, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: '#F0A4A4',
    fontSize: 14,
    lineHeight: 20,
  },
  editorCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  editorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchSubtitle: {
    color: '#8B8077',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 42,
  },
  deleteButtonText: {
    color: '#F0B1B1',
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  itemHeader: {
    marginBottom: 16,
  },
  itemTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  imageWrap: {
    borderRadius: 18,
    height: 72,
    overflow: 'hidden',
    width: 72,
  },
  itemImage: {
    height: '100%',
    width: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: 'rgba(196, 138, 90, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  itemHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  itemName: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  itemCategory: {
    color: '#A59A92',
    fontSize: 13,
    marginTop: 6,
  },
  itemPrice: {
    color: '#C48A5A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  itemSubMeta: {
    color: '#8B8077',
    fontSize: 12,
    marginTop: 6,
  },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeOn: {
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  liveBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  liveBadgeTextOn: {
    color: '#7ED595',
  },
  liveBadgeTextOff: {
    color: '#9A8F88',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteButtonInline: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
