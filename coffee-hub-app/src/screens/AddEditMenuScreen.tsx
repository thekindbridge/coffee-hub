import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { RoleScreenFrame } from '../features/roles/components/RoleScreenFrame';
import { useAdminMenuManager } from '../hooks/useAdminMenuManager';
import type { AdminStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type AddEditMenuNavigation = NativeStackNavigationProp<AdminStackParamList>;

interface RouteParams {
  itemId?: string;
  existingItem?: {
    id: string;
    name: string;
    category: string;
    price: number;
    image_url: string;
    spice_level: number;
    is_veg: boolean;
    is_available: boolean;
  };
}

export function AddEditMenuScreen() {
  const navigation = useNavigation<AddEditMenuNavigation>();
  const route = useRoute();
  const styles = useThemedStyles(createStyles);
  const params = route.params as RouteParams;

  const {
    menuForm,
    isSaving,
    managerError,
    isFormValid,
    updateMenuForm,
    saveMenuItem,
  } = useAdminMenuManager();

  const isEditing = !!params.itemId;
  const title = isEditing ? 'Edit Product' : 'Add New Product';

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (params.existingItem) {
      const item = params.existingItem;
      updateMenuForm(current => ({
        ...current,
        name: item.name,
        category: item.category,
        price: String(item.price),
        image: item.image_url,
        spiceLevel: String(item.spice_level),
        veg: item.is_veg,
      }));
      setImagePreview(item.image_url);
    }
  }, [params.existingItem, updateMenuForm]);

  const handleSave = async () => {
    await saveMenuItem();
    Alert.alert(
      'Success',
      isEditing ? 'Product updated successfully!' : 'Product added successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const validateField = (field: string): string => {
    switch (field) {
      case 'name':
        return menuForm.name.trim().length === 0 ? 'Product name is required' : '';
      case 'category':
        return menuForm.category.trim().length === 0 ? 'Category is required' : '';
      case 'price':
        const priceNum = Number(menuForm.price);
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
          return 'Price must be greater than 0';
        }
        return '';
      case 'image':
        return menuForm.image.trim().length === 0 ? 'Image URL is required' : '';
      case 'spiceLevel':
        const spiceLevelNum = Number(menuForm.spiceLevel);
        if (!Number.isFinite(spiceLevelNum) || spiceLevelNum < 0 || spiceLevelNum > 5) {
          return 'Spice level must be between 0 and 5';
        }
        return '';
      default:
        return '';
    }
  };

  const getFieldError = (field: string) => {
    const error = validateField(field);
    return error ? <Text style={styles.fieldError}>{error}</Text> : null;
  };

  const updateMenuFormField = (field: string, value: string | boolean) => {
    updateMenuForm(current => ({ ...current, [field]: value }));
    
    // Update image preview when URL changes
    if (field === 'image' && typeof value === 'string') {
      setImagePreview(value.trim());
    }
  };

  return (
    <RoleScreenFrame
      eyebrow="Menu editor"
      title={title}
      subtitle={isEditing ? 'Update product details' : 'Add new product to your menu'}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Error Display */}
          {managerError ? (
            <CardContainer style={styles.errorCard}>
              <Text style={styles.errorText}>{managerError}</Text>
            </CardContainer>
          ) : null}

          {/* Product Image */}
          <CardContainer style={styles.section}>
            <Text style={styles.sectionTitle}>Product Image</Text>
            <View style={styles.imageContainer}>
              {imagePreview ? (
                <Image 
                  source={{ uri: imagePreview }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={48} color="#999" />
                  <Text style={styles.imagePlaceholderText}>No image</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={menuForm.image}
              onChangeText={value => updateMenuFormField('image', value)}
              placeholder="Image URL"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getFieldError('image')}
          </CardContainer>

          {/* Basic Information */}
          <CardContainer style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <TextInput
              style={styles.input}
              value={menuForm.name}
              onChangeText={value => updateMenuFormField('name', value)}
              placeholder="Product name"
              placeholderTextColor="#999"
            />
            {getFieldError('name')}

            <TextInput
              style={styles.input}
              value={menuForm.category}
              onChangeText={value => updateMenuFormField('category', value)}
              placeholder="Category"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
            {getFieldError('category')}

            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={menuForm.price}
                onChangeText={value => updateMenuFormField('price', value)}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            {getFieldError('price')}
          </CardContainer>

          {/* Product Attributes */}
          <CardContainer style={styles.section}>
            <Text style={styles.sectionTitle}>Product Attributes</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Spice Level (0-5):</Text>
              <View style={styles.spiceLevelContainer}>
                <Text style={styles.spiceLevelValue}>{menuForm.spiceLevel}</Text>
                <View style={styles.spiceButtons}>
                  {[0, 1, 2, 3, 4, 5].map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.spiceButton,
                        Number(menuForm.spiceLevel) === level && styles.spiceButtonActive,
                      ]}
                      onPress={() => updateMenuFormField('spiceLevel', String(level))}
                    >
                      <Text style={[
                        styles.spiceButtonText,
                        Number(menuForm.spiceLevel) === level && styles.spiceButtonTextActive,
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.checkbox, menuForm.veg && styles.checked]}
                onPress={() => updateMenuFormField('veg', !menuForm.veg)}
              >
                {menuForm.veg && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </TouchableOpacity>
              <View>
                <Text style={styles.label}>Vegetarian</Text>
                <Text style={styles.labelDescription}>
                  {menuForm.veg ? '🌱 This product is vegetarian' : '🍖 This product contains non-vegetarian ingredients'}
                </Text>
              </View>
            </View>
          </CardContainer>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <PrimaryButton
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="secondary"
              style={styles.cancelButton}
            />
            <PrimaryButton
              title={isSaving ? 'Saving...' : 'Save Product'}
              onPress={handleSave}
              disabled={!isFormValid || isSaving}
              loading={isSaving}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  currencySymbol: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  labelDescription: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  spiceLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spiceLevelValue: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
    minWidth: 30,
    textAlign: 'center',
  },
  spiceButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  spiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spiceButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  spiceButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  spiceButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  checked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  errorCard: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body,
    textAlign: 'center',
  },
  fieldError: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
});
