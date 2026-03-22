import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './services/firebase';

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Firebase Google login error:', error);
    throw error;
  }
}
