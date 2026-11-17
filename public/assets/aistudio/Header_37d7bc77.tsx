import React, { useState, useEffect } from 'react';
import {
  Zap,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  User,
  Settings,
  FileCode,
  Shield,
  Layers,
  ChevronDown,
  Users,
  Radio,
  LogOut,
  Circle
} from 'lucide-react';
import { Usuario, ConfiguracionDrive, ConflictoRegistro } from '../types';
import { GoogleDriveService } from '../services/googleDriveService';
import { realtimeService, ActiveUserPresence } from '../services/realtimeService';

interface HeaderProps {
  currentUser: Usuario;
  usuarios: Usuario[];
  onSwitchUser: (username: string) => void;
  config: ConfiguracionDrive;
  conflictos: ConflictoRegistro[];
  onOpenConfig: () => void;
  onOpenConflictos: () => void;
  onOpenDocs: () => void;
  onSyncComplete: () => void;
  selectedLineFilter: string;
  onSelectLineFilter: (line: string) => void;
  availableLines: string[];
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  usuarios,
  onSwitchUser,
  config,
  conflictos,
  onOpenConfig,
  onOpenConflictos,
  onOpenDocs,
  onSyncComplete,
  selectedLineFilter,
  onSelectLineFilter,
  availableLines,
  onLogout
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPresenceDropdown, setShowPresenceDropdown] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUserPresence[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const unresolvedConflicts = conflictos.filter(c => !c.resuelto).length;

  useEffect(() => {
    const unsubPresence = realtimeService.onPresence((users) => {
      setActiveUsers(users);
    });
    const unsubConn = realtimeService.onConnectionChange((connected) => {
      setIsWsConnected(connected);
    });
    setIsWsConnected(realtimeService.getIsConnected());
    setActiveUsers(realtimeService.getActiveUsers());

    return () => {
      unsubPresence();
      unsubConn();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await GoogleDriveService.pullLineasFromDrive();
      onSyncComplete();
    } finally {
      setIsSyncing(false);
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'Administrador':
        return 'bg-purple-900/60 text-purple-200 border-purple-700/50';
      case 'Supervisor':
        return 'bg-blue-900/60 text-blue-200 border-blue-700/50';
      case 'Contratista':
        return 'bg-amber-900/60 text-amber-200 border-amber-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Zap className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base lg:text-lg tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
                SISTEMA DE SUBTRANSMISIÓN
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-[10px] text-emerald-300 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Tiempo Real Multi-Usuario</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Supervisión Simultánea • Sincronización Automática WebSockets & Google Sheets
            </p>
          </div>
        </div>

        {/* Global Filter by Line */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-400 hidden md:block">Línea:</label>
          <div className="relative">
            <select
              value={selectedLineFilter}
              onChange={(e) => onSelectLineFilter(e.target.value)}
              className="bg-slate-800/90 text-xs font-semibold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-8 cursor-pointer"
            >
              <option value="TODAS">Todas las Líneas ({availableLines.length})</option>
              {availableLines.map((line) => (
                <option key={`hdr-line-${line}`} value={line}>{line}</option>
              ))}
            </select>
            <Layers className="h-3.5 w-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Sync Status & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Active Users in Session (Realtime Presence) */}
          <div className="relative">
            <button
              onClick={() => setShowPresenceDropdown(!showPresenceDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-medium hover:border-cyan-500 transition cursor-pointer"
              title="Usuarios conectados en tiempo real en este enlace"
            >
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">En línea:</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <span className="font-bold text-cyan-300 font-mono">
                {Math.max(1, activeUsers.length)}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* Presence Dropdown Menu */}
            {showPresenceDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    Sesión Compartida Multiusuario
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeUsers.length || 1} activos
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Los cambios que realice cualquier usuario se sincronizan y guardan automáticamente para todos los demás sin recargar la página.
                </p>

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {activeUsers.length === 0 ? (
                    <div className="p-2 bg-slate-950/60 rounded-lg text-[11px] text-slate-300 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{currentUser.nombres}</span> (Tú)
                        <div className="text-[10px] text-slate-400">@{currentUser.username}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${getRoleBadge(currentUser.rol)}`}>
                        {currentUser.rol}
                      </span>
                    </div>
                  ) : (
                    activeUsers.map((u, i) => (
                      <div key={i} className="p-2 bg-slate-950/60 rounded-lg text-[11px] text-slate-300 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1">
                            <span>{u.user.nombres}</span>
                            {u.user.username === currentUser.username && (
                              <span className="text-[10px] text-cyan-400 font-normal">(Tú)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Módulo: <span className="text-cyan-300 capitalize">{u.activeModule}</span>
                            {u.activeLine !== 'TODAS' && ` • ${u.activeLine}`}
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border ${getRoleBadge(u.user.rol)}`}>
                          {u.user.rol}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Conflict Alert if any */}
          {unresolvedConflicts > 0 && (
            <button
              onClick={onOpenConflictos}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/70 border border-red-700/80 text-red-300 text-xs font-medium hover:bg-red-900/60 transition shadow-sm animate-pulse"
              title="Conflictos de sincronización detectados"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span>{unresolvedConflicts} Conflicto{unresolvedConflicts > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Sync status indicator */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              config.sync_status === 'Conectado'
                ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-rose-950/50 border-rose-800/70 text-rose-300 hover:bg-rose-900/40'
            }`}
            title="Presiona para forzar actualización con Google Drive y Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Guardando en Drive...' : 'Sheets & Drive Sync'}
            </span>
          </button>

          {/* Docs & Apps Script }
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700/80 hover:text-white transition"
            title="Ver CódigoServidor.gs y Guía de Instalación"
          >
            <FileCode className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Código Apps Script</span>
          </button> */}

          {/* Drive Configuration Modal Trigger 
          <button
            onClick={onOpenConfig}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80 transition"
            title="Configuración de Google Drive & Sheets"
          >
            <Settings className="h-4 w-4 text-slate-300" />
          </button>*/}

          {/* User Profile & Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition"
            >
              <div className="h-6 w-6 rounded-full bg-cyan-700/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-[10px] font-bold">
                {currentUser.nombres.charAt(0)}{currentUser.apellidos.charAt(0)}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-slate-200 leading-tight">
                  {currentUser.nombres}
                </div>
                <div className={`text-[10px] px-1.5 py-0.2 rounded border inline-block ${getRoleBadge(currentUser.rol)}`}>
                  {currentUser.rol}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-800 mb-2">
                  <div className="text-xs font-bold text-slate-200">{currentUser.nombres} {currentUser.apellidos}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">{currentUser.email}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Rol activo: <span className="text-slate-200 font-medium">{currentUser.rol}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Líneas: {currentUser.lineas_asignadas.includes('*') ? 'Todas las líneas autorizadas' : currentUser.lineas_asignadas.join(', ')}
                  </div>
                </div>

               

                

                {/* Logout Button */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold transition border border-red-800/60"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
