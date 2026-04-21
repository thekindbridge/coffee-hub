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
import { normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import type { AccessEntry, UserRole } from '../../features/app/types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const mapRoleEntries = (
  entries: AccessEntry[],
) => entries.sort((a, b) => a.phone.localeCompare(b.phone));

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const mapUserRoleEntries = (
  docs: Array<{ data: () => Record<string, unknown>; id: string }>,
) => mapRoleEntries(
  docs.flatMap(docSnapshot => {
    const data = docSnapshot.data();
    const phoneValue = typeof data.phone === 'string'
      ? safeNormalizePhoneNumber(data.phone)
      : '';
    if (!phoneValue) {
      return [];
    }

    return [{
      id: docSnapshot.id,
      uid: docSnapshot.id,
      phone: phoneValue,
      role: normalizeRole(data.role),
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

export const seedMainAdminRole = async (adminPhone: string) => {
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

export const subscribeToRoleStatus = (
  normalizedPhone: string,
  role: Extract<UserRole, 'admin' | 'agent'>,
  onData: (hasRole: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'users'),
    where('phone', '==', normalizePhoneNumber(normalizedPhone)),
    where('role', '==', role),
    limit(1),
  ),
  snapshot => {
    onData(!snapshot.empty);
  },
  error => {
    onError(toAppServiceError(error, `Unable to verify ${role} role.`));
  },
);

export const subscribeToAdminRoleEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'users'), where('role', '==', 'admin')),
  snapshot => {
    onData(mapUserRoleEntries(snapshot.docs));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load admin role entries.'));
  },
);

export const subscribeToAgentRoleEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'users'), where('role', '==', 'agent')),
  snapshot => {
    onData(mapUserRoleEntries(snapshot.docs));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load delivery agent role entries.'));
  },
);

export const subscribeToUserRoleEntries = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, 'users'),
  snapshot => {
    onData(mapUserRoleEntries(snapshot.docs));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load user role entries.'));
  },
);

export const addAdminRoleEntry = async (phoneNumber: string) => {
  try {
    await updateUserRoleByPhone(normalizePhoneNumber(phoneNumber), 'admin');
  } catch (error) {
    throw toAppServiceError(error, 'Unable to add admin role.', 'network');
  }
};

export const removeAdminRoleEntry = async (entryId: string) => {
  try {
    await updateDoc(doc(db, 'users', entryId), {
      role: 'customer',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove admin role.', 'network');
  }
};

export const addAgentRoleEntry = async (phoneNumber: string) => {
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

export const removeAgentRoleEntry = async (entryId: string) => {
  try {
    await updateDoc(doc(db, 'users', entryId), {
      role: 'customer',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove delivery agent role.', 'network');
  }
};

export const updateUserRoleEntry = async (
  entryId: string,
  phoneNumber: string,
  role: UserRole,
) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    await updateDoc(doc(db, 'users', entryId), {
      phone: normalizedPhone,
      role,
      updatedAt: serverTimestamp(),
    });

    if (!normalizedPhone) {
      return;
    }

    if (role === 'agent') {
      await setDoc(
        doc(db, 'agents', normalizedPhone),
        {
          accessOnly: false,
          isActive: false,
          phone: normalizedPhone,
          role: 'agent',
          status: 'OFFLINE',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return;
    }

    await setDoc(
      doc(db, 'agents', normalizedPhone),
      {
        accessOnly: true,
        isActive: false,
        phone: normalizedPhone,
        role,
        status: 'OFFLINE',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to update the user role.', 'network');
  }
};
