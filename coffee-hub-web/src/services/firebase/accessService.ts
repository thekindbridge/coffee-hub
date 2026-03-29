import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AccessEntry } from '../../features/app/types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const mapAccessEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.email.localeCompare(b.email));

export const seedMainAdminAccess = async (adminEmail: string) => {
  try {
    await setDoc(
      doc(db, 'admin_access', adminEmail),
      {
        email: adminEmail,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to seed admin access.', 'network');
  }
};

export const subscribeToAdminAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'admin_access', normalizedEmail),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify admin access.'));
  },
);

export const subscribeToDeliveryAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'agents', normalizedEmail),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify delivery access.'));
  },
);

export const subscribeToAdminAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, 'admin_access'),
  snapshot => {
    const entries = snapshot.docs.flatMap(docSnapshot => {
      const data = docSnapshot.data() as Record<string, unknown>;
      const emailValue = ((data.email as string) || docSnapshot.id || '')
        .trim()
        .toLowerCase();
      if (!emailValue) {
        return [];
      }

      return [{
        id: docSnapshot.id,
        email: emailValue,
        role: 'admin',
      } satisfies AccessEntry];
    });

    onData(mapAccessEntries(entries));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load admin access entries.'));
  },
);

export const subscribeToDeliveryAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, 'agents'),
  snapshot => {
    const entries = snapshot.docs.flatMap(docSnapshot => {
      const data = docSnapshot.data() as Record<string, unknown>;
      const emailValue = ((data.email as string) || '').trim().toLowerCase();
      if (!emailValue) {
        return [];
      }

      return [{
        id: docSnapshot.id,
        email: emailValue,
        role: ((data.role as AccessEntry['role']) || 'delivery'),
        accessOnly: data.accessOnly === true,
      } satisfies AccessEntry];
    });

    onData(mapAccessEntries(entries));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load delivery access entries.'));
  },
);

export const addAdminAccessEntry = async (normalizedEmail: string) => {
  try {
    await setDoc(
      doc(db, 'admin_access', normalizedEmail),
      {
        email: normalizedEmail,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to add admin access.', 'network');
  }
};

export const removeAdminAccessEntry = async (entryId: string) => {
  try {
    await deleteDoc(doc(db, 'admin_access', entryId));
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove admin access.', 'network');
  }
};

export const addDeliveryAccessEntry = async (normalizedEmail: string) => {
  try {
    await setDoc(
      doc(db, 'agents', normalizedEmail),
      {
        email: normalizedEmail,
        role: 'delivery',
        accessOnly: true,
        isActive: false,
        status: 'OFFLINE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to add delivery access.', 'network');
  }
};

export const removeDeliveryAccessEntry = async (entryId: string) => {
  try {
    await deleteDoc(doc(db, 'agents', entryId));
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove delivery access.', 'network');
  }
};
