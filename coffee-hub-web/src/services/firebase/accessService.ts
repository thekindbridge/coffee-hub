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
import { normalizePhoneNumber } from '../../../shared/phone';
import type { AccessEntry } from '../../features/app/types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const mapAccessEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.phone.localeCompare(b.phone));

const mapUserRoleEntries = (
  docs: Array<{ data: () => Record<string, unknown>; id: string }>,
  role: AccessEntry['role'],
) => mapAccessEntries(
  docs.flatMap(docSnapshot => {
    const data = docSnapshot.data();
    const phoneValue = typeof data.phone === 'string'
      ? normalizePhoneNumber(data.phone)
      : '';
    if (!phoneValue) {
      return [];
    }

    return [{
      id: docSnapshot.id,
      phone: phoneValue,
      role,
    } satisfies AccessEntry];
  }),
);

const findUserDocByPhone = async (normalizedPhone: string) => {
  const snapshot = await getDocs(
    query(
      collection(db, 'users'),
      where('phone', '==', normalizedPhone),
      limit(1),
    ),
  );

  return snapshot.docs[0] || null;
};

const updateUserRoleByPhone = async (
  normalizedPhone: string,
  role: 'admin' | 'agent',
) => {
  const userDoc = await findUserDocByPhone(normalizedPhone);
  if (!userDoc) {
    throw new Error('Ask this user to log in with OTP once before assigning a role.');
  }

  await updateDoc(doc(db, 'users', userDoc.id), {
    role,
    updatedAt: serverTimestamp(),
  });

  return userDoc.id;
};

export const seedMainAdminAccess = async (adminPhone: string) => {
  const normalizedPhone = normalizePhoneNumber(adminPhone);
  if (!normalizedPhone) {
    return;
  }

  try {
    const userDoc = await findUserDocByPhone(normalizedPhone);
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
  normalizedPhone: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'users'),
    where('phone', '==', normalizePhoneNumber(normalizedPhone)),
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
  normalizedPhone: string,
  onData: (hasAccess: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'users'),
    where('phone', '==', normalizePhoneNumber(normalizedPhone)),
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

export const addAdminAccessEntry = async (phoneNumber: string) => {
  try {
    await updateUserRoleByPhone(normalizePhoneNumber(phoneNumber), 'admin');
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

export const addDeliveryAccessEntry = async (phoneNumber: string) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    await updateUserRoleByPhone(normalizedPhone, 'agent');
    await setDoc(
      doc(db, 'agents', normalizedPhone),
      {
        accessOnly: true,
        isActive: false,
        phone: normalizedPhone,
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
