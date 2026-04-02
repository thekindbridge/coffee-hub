import {
  collection,
  getDocs,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import type { MenuItem } from '../types';
import { toAppServiceError } from './serviceError';
import { getFirebaseDb } from './firebase';

const MENU_COLLECTION = 'menu_items';

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
    name: ((data.name as string) || '').trim(),
    category: ((data.category as string) || 'Other').trim(),
    price: toNumber(data.price),
    spice_level: toNumber(data.spiceLevel ?? data.spice_level),
    is_veg: Boolean(data.veg ?? data.is_veg ?? true),
    rating: toNumber(data.rating),
    image_url: ((data.image as string) || (data.image_url as string) || '').trim(),
    description: ((data.description as string) || '').trim(),
    is_available: data.isAvailable !== false && data.is_available !== false,
  };
};

export const getMenuItems = async () => {
  try {
    const snapshot = await getDocs(collection(getFirebaseDb(), MENU_COLLECTION));
    const items = snapshot.docs
      .map(mapMenuDocToMenuItem)
      .filter(item => item.is_available)
      .sort((left, right) => left.name.localeCompare(right.name));

    console.log('Menu items:', items);
    return items;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to load menu items.', 'network');
  }
};

export const fetchMenu = getMenuItems;
