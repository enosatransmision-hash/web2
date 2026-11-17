import React, { useState } from 'react';
import {
  Zap,
  Lock,
  User,
  Shield,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TowerControl as Tower,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { Usuario } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: Usuario, token: string) => void;
  allUsuarios?: Usuario[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, allUsuarios = [] }) => {
  const [username, setUsername] = useState('admin_carlos');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const DEMO_ACCOUNTS = [
    {
      username: 'admin_carlos',
      password: 'password123',
      name: 'Carlos Alberto Mendoza Rivas',
      role: 'Administrador (USUARIOS.XLSX)',
      desc: 'Administrador oficial registrado en USUARIOS.XLSX. Acceso general y control Drive.',
      badge: 'bg-purple-950 text-purple-300 border-purple-800'
    },
    {
      username: 'sup_fernando',
      password: 'password123',
      name: 'Fernando Vargas Salazar',
      role: 'Supervisor (USUARIOS.XLSX)',
      desc: 'Supervisor oficial en USUARIOS.XLSX (L-6601, L-6602, L-6603).',
      badge: 'bg-blue-950 text-blue-300 border-blue-800'
    },
    {
      username: 'cont_electrotech',
      password: 'password123',
      name: 'Jorge Luis Torres Benavides',
      role: 'Contratista (USUARIOS.XLSX)',
      desc: 'Contratista Electrotech en USUARIOS.XLSX (L-6601).',
      badge: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      username: 'admin',
      password: 'password123',
      name: 'Juan Carlos Pérez',
      role: 'Administrador Sistema',
      desc: 'Control total de líneas, estructuras, auditoría y Google Drive.',
      badge: 'bg-purple-950 text-purple-300 border-purple-800'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success && data.user) {
        localStorage.setItem('st_auth_token', data.token);
        localStorage.setItem('st_auth_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMessage(data.message || 'Error de autenticación');
      }
    } catch (err: any) {
      setErrorMessage('Error al conectar con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 items-center justify-center shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/40 mb-2">
            <Zap className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SISTEMA DE SUBTRANSMISIÓN
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Plataforma multiusuario en tiempo real para supervisión de líneas, efecto corona UV, deficiencias y DMS.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              Validación de Identidad y Acceso
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingrese su usuario asignado para cargar sus líneas autorizadas y sincronización simultánea.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de Usuario o Email
              </label>
              <div className="relative">
                <input
                  type="text"
                 required
                 // value={username}
                 // onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: admin, cmendoza, cenorte"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
                <User className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  //value={password}
                  //onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Users Selection Helper */}
         
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div>Conexión en Tiempo Real • WebSockets Activos • Google Sheets Sync</div>
          <div>Zona Horaria Oficial: America/Lima (UTC-5)</div>
        </div>
      </div>
    </div>
  );
};
