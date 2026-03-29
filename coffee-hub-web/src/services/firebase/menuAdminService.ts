import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import type { MenuItem } from '../../types';
import { mapMenuDocToMenuItem } from '../../features/app/lib/firestoreMappers';
import { db } from './index';

const MENU_COLLECTION = 'menu_items';

export type AdminMenuItemInput = {
  name: string;
  category: string;
  price: number;
  image: string;
  spiceLevel: number;
  veg: boolean;
};

export const subscribeToAdminMenuItems = (
  onData: (items: MenuItem[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, MENU_COLLECTION), orderBy('name')),
  snapshot => {
    onData(snapshot.docs.map(mapMenuDocToMenuItem));
  },
  error => {
    onError(error instanceof Error ? error : new Error('Unable to load menu items.'));
  },
);

export const createAdminMenuItem = async (input: AdminMenuItemInput) => {
  await addDoc(collection(db, MENU_COLLECTION), {
    name: input.name.trim(),
    category: input.category.trim(),
    price: input.price,
    image: input.image.trim(),
    spiceLevel: input.spiceLevel,
    veg: input.veg,
    isAvailable: true,
  });
};

export const updateAdminMenuItem = async (
  menuItemId: string,
  input: AdminMenuItemInput,
  isAvailable: boolean,
) => {
  await updateDoc(doc(db, MENU_COLLECTION, menuItemId), {
    name: input.name.trim(),
    category: input.category.trim(),
    price: input.price,
    image: input.image.trim(),
    spiceLevel: input.spiceLevel,
    veg: input.veg,
    isAvailable,
  });
};

export const deleteAdminMenuItem = async (menuItemId: string) => {
  await deleteDoc(doc(db, MENU_COLLECTION, menuItemId));
};

export const setAdminMenuItemAvailability = async (
  menuItemId: string,
  isAvailable: boolean,
) => {
  await updateDoc(doc(db, MENU_COLLECTION, menuItemId), { isAvailable });
};
