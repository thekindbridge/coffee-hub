import { collection, onSnapshot } from 'firebase/firestore';
import type { MenuItem } from '../../types';
import { mapMenuDocToMenuItem } from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const subscribeToAvailableMenuItems = (
  onData: (items: MenuItem[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, 'menu_items'),
  snapshot => {
    const items = snapshot.docs
      .map(mapMenuDocToMenuItem)
      .filter(item => item.is_available);
    onData(items);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load menu items.'));
  },
);
