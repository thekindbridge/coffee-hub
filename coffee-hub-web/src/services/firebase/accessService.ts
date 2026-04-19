import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { AccessEntry } from '../../features/app/types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const mapAccessEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.email.localeCompare(b.email));

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const mapUserRoleEntries = (
  docs: Array<{ data: () => Record<string, unknown>; id: string }>,
  role: AccessEntry['role'],
) => mapAccessEntries(
  docs.flatMap(docSnapshot => {
    const data = docSnapshot.data();
    const emailValue = ((data.email as string) || '').trim().toLowerCase();
    if (!emailValue) {
      return [];
    }

    return [{
      id: docSnapshot.id,
      email: emailValue,
      role,
    } satisfies AccessEntry];
  }),
);

const findUserDocByEmail = async (normalizedEmail: string) => {
  const snapshot = await getDocs(
    query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      limit(1),
    ),
  );

  return snapshot.docs[0] || null;
};

const updateUserRoleByEmail = async (
  normalizedEmail: string,
  role: 'admin' | 'agent',
) => {
  const userDoc = await findUserDocByEmail(normalizedEmail);
  if (!userDoc) {
    throw new Error('Ask this user to sign in once before assigning a role.');
  }

  await updateDoc(doc(db, 'users', userDoc.id), {
    role,
    updatedAt: serverTimestamp(),
  });

  return userDoc.id;
};

export const seedMainAdminAccess = async (adminEmail: string) => {
  const normalizedEmail = normalizeEmail(adminEmail);
  if (!normalizedEmail) {
    return;
  }

  try {
    const userDoc = await findUserDocByEmail(normalizedEmail);
    if (!userDoc) {
      return;
    }

    await updateDoc(doc(db, 'users', userDoc.id), {
      role: 'admin',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to seed admin role.', 'network');
  }
};

export const subscribeToAdminAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'users'),
    where('email', '==', normalizeEmail(normalizedEmail)),
    where('role', '==', 'admin'),
    limit(1),
  ),
  snapshot => {
    onData(!snapshot.empty);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify admin role.'));
  },
);

export const subscribeToDeliveryAccessStatus = (
  normalizedEmail: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'users'),
    where('email', '==', normalizeEmail(normalizedEmail)),
    where('role', '==', 'agent'),
    limit(1),
  ),
  snapshot => {
    onData(!snapshot.empty);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to verify delivery agent role.'));
  },
);

export const subscribeToAdminAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'users'), where('role', '==', 'admin')),
  snapshot => {
    onData(mapUserRoleEntries(snapshot.docs, 'admin'));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load admin role entries.'));
  },
);

export const subscribeToDeliveryAccessEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'users'), where('role', '==', 'agent')),
  snapshot => {
    onData(mapUserRoleEntries(snapshot.docs, 'agent'));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load delivery agent role entries.'));
  },
);

export const addAdminAccessEntry = async (normalizedEmail: string) => {
  try {
    await updateUserRoleByEmail(normalizeEmail(normalizedEmail), 'admin');
  } catch (error) {
    throw toAppServiceError(error, 'Unable to add admin role.', 'network');
  }
};

export const removeAdminAccessEntry = async (entryId: string) => {
  try {
    await updateDoc(doc(db, 'users', entryId), {
      role: 'customer',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove admin role.', 'network');
  }
};

export const addDeliveryAccessEntry = async (normalizedEmail: string) => {
  const email = normalizeEmail(normalizedEmail);

  try {
    await updateUserRoleByEmail(email, 'agent');
    await setDoc(
      doc(db, 'agents', email),
      {
        accessOnly: true,
        email,
        isActive: false,
        role: 'agent',
        status: 'OFFLINE',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to add delivery agent role.', 'network');
  }
};

export const removeDeliveryAccessEntry = async (entryId: string) => {
  try {
    await updateDoc(doc(db, 'users', entryId), {
      role: 'customer',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove delivery agent role.', 'network');
  }
};
