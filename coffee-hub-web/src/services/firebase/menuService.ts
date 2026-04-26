import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { MenuItem } from '../../types';
import { mapMenuDocToMenuItem } from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const subscribeToAvailableMenuItems = (
  onData: (items: MenuItem[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'menu_items'), where('isAvailable', '==', true), orderBy('name')),
  snapshot => {
    const items = snapshot.docs.map(mapMenuDocToMenuItem);
    onData(items);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load menu items.'));
  },
);
