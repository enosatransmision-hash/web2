import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets'
];

export interface GoogleAuthSession {
  connected: boolean;
  hasAccessToken: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
// Access token held strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let currentFirebaseUser: FirebaseUser | null = null;
let authInitialized = false;

const listeners = new Set<(session: GoogleAuthSession) => void>();

function getOrInitApp(): { app: FirebaseApp; auth: Auth } {
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return { app: firebaseApp, auth: firebaseAuth };
}

function notifyListeners() {
  const session = getGoogleSession();
  listeners.forEach(cb => {
    try {
      cb(session);
    } catch (e) {
      console.error('[GoogleAuth] Listener error:', e);
    }
  });
}

export function initGoogleAuth(): void {
  if (authInitialized) return;
  authInitialized = true;
  try {
    const { auth } = getOrInitApp();
    onAuthStateChanged(auth, (user) => {
      currentFirebaseUser = user;
      if (!user) {
        cachedAccessToken = null;
      }
      notifyListeners();
    });
  } catch (err) {
    console.warn('[GoogleAuth] Error initializing Firebase Auth:', err);
  }
}

export async function googleSignIn(): Promise<{
  success: boolean;
  accessToken?: string;
  user?: GoogleAuthSession;
  message?: string;
}> {
  try {
    initGoogleAuth();
    const { auth } = getOrInitApp();
    const provider = new GoogleAuthProvider();
    WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'online'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      return {
        success: false,
        message: 'No se recibió el token de acceso de Google Drive/Sheets.'
      };
    }

    cachedAccessToken = credential.accessToken;
    currentFirebaseUser = result.user;
    notifyListeners();

    return {
      success: true,
      accessToken: cachedAccessToken,
      user: getGoogleSession(),
      message: `Conectado a Google Drive como ${result.user.email || result.user.displayName}`
    };
  } catch (err: any) {
    console.error('[GoogleAuth] Sign-In error:', err);
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Ventana de autorización cerrada antes de completar el acceso.' };
    }
    if (code === 'auth/popup-blocked') {
      return { success: false, message: 'El navegador bloqueó la ventana emergente de Google. Habilita ventanas emergentes e intenta nuevamente.' };
    }
    return {
      success: false,
      message: err?.message || 'Error al autenticar con Google.'
    };
  }
}

export async function googleSignOut(): Promise<void> {
  cachedAccessToken = null;
  currentFirebaseUser = null;
  try {
    const { auth } = getOrInitApp();
    await signOut(auth);
  } catch (err) {
    console.warn('[GoogleAuth] Sign-out error:', err);
  }
  notifyListeners();
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearAccessToken(): void {
  cachedAccessToken = null;
  notifyListeners();
}

export function getGoogleUser(): FirebaseUser | null {
  return currentFirebaseUser;
}

export function getGoogleSession(): GoogleAuthSession {
  return {
    connected: Boolean(currentFirebaseUser && cachedAccessToken),
    hasAccessToken: Boolean(cachedAccessToken),
    email: currentFirebaseUser?.email || undefined,
    displayName: currentFirebaseUser?.displayName || undefined,
    photoURL: currentFirebaseUser?.photoURL || undefined
  };
}

export function onGoogleAuthChange(callback: (session: GoogleAuthSession) => void): () => void {
  initGoogleAuth();
  listeners.add(callback);
  callback(getGoogleSession());
  return () => {
    listeners.delete(callback);
  };
}
