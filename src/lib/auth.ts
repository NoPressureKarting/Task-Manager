import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Workspace OAuth Scopes (Google Tasks & Google Calendar)
export const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

const ACCESS_TOKEN_KEY = 'google_workspace_oauth_token';
const TOKEN_EXPIRY_KEY = 'google_workspace_oauth_expiry';

// Cache the access token in memory with persistence backup
let cachedAccessToken: string | null = (() => {
  try {
    const saved = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY) || sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    if (saved && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        return saved;
      }
    } else if (saved) {
      return saved;
    }
  } catch (e) {
    console.warn('Error reading cached OAuth token:', e);
  }
  return null;
})();

let isSigningIn = false;

function persistToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (token) {
      // Tokens typically last 1 hour (3600 seconds), set 50 minute validity window
      const expiry = Date.now() + 50 * 60 * 1000;
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch (e) {
    console.warn('Error persisting OAuth token:', e);
  }
}

// Initial auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // If we don't have cachedAccessToken in memory, try to restore from storage
      if (!cachedAccessToken) {
        try {
          const saved = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
          if (saved) {
            cachedAccessToken = saved;
          }
        } catch (e) {
          // ignore
        }
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      persistToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.warn('Firebase signed in, but no accessToken in credential');
    }

    const token = credential?.accessToken || null;
    persistToken(token);
    return { user: result.user, accessToken: token || '' };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export const logout = async () => {
  await signOut(auth);
  persistToken(null);
};
