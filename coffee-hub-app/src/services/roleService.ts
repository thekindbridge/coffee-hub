import { doc, getDoc } from 'firebase/firestore';
import { normalizeEmail } from '../features/roles/lib/normalizeEmail';
import { getFirebaseDb } from './firebase';
import { toAppServiceError } from './serviceError';

export type UserRole = 'admin' | 'agent' | 'customer';

export const normalizeRoleEmail = (email: string) => normalizeEmail(email);

const shouldFallbackToCustomerRole = (error: unknown) => {
  const maybeCode = typeof (error as { code?: unknown })?.code === 'string'
    ? String((error as { code: string }).code).toLowerCase()
    : '';
  const maybeMessage = typeof (error as { message?: unknown })?.message === 'string'
    ? String((error as { message: string }).message).toLowerCase()
    : '';

  return (
    maybeCode.includes('unavailable')
    || maybeCode.includes('deadline')
    || maybeCode.includes('network')
    || maybeMessage.includes('offline')
    || maybeMessage.includes('could not reach cloud firestore backend')
    || maybeMessage.includes('backend didn\'t respond')
    || maybeMessage.includes('network')
  );
};

export async function getUserRole(email: string): Promise<UserRole> {
  const normalizedEmail = normalizeRoleEmail(email);
  if (!normalizedEmail) {
    console.log('[roleService] resolve:missing-email -> customer');
    return 'customer';
  }

  try {
    const db = getFirebaseDb();
    console.log('[roleService] resolve:start', {
      email,
      normalizedEmail,
    });

    const adminSnapshot = await getDoc(doc(db, 'admin_access', normalizedEmail));
    if (adminSnapshot.exists()) {
      console.log('[roleService] resolve:admin', { normalizedEmail });
      return 'admin';
    }

    const agentSnapshot = await getDoc(doc(db, 'agents', normalizedEmail));
    if (agentSnapshot.exists()) {
      console.log('[roleService] resolve:agent', { normalizedEmail });
      return 'agent';
    }

    console.log('[roleService] resolve:customer', { normalizedEmail });
    return 'customer';
  } catch (error) {
    if (shouldFallbackToCustomerRole(error)) {
      console.warn('[roleService] resolve:fallback-customer', {
        normalizedEmail,
        error,
      });
      return 'customer';
    }

    throw toAppServiceError(
      error,
      'Unable to verify your COFFEE-HUB role right now.',
      'network',
    );
  }
}
