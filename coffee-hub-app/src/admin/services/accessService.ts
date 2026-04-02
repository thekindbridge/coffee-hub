import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AccessEntry } from '../types';
import { getFirebaseDb } from '../../services/firebase';

const mapAccessEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.email.localeCompare(b.email));

export const seedMainAdminAccess = async (adminEmail: string) => {
  try {
    await setDoc(
      doc(getFirebaseDb(), 'admin_access', adminEmail),
      {
        email: adminEmail,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw new Error(`Unable to seed admin access: ${error}`);
  }
};

export const subscribeToAdminAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(getFirebaseDb(), 'admin_access', normalizedEmail),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(new Error(`Unable to verify admin access: ${error}`));
  },
);

export const subscribeToDeliveryAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(getFirebaseDb(), 'agents', normalizedEmail),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(new Error(`Unable to verify delivery access: ${error}`));
  },
);

export const subscribeToAdminAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), 'admin_access'),
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
    onError(new Error(`Unable to load admin access entries: ${error}`));
  },
);

export const subscribeToDeliveryAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), 'agents'),
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
    onError(new Error(`Unable to load delivery access entries: ${error}`));
  },
);

export const addAdminAccessEntry = async (normalizedEmail: string) => {
  try {
    await setDoc(
      doc(getFirebaseDb(), 'admin_access', normalizedEmail),
      {
        email: normalizedEmail,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw new Error(`Unable to add admin access: ${error}`);
  }
};

export const removeAdminAccessEntry = async (entryId: string) => {
  try {
    await deleteDoc(doc(getFirebaseDb(), 'admin_access', entryId));
  } catch (error) {
    throw new Error(`Unable to remove admin access: ${error}`);
  }
};

export const addDeliveryAccessEntry = async (normalizedEmail: string) => {
  try {
    await setDoc(
      doc(getFirebaseDb(), 'agents', normalizedEmail),
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
    throw new Error(`Unable to add delivery access: ${error}`);
  }
};

export const removeDeliveryAccessEntry = async (entryId: string) => {
  try {
    await deleteDoc(doc(getFirebaseDb(), 'agents', entryId));
  } catch (error) {
    throw new Error(`Unable to remove delivery access: ${error}`);
  }
};
