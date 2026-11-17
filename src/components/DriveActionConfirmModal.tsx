import React, { useEffect, useState } from 'react';
import {
  CloudUpload,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FolderOpen,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { DriveModuleKey } from '../types';
import { DRIVE_MODULE_META } from '../services/excelService';
import { storageService } from '../services/storageService';
import {
  GoogleDriveService,
  DriveSyncResult,
  DriveSyncAllResult
} from '../services/googleDriveService';
import {
  GoogleAuthSession,
  getGoogleSession,
  onGoogleAuthChange
} from '../services/googleAuthService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DriveActionConfirmModalProps {
  isOpen: boolean;
  mode: 'single' | 'all';
  moduleKey?: DriveModuleKey;
  onClose: () => void;
  onCompleted?: () => void;
}

const ALL_MODULES: DriveModuleKey[] = Object.keys(DRIVE_MODULE_META) as DriveModuleKey[];

export const DriveActionConfirmModal: React.FC<DriveActionConfirmModalProps> = ({
  isOpen,
  mode,
  moduleKey = 'LINEAS',
  onClose,
  onCompleted
}) => {
  const [session, setSession] = useState<GoogleAuthSession>(() => getGoogleSession());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [singleResult, setSingleResult] = useState<DriveSyncResult | null>(null);
  const [allResult, setAllResult] = useState<DriveSyncAllResult | null>(null);

  useEffect(() => {
    const unsub = onGoogleAuthChange((next) => setSession(next));
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSingleResult(null);
      setAllResult(null);
      setProgress(null);
      setIsRunning(false);
    }
  }, [isOpen, mode, moduleKey]);

  if (!isOpen) return null;

  const meta = DRIVE_MODULE_META[moduleKey];
  const config = storageService.getConfigDrive();
  const singleCount = storageService.getModuleData(moduleKey, true).length;
  const totalRecordsAll = ALL_MODULES.reduce(
    (sum, k) => sum + storageService.getModuleData(k, true).length,
    0
  );

  const handleConfirm = async () => {
    setIsRunning(true);
    setSingleResult(null);
    setAllResult(null);

    try {
      if (mode === 'single') {
        const res = await GoogleDriveService.syncModuleToDrive(moduleKey);
        setSingleResult(res);
        if (res.success) {
          onCompleted?.();
        }
      } else {
        const res = await GoogleDriveService.syncAllModulesToDrive((current, total, _k, label) => {
          setProgress({ current, total, label });
        });
        setAllResult(res);
        if (res.syncedCount > 0) {
          onCompleted?.();
        }
      }
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  const folderUrl =
    config.drive_folder_url ||
    (config.drive_folder_id && !config.drive_folder_id.startsWith('1A9x_DRIVE_FOLDER')
      ? `https://drive.google.com/drive/folders/${config.drive_folder_id}`
      : undefined);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-700/70 flex items-center justify-center">
              <CloudUpload className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'single'
                  ? `Confirmar subida a Google Drive`
                  : `Sincronizar Todo a Google Drive (${ALL_MODULES.length} Módulos)`}
              </h3>
              <p className="text-xs text-slate-400">
                Carpeta destino: <span className="text-cyan-300 font-mono">SISTEMA_SUBTRANSMISION</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Auth Check */}
        {!session.hasAccessToken && (
          <div className="mb-4 p-4 rounded-xl bg-amber-950/60 border border-amber-700/70 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-bold">Conecta tu cuenta de Google para escribir en Google Drive y Sheets</p>
                <p className="text-amber-300/90 mt-0.5">
                  Inicia sesión con tu cuenta de Google con permisos de Drive y Sheets antes de ejecutar la sincronización.
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <GoogleSignInButton />
            </div>
          </div>
        )}

        {/* Scope Details */}
        {!singleResult && !allResult && (
          <div className="space-y-3 text-xs">
            {mode === 'single' ? (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Módulo seleccionado:</span>
                  <span className="font-bold text-white">{meta.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Archivo en Google Drive:</span>
                  <span className="font-mono text-cyan-300 flex items-center gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {meta.fileName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Registros a sincronizar (incl. trazabilidad):</span>
                  <span className="font-mono font-bold text-emerald-300 flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {singleCount} registros
                  </span>
                </div>
                {moduleKey === 'USUARIOS' && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-[11px] text-emerald-200">
                    Las contraseñas registradas se guardarán exclusivamente en el archivo <code className="font-mono">USUARIOS.XLSX</code> de Google Drive y permanecerán ocultas en la interfaz web.
                  </div>
                )}
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  Esta acción actualizará la hoja o archivo correspondiente en Google Drive con la versión más reciente almacenada en el sistema web.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Módulos incluidos:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {ALL_MODULES.length} módulos • {totalRecordsAll} registros totales
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_MODULES.map((key) => {
                    const m = DRIVE_MODULE_META[key];
                    const count = storageService.getModuleData(key, true).length;
                    const isPending = (config.pending_sync_modules || []).includes(key);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                      >
                        <span className="text-slate-200 truncate pr-2" title={m.label}>
                          {m.label}
                        </span>
                        <span className={`font-mono shrink-0 ${isPending ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  Cada módulo se sincronizará en su archivo/hoja dentro de <code className="text-cyan-300">SISTEMA_SUBTRANSMISION</code> (incluyendo <code className="text-emerald-300">USUARIOS.XLSX</code> con contraseñas protegidas).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && progress && (
          <div className="mt-4 bg-slate-950/80 border border-cyan-800/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300 font-semibold flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Sincronizando: {progress.label}
              </span>
              <span className="font-mono text-slate-300">
                {progress.current}/{progress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Single Result */}
        {singleResult && (
          <div
            className={`mt-3 p-4 rounded-xl border text-xs space-y-2.5 ${
              singleResult.success
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                : 'bg-red-950/70 border-red-700 text-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {singleResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-bold">{singleResult.success ? 'Sincronización completada' : 'Error de sincronización'}</p>
                <p className="mt-0.5">{singleResult.message}</p>
              </div>
            </div>
            {singleResult.fileUrl && (
              <a
                href={singleResult.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800/80 text-emerald-100 border border-emerald-600/60 font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir {meta.fileName} en Google Drive</span>
              </a>
            )}
          </div>
        )}

        {/* All Result */}
        {allResult && (
          <div
            className={`mt-3 p-4 rounded-xl border text-xs space-y-3 ${
              allResult.success
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                : 'bg-amber-950/70 border-amber-700 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {allResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="font-bold">{allResult.message}</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Módulos sincronizados: {allResult.syncedCount} de {allResult.totalModules}
                </p>
              </div>
            </div>

            {allResult.results.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                {allResult.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className={r.success ? 'text-emerald-300' : 'text-red-300'}>
                      {r.success ? '✓' : '✗'} {r.moduleKey ? DRIVE_MODULE_META[r.moduleKey].label : 'Módulo'}
                    </span>
                    <span className="font-mono text-slate-400">{r.count ?? 0} reg.</span>
                  </div>
                ))}
              </div>
            )}

            {folderUrl && (
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/70 hover:bg-cyan-800/80 text-cyan-100 border border-cyan-600/60 font-semibold"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Abrir Carpeta SISTEMA_SUBTRANSMISION en Drive</span>
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {singleResult || allResult ? 'Cerrar' : 'Cancelar'}
          </button>

          {!singleResult && !allResult && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isRunning || !session.hasAccessToken}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>
                    {mode === 'single' ? 'Confirmar y Subir a Drive' : 'Confirmar Sincronización Total'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
