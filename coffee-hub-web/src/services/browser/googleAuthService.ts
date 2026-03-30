import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { toAppServiceError } from '../platform/serviceError';

const provider = new GoogleAuthProvider();

export const loginWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to sign in with Google.', 'network');
  }
};
