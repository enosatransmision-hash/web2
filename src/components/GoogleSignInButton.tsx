import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  GoogleAuthSession,
  googleSignIn,
  googleSignOut,
  onGoogleAuthChange
} from '../services/googleAuthService';
import { storageService } from '../services/storageService';

interface GoogleSignInButtonProps {
  compact?: boolean;
  onSuccess?: (session: GoogleAuthSession) => void;
  onError?: (message: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  compact = false,
  onSuccess,
  onError
}) => {
  const [session, setSession] = useState<GoogleAuthSession>({
    connected: false,
    hasAccessToken: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onGoogleAuthChange((next) => {
      setSession(next);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res.success && res.user) {
        storageService.updateConfigDrive({
          sync_status: 'Conectado',
          google_account_email: res.user.email || '',
          error_message: undefined
        });
        onSuccess?.(res.user);
      } else if (res.message) {
        onError?.(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await googleSignOut();
      storageService.updateConfigDrive({
        sync_status: 'Desconectado',
        google_account_email: ''
      });
    } finally {
      setLoading(false);
    }
  };

  if (session.connected) {
    return (
      <div className={`inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-emerald-900 truncate max-w-[180px]">
            {session.email || session.displayName || 'Google Drive Conectado'}
          </p>
          {!compact && (
            <p className="text-[10px] text-emerald-700 font-medium">
              Sesión OAuth activa (Drive y Sheets)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          title="Desconectar cuenta de Google"
          className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!compact && <span>Salir</span>}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2.5 bg-white hover:bg-[#f8faff] active:bg-[#edf2fa] text-[#1f1f1f] border border-[#747775]/60 rounded-lg font-medium shadow-xs transition-all cursor-pointer disabled:opacity-60 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
      style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin text-[#0B57D0]" />
      ) : (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      )}
      <span>{loading ? 'Conectando...' : compact ? 'Conectar Google Drive' : 'Iniciar sesión con Google'}</span>
    </button>
  );
};
