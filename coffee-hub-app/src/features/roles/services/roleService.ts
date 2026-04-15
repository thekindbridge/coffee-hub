import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../../services/firebase';
import { toAppServiceError } from '../../../services/serviceError';
import { sanitizeFirestoreData } from '../../../utils/sanitizeFirestoreData';
import { normalizeEmail } from '../lib/normalizeEmail';
import type { RoleAccessEntry } from '../types';

export const OWNER_EMAIL = normalizeEmail(
  process.env.EXPO_PUBLIC_OWNER_EMAIL || 'coffeehubinkollu@gmail.com',
);

const mapAccessEntries = (entries: RoleAccessEntry[]) => (
  entries.sort((left, right) => left.email.localeCompare(right.email))
);

export const checkAdminAccess = async (email: string) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return false;
    }

    const snapshot = await getDoc(doc(getFirebaseDb(), 'admin_access', normalizedEmail));
    return snapshot.exists();
  } catch (error) {
    throw toAppServiceError(error, 'Unable to verify admin access.', 'network');
  }
};

export const checkDeliveryAccess = async (email: string) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return false;
    }

    const snapshot = await getDoc(doc(getFirebaseDb(), 'agents', normalizedEmail));
    return snapshot.exists();
  } catch (error) {
    throw toAppServiceError(error, 'Unable to verify delivery access.', 'network');
  }
};

export const seedOwnerAdmin = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || normalizedEmail !== OWNER_EMAIL) {
    return;
  }

  try {
    const hasAdminAccess = await checkAdminAccess(normalizedEmail);
    if (hasAdminAccess) {
      return;
    }

    await setDoc(
      doc(getFirebaseDb(), 'admin_access', normalizedEmail),
      sanitizeFirestoreData({
        createdAt: serverTimestamp(),
        email: normalizedEmail,
        role: 'admin',
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to seed owner admin access.', 'network');
  }
};

export const subscribeToAdminAccessStatus = (
  email: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(getFirebaseDb(), 'admin_access', normalizeEmail(email)),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify admin access.', 'network'));
  },
);

export const subscribeToDeliveryAccessStatus = (
  email: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(getFirebaseDb(), 'agents', normalizeEmail(email)),
  snapshot => {
    onData(snapshot.exists());
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify delivery access.', 'network'));
  },
);

export const subscribeToAdminAccessEntries = (
  onData: (entries: RoleAccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), 'admin_access'),
  snapshot => {
    const entries = snapshot.docs.flatMap(docSnapshot => {
      const data = docSnapshot.data() as Record<string, unknown>;
      const email = normalizeEmail((data.email as string) || docSnapshot.id);
      if (!email) {
        return [];
      }

      return [{
        email,
        id: docSnapshot.id,
        role: 'admin',
      } satisfies RoleAccessEntry];
    });

    onData(mapAccessEntries(entries));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load admin access entries.', 'network'));
  },
);

export const subscribeToDeliveryAccessEntries = (
  onData: (entries: RoleAccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), 'agents'),
  snapshot => {
    const entries = snapshot.docs.flatMap(docSnapshot => {
      const data = docSnapshot.data() as Record<string, unknown>;
      const email = normalizeEmail((data.email as string) || docSnapshot.id);
      if (!email) {
        return [];
      }

      return [{
        accessOnly: data.accessOnly === true,
        email,
        id: docSnapshot.id,
        role: 'delivery',
      } satisfies RoleAccessEntry];
    });

    onData(mapAccessEntries(entries));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load delivery access entries.', 'network'));
  },
);
