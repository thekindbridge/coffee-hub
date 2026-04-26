import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { MenuItem } from '../../types';
import { mapMenuDocToMenuItem } from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const MENU_COLLECTION = 'menu_items';

const sortMenuItems = (items: MenuItem[]) =>
  [...items].sort((leftItem, rightItem) => leftItem.name.localeCompare(rightItem.name));

export const subscribeToAvailableMenuItems = (
  onData: (items: MenuItem[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  // Keep the query to a single indexed filter and sort client-side to avoid
  // needing a composite Firestore index for normal menu reads.
  query(collection(db, MENU_COLLECTION), where('isAvailable', '==', true)),
  snapshot => {
    const items = sortMenuItems(snapshot.docs.map(mapMenuDocToMenuItem));
    onData(items);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load menu items.'));
  },
);
