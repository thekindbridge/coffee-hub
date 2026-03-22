import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ADMIN_EMAIL } from '../lib/constants';
import type { AccessEntry } from '../types';

export type AccessRolesData = {
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  isMainAdmin: boolean;
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
};

/**
 * Verifies the current user's role (admin / delivery agent) using real-time
 * Firestore snapshots. Also loads access-entry lists for the admin panel.
 */
export const useAccessRoles = (
  currentUserEmail: string,
  normalizedCurrentEmail: string,
): AccessRolesData => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeliveryAgent, setIsDeliveryAgent] = useState(false);
  const [adminAccessEntries, setAdminAccessEntries] = useState<AccessEntry[]>([]);
  const [deliveryAccessEntries, setDeliveryAccessEntries] = useState<AccessEntry[]>([]);

  const isMainAdmin = normalizedCurrentEmail === ADMIN_EMAIL;

  // Role verification
  useEffect(() => {
    if (!currentUserEmail) {
      setIsAdmin(false);
      setIsDeliveryAgent(false);
      return;
    }

    const normalizedEmail = currentUserEmail.trim().toLowerCase();

    const adminQuery = query(
      collection(db, 'admin_access'),
      where('email', '==', normalizedEmail),
    );
    const deliveryQuery = query(
      collection(db, 'delivery_agents'),
      where('email', '==', normalizedEmail),
    );

    const unsubscribeAdmin = onSnapshot(
      adminQuery,
      snapshot => {
        setIsAdmin(!snapshot.empty || normalizedEmail === ADMIN_EMAIL);
      },
      error => {
        console.error('Failed to verify admin access', error);
        setIsAdmin(normalizedEmail === ADMIN_EMAIL);
      },
    );

    const unsubscribeDelivery = onSnapshot(
      deliveryQuery,
      snapshot => {
        setIsDeliveryAgent(!snapshot.empty);
      },
      error => {
        console.error('Failed to verify delivery agent access', error);
        setIsDeliveryAgent(false);
      },
    );

    return () => {
      unsubscribeAdmin();
      unsubscribeDelivery();
    };
  }, [currentUserEmail]);

  // Access entry lists (admin-only)
  useEffect(() => {
    if (!isAdmin) {
      setAdminAccessEntries([]);
      setDeliveryAccessEntries([]);
      return;
    }

    const unsubscribeAdmins = onSnapshot(
      collection(db, 'admin_access'),
      snapshot => {
        const entries = snapshot.docs
          .flatMap(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || docSnapshot.id || '')
              .trim()
              .toLowerCase();
            if (!emailValue) return [];
            return [{ id: docSnapshot.id, email: emailValue, role: 'admin' } satisfies AccessEntry];
          })
          .sort((a, b) => a.email.localeCompare(b.email));
        setAdminAccessEntries(entries);
      },
      error => {
        console.error('Failed to load admin access list', error);
        setAdminAccessEntries([]);
      },
    );

    const unsubscribeAgents = onSnapshot(
      collection(db, 'delivery_agents'),
      snapshot => {
        const entries = snapshot.docs
          .flatMap(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || '').trim().toLowerCase();
            if (!emailValue) return [];
            return [{
              id: docSnapshot.id,
              email: emailValue,
              role: ((data.role as AccessEntry['role']) || 'delivery'),
              accessOnly: data.accessOnly === true,
            } satisfies AccessEntry];
          })
          .sort((a, b) => a.email.localeCompare(b.email));
        setDeliveryAccessEntries(entries);
      },
      error => {
        console.error('Failed to load delivery access list', error);
        setDeliveryAccessEntries([]);
      },
    );

    return () => {
      unsubscribeAdmins();
      unsubscribeAgents();
    };
  }, [isAdmin]);

  return {
    isAdmin,
    isDeliveryAgent,
    isMainAdmin,
    adminAccessEntries,
    deliveryAccessEntries,
  };
};
