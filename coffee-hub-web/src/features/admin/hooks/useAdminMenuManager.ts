import { useEffect, useMemo, useState } from 'react';
import type { MenuItem } from '../../../types';
import {
  createAdminMenuItem,
  deleteAdminMenuItem,
  setAdminMenuItemAvailability,
  subscribeToAdminMenuItems,
  updateAdminMenuItem,
} from '../../../services/firebase/menuAdminService';

export type AdminMenuFormState = {
  name: string;
  category: string;
  price: string;
  image: string;
  spiceLevel: string;
  veg: boolean;
};

const INITIAL_FORM_STATE: AdminMenuFormState = {
  name: '',
  category: '',
  price: '',
  image: '',
  spiceLevel: '0',
  veg: true,
};

export const useAdminMenuManager = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuForm, setMenuForm] = useState<AdminMenuFormState>(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [managerError, setManagerError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminMenuItems(
      nextMenuItems => {
        setMenuItems(nextMenuItems);
        setManagerError('');
      },
      error => {
        console.error('Failed to load menu items for admin manager', error);
        setManagerError('Unable to load menu items right now.');
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const isFormValid = useMemo(() => {
    const priceNumber = Number(menuForm.price);
    const spiceLevelNumber = Number(menuForm.spiceLevel);

    return (
      menuForm.name.trim().length > 0 &&
      menuForm.category.trim().length > 0 &&
      Number.isFinite(priceNumber) &&
      priceNumber > 0 &&
      Number.isFinite(spiceLevelNumber) &&
      spiceLevelNumber >= 0 &&
      spiceLevelNumber <= 5
    );
  }, [menuForm]);

  const resetForm = () => {
    setMenuForm(INITIAL_FORM_STATE);
    setEditingId('');
  };

  const openCreate = () => {
    resetForm();
    setManagerError('');
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const editMenuItem = (item: MenuItem) => {
    setEditingId(item.id);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      image: item.image_url,
      spiceLevel: String(item.spice_level),
      veg: item.is_veg,
    });
    setManagerError('');
    setIsEditorOpen(true);
  };

  const updateMenuForm = (updater: (current: AdminMenuFormState) => AdminMenuFormState) => {
    setMenuForm(current => updater(current));
    if (managerError) {
      setManagerError('');
    }
  };

  const saveMenuItem = async () => {
    if (!isFormValid) {
      setManagerError('Please complete all fields with valid values.');
      return;
    }

    setIsSaving(true);
    setManagerError('');

    const payload = {
      name: menuForm.name,
      category: menuForm.category,
      price: Number(menuForm.price),
      image: menuForm.image,
      spiceLevel: Number(menuForm.spiceLevel),
      veg: menuForm.veg,
    };

    try {
      if (editingId) {
        const existingItem = menuItems.find(item => item.id === editingId);
        await updateAdminMenuItem(editingId, payload, existingItem?.is_available ?? true);
      } else {
        await createAdminMenuItem(payload);
      }

      closeEditor();
    } catch (error) {
      console.error('Failed to save menu item', error);
      setManagerError('Unable to save menu item right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMenuItem = async (menuItemId: string) => {
    try {
      await deleteAdminMenuItem(menuItemId);
      closeEditor();
    } catch (error) {
      console.error('Failed to delete menu item', error);
      setManagerError('Unable to delete product right now.');
    }
  };

  const toggleAvailability = async (menuItemId: string, isAvailable: boolean) => {
    try {
      await setAdminMenuItemAvailability(menuItemId, !isAvailable);
    } catch (error) {
      console.error('Failed to update menu item availability', error);
      setManagerError('Unable to update item availability right now.');
    }
  };

  return {
    menuItems,
    menuForm,
    editingId,
    isSaving,
    managerError,
    isEditorOpen,
    isFormValid,
    openCreate,
    closeEditor,
    editMenuItem,
    updateMenuForm,
    saveMenuItem,
    deleteMenuItem,
    toggleAvailability,
  };
};
