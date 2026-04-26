import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [pendingMenuActionId, setPendingMenuActionId] = useState('');
  const [managerError, setManagerError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminMenuItems(
      nextMenuItems => {
        setMenuItems(nextMenuItems);
        setManagerError('');
      },
      () => {
        setManagerError('Something went wrong. Try again');
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

  const resetForm = useCallback(() => {
    setMenuForm(INITIAL_FORM_STATE);
    setEditingId('');
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setManagerError('');
    setIsEditorOpen(true);
  }, [resetForm]);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    resetForm();
  }, [resetForm]);

  const editMenuItem = useCallback((item: MenuItem) => {
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
  }, []);

  const updateMenuForm = useCallback((updater: (current: AdminMenuFormState) => AdminMenuFormState) => {
    setMenuForm(current => updater(current));
    if (managerError) {
      setManagerError('');
    }
  }, [managerError]);

  const saveMenuItem = async () => {
    if (isSavingRef.current) {
      return;
    }

    if (!isFormValid) {
      setManagerError('Please complete all fields with valid values.');
      return;
    }

    isSavingRef.current = true;
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
      setManagerError(error instanceof Error ? error.message : 'Something went wrong. Try again');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const deleteMenuItem = async (menuItemId: string) => {
    if (pendingMenuActionId) {
      return;
    }

    setPendingMenuActionId(menuItemId);
    try {
      await deleteAdminMenuItem(menuItemId);
      closeEditor();
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : 'Something went wrong. Try again');
    } finally {
      setPendingMenuActionId('');
    }
  };

  const toggleAvailability = async (menuItemId: string, isAvailable: boolean) => {
    if (pendingMenuActionId) {
      return;
    }

    setPendingMenuActionId(menuItemId);
    try {
      await setAdminMenuItemAvailability(menuItemId, !isAvailable);
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : 'Something went wrong. Try again');
    } finally {
      setPendingMenuActionId('');
    }
  };

  return {
    menuItems,
    menuForm,
    editingId,
    isSaving,
    pendingMenuActionId,
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
