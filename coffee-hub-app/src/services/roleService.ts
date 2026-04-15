import { doc, getDoc } from 'firebase/firestore';
import { normalizeEmail } from '../features/roles/lib/normalizeEmail';
import { getFirebaseDb } from './firebase';
import { toAppServiceError } from './serviceError';

export type UserRole = 'admin' | 'agent' | 'customer';

export const normalizeRoleEmail = (email: string) => normalizeEmail(email);

export async function getUserRole(email: string): Promise<UserRole> {
  const normalizedEmail = normalizeRoleEmail(email);
  if (!normalizedEmail) {
    return 'customer';
  }

  try {
    const db = getFirebaseDb();

    const adminSnapshot = await getDoc(doc(db, 'admin_access', normalizedEmail));
    if (adminSnapshot.exists()) {
      return 'admin';
    }

    const agentSnapshot = await getDoc(doc(db, 'agents', normalizedEmail));
    if (agentSnapshot.exists()) {
      return 'agent';
    }

    return 'customer';
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to verify your COFFEE-HUB role right now.',
      'network',
    );
  }
}
