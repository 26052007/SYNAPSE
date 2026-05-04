import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Only use the custom Firestore database ID if it's a valid non-empty string
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = firestoreDbId
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// Request email scope to ensure we get user info
googleProvider.addScope('email');
googleProvider.addScope('profile');

const BACKEND_BASE_URL = localStorage.getItem('synapse-backend-url') || 'http://localhost:8080';
const BACKEND_TOKEN_KEY = 'synapse-backend-token';

async function establishBackendSessionFromUser(user: { getIdToken: () => Promise<string> }): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Backend Google auth failed');
    }
    const payload = await response.json();
    if (payload?.token) {
      localStorage.setItem(BACKEND_TOKEN_KEY, payload.token);
    }
  } catch (error) {
    // Keep frontend login working even if backend is temporarily unavailable.
    console.warn('Backend session setup skipped:', error);
  }
}

export const signInWithGoogle = async () => {
  try {
    // Try popup first (works on most desktop browsers)
    const result = await signInWithPopup(auth, googleProvider);
    await establishBackendSessionFromUser(result.user);
    return result;
  } catch (error: any) {
    // If popup blocked or fails, try redirect
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('Popup failed, trying redirect sign-in...');
      return signInWithRedirect(auth, googleProvider);
    }
    // If unauthorized domain, show helpful error
    if (error.code === 'auth/unauthorized-domain') {
      alert(
        `Sign-in Error: This domain (${window.location.hostname}) is not authorized in Firebase.\n\n` +
        `To fix this:\n` +
        `1. Go to Firebase Console → Authentication → Settings\n` +
        `2. Add "${window.location.hostname}" to Authorized Domains\n` +
        `3. Make sure Google Sign-In is enabled in Authentication → Sign-in method`
      );
    } else {
      console.error('Google Sign-In Error:', error.code, error.message);
      alert(`Sign-in failed: ${error.message}`);
    }
    throw error;
  }
};

// Check for redirect result on page load
getRedirectResult(auth)
  .then(async (result) => {
    if (result?.user) {
      await establishBackendSessionFromUser(result.user);
    }
  })
  .catch((error) => {
    if (error) {
      console.error('Redirect sign-in error:', error);
    }
  });

export const logout = async () => {
  try {
    const token = localStorage.getItem(BACKEND_TOKEN_KEY);
    if (token) {
      await fetch(`${BACKEND_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (error) {
    console.warn('Backend logout request failed:', error);
  } finally {
    localStorage.removeItem(BACKEND_TOKEN_KEY);
  }
  return signOut(auth);
};
