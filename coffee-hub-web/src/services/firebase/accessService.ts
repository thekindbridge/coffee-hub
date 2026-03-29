import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AccessEntry } from '../../features/app/types';
import { db } from './index';

const mapAccessEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.email.localeCompare(b.email));

export const seedMainAdminAccess = async (adminEmail: string) => {
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
    onError(error instanceof Error ? error : new Error('Unable to verify admin access.'));
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
    onError(error instanceof Error ? error : new Error('Unable to verify delivery access.'));
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
    onError(error instanceof Error ? error : new Error('Unable to load admin access entries.'));
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
    onError(error instanceof Error ? error : new Error('Unable to load delivery access entries.'));
  },
);

export const addAdminAccessEntry = async (normalizedEmail: string) => {
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
};

export const removeAdminAccessEntry = async (entryId: string) => {
  await deleteDoc(doc(db, 'admin_access', entryId));
};

export const addDeliveryAccessEntry = async (normalizedEmail: string) => {
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
};

export const removeDeliveryAccessEntry = async (entryId: string) => {
  await deleteDoc(doc(db, 'agents', entryId));
};
