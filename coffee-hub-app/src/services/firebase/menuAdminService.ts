import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import type { MenuItem } from '../../types';
import { sanitizeFirestoreData } from '../../utils/sanitizeFirestoreData';
import { toAppServiceError } from '../serviceError';
import { getFirebaseDb } from './index';

const MENU_COLLECTION = 'menu_items';

export type AdminMenuItemInput = {
  name: string;
  category: string;
  price: number;
  image: string;
  spiceLevel: number;
  veg: boolean;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const mapMenuDocToMenuItem = (snapshot: QueryDocumentSnapshot): MenuItem => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    id: snapshot.id,
    name: (data.name as string) || '',
    category: (data.category as string) || 'Other',
    price: toNumber(data.price),
    spice_level: toNumber(data.spiceLevel ?? data.spice_level),
    is_veg: Boolean(data.veg ?? data.is_veg ?? true),
    rating: toNumber(data.rating),
    image_url: ((data.image as string) || (data.image_url as string) || '').trim(),
    description: (data.description as string) || '',
    is_available: data.isAvailable !== false && data.is_available !== false,
  };
};

export const subscribeToAdminMenuItems = (
  onData: (items: MenuItem[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(getFirebaseDb(), MENU_COLLECTION), orderBy('name')),
  snapshot => {
    onData(snapshot.docs.map(mapMenuDocToMenuItem));
  },
  error => {
    console.error('Failed to load menu items for admin manager', error);
    onError(toAppServiceError(error, 'Unable to load menu items.'));
  },
);

export const createAdminMenuItem = async (input: AdminMenuItemInput) => {
  try {
    await addDoc(
      collection(getFirebaseDb(), MENU_COLLECTION),
      sanitizeFirestoreData({
        name: input.name.trim(),
        category: input.category.trim(),
        price: input.price,
        image: input.image.trim(),
        spiceLevel: input.spiceLevel,
        veg: input.veg,
        isAvailable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    console.error('Failed to create menu item', error);
    throw toAppServiceError(error, 'Unable to create the menu item.', 'network');
  }
};

export const updateAdminMenuItem = async (
  menuItemId: string,
  input: AdminMenuItemInput,
  isAvailable: boolean,
) => {
  try {
    await updateDoc(
      doc(getFirebaseDb(), MENU_COLLECTION, menuItemId),
      sanitizeFirestoreData({
        name: input.name.trim(),
        category: input.category.trim(),
        price: input.price,
        image: input.image.trim(),
        spiceLevel: input.spiceLevel,
        veg: input.veg,
        isAvailable,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    console.error('Failed to update menu item', error);
    throw toAppServiceError(error, 'Unable to update the menu item.', 'network');
  }
};

export const deleteAdminMenuItem = async (menuItemId: string) => {
  try {
    await deleteDoc(doc(getFirebaseDb(), MENU_COLLECTION, menuItemId));
  } catch (error) {
    console.error('Failed to delete menu item', error);
    throw toAppServiceError(error, 'Unable to delete the menu item.', 'network');
  }
};

export const setAdminMenuItemAvailability = async (
  menuItemId: string,
  isAvailable: boolean,
) => {
  try {
    await updateDoc(
      doc(getFirebaseDb(), MENU_COLLECTION, menuItemId),
      sanitizeFirestoreData({
        isAvailable,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    console.error('Failed to update menu item availability', error);
    throw toAppServiceError(error, 'Unable to update item availability.', 'network');
  }
};
