import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../../services/firebase';
import { toAppServiceError } from '../../../services/serviceError';
import type { CustomerProfile } from '../../../types';
import { sanitizeFirestoreData } from '../../../utils/sanitizeFirestoreData';
import {
  EMPTY_PROFILE,
  buildProfileStoragePayload,
  mapProfileDocToProfile,
} from '../lib/profileMappers';

export const subscribeToCustomerProfile = (
  currentUserId: string,
  currentUserEmail: string,
  onData: (profile: CustomerProfile) => void,
  onError: (error: Error) => void,
) => {
  try {
    const db = getFirebaseDb();

    return onSnapshot(
      doc(db, 'users', currentUserId),
      snapshot => {
        if (!snapshot.exists()) {
          onData({
            ...EMPTY_PROFILE,
            email: currentUserEmail,
          });
          return;
        }

        onData(
          mapProfileDocToProfile(
            snapshot.data() as Record<string, unknown>,
            currentUserEmail,
          ),
        );
      },
      error => {
        onError(toAppServiceError(error, 'Unable to load your profile.', 'network'));
      },
    );
  } catch (error) {
    onError(toAppServiceError(error, 'Unable to load your profile.', 'network'));
    return () => {};
  }
};

export const saveCustomerProfile = async (
  currentUserId: string,
  currentUserEmail: string,
  profileDraft: CustomerProfile,
) => {
  try {
    const db = getFirebaseDb();

    await setDoc(
      doc(db, 'users', currentUserId),
      sanitizeFirestoreData({
        ...buildProfileStoragePayload(profileDraft, currentUserEmail),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to save your profile right now.', 'network');
  }
};
