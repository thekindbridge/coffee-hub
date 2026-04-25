import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AccessEntry } from '../features/app/types';
import { toAppServiceError } from './platform/serviceError';
import { db } from './firebase';
import { normalizePhoneNumber, safeNormalizePhoneNumber } from '../../shared/phone';
import {
  normalizeManagedUserRole,
  resolveUserRole,
  type ManagedUserRole,
  type UserRole,
  USER_ROLES_COLLECTION,
} from '../../shared/userRole';

const MAIN_ADMIN_PHONE = safeNormalizePhoneNumber(import.meta.env.VITE_MAIN_ADMIN_PHONE || '');

const sortEntries = (entries: AccessEntry[]) =>
  entries.sort((leftEntry, rightEntry) => leftEntry.phone.localeCompare(rightEntry.phone));

const mapRoleEntry = (
  docId: string,
  data: Record<string, unknown> | undefined,
): AccessEntry | null => {
  const normalizedPhone = safeNormalizePhoneNumber(docId);
  const role = normalizeManagedUserRole(data?.role);

  if (!normalizedPhone || !role) {
    return null;
  }

  return {
    id: normalizedPhone,
    phone: normalizedPhone,
    role,
  };
};

const createRoleDocumentPayload = async (
  normalizedPhone: string,
  role: ManagedUserRole,
) => {
  const roleRef = doc(db, USER_ROLES_COLLECTION, normalizedPhone);
  const existingSnapshot = await getDoc(roleRef);

  return {
    roleRef,
    payload: existingSnapshot.exists()
      ? {
          role,
          updatedAt: serverTimestamp(),
        }
      : {
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
  };
};

export const getMainAdminPhone = () => MAIN_ADMIN_PHONE;

export const getUserRole = async (phone: string): Promise<UserRole> => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return 'customer';
  }

  if (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE) {
    return 'owner';
  }

  try {
    const snapshot = await getDoc(doc(db, USER_ROLES_COLLECTION, normalizedPhone));
    return resolveUserRole({
      phone: normalizedPhone,
      mainAdminPhone: MAIN_ADMIN_PHONE,
      storedRole: snapshot.data()?.role,
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to resolve the user role.', 'network');
  }
};

export const subscribeToUserRole = (
  phone: string,
  onData: (role: UserRole) => void,
  onError: (error: Error) => void,
) => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone) {
    onData('customer');
    return () => undefined;
  }

  if (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE) {
    onData('owner');
    return () => undefined;
  }

  return onSnapshot(
    doc(db, USER_ROLES_COLLECTION, normalizedPhone),
    snapshot => {
      onData(resolveUserRole({
        phone: normalizedPhone,
        mainAdminPhone: MAIN_ADMIN_PHONE,
        storedRole: snapshot.data()?.role,
      }));
    },
    error => {
      onError(toAppServiceError(error, 'Unable to subscribe to the user role.'));
    },
  );
};

export const subscribeToRoleAssignments = (
  onData: (entries: AccessEntry[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, USER_ROLES_COLLECTION),
  snapshot => {
    onData(sortEntries(
      snapshot.docs.flatMap(roleSnapshot => {
        const entry = mapRoleEntry(
          roleSnapshot.id,
          roleSnapshot.data() as Record<string, unknown>,
        );

        return entry ? [entry] : [];
      }),
    ));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load role assignments.'));
  },
);

export const assignUserRole = async (
  phoneNumber: string,
  role: ManagedUserRole,
) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    throw new Error('Enter a valid mobile number.');
  }

  if (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE) {
    throw new Error('The owner account is managed by MAIN_ADMIN_PHONE and cannot be reassigned.');
  }

  try {
    const { payload, roleRef } = await createRoleDocumentPayload(normalizedPhone, role);
    await setDoc(roleRef, payload, { merge: true });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to save the role assignment.', 'network');
  }
};

export const removeUserRole = async (phoneNumber: string) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    throw new Error('Enter a valid mobile number.');
  }

  if (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE) {
    throw new Error('The owner account is managed by MAIN_ADMIN_PHONE and cannot be removed.');
  }

  try {
    await deleteDoc(doc(db, USER_ROLES_COLLECTION, normalizedPhone));
  } catch (error) {
    throw toAppServiceError(error, 'Unable to remove the role assignment.', 'network');
  }
};
