import {
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { toAppServiceError } from '../serviceError';
import { auth } from './firebaseConfig';

export async function signInWithGoogleToken(idToken: string) {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('FIREBASE GOOGLE LOGIN SUCCESS:', {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
    });
    return userCredential.user;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to sign in with Google right now.', 'network');
  }
}
