import React, { useEffect, useState } from 'react';
import {
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FileCode,
  CloudUpload,
  Upload,
  FolderOpen,
  Database
} from 'lucide-react';
import { ConfiguracionDrive, DriveModuleKey } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import { DRIVE_MODULE_META } from '../services/excelService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DriveActionConfirmModal } from './DriveActionConfirmModal';
import { BulkImportModal } from './BulkImportModal';
import { getGoogleSession, onGoogleAuthChange, GoogleAuthSession } from '../services/googleAuthService';

interface ConfiguracionDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionDrive;
  onRefresh: () => void;
  onOpenDocs: () => void;
}

const ALL_MODULES: DriveModuleKey[] = Object.keys(DRIVE_MODULE_META) as DriveModuleKey[];

export const ConfiguracionDriveModal: React.FC<ConfiguracionDriveModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefresh,
  onOpenDocs
}) => {
  const [form, setForm] = useState<ConfiguracionDrive>({ ...config });
  const [selectedModule, setSelectedModule] = useState<DriveModuleKey>('LINEAS');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmMode, setConfirmMode] = useState<'single' | 'all' | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [session, setSession] = useState<GoogleAuthSession>(() => getGoogleSession());

  useEffect(() => {
    setForm({ ...storageService.getConfigDrive() });
  }, [isOpen, config]);

  useEffect(() => {
    const unsub = onGoogleAuthChange((s) => setSession(s));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const currentConfig = storageService.getConfigDrive();

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      storageService.updateConfigDrive(form, true);
      const res = await GoogleDriveService.testConnection();
      setTestResult({ success: res.success, message: res.message });
      setForm({ ...storageService.getConfigDrive() });
      onRefresh();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    storageService.updateConfigDrive(form);
    GoogleDriveService.setAutoSync(form.auto_sync_interval);
    onRefresh();
    onClose();
  };

  const handleTriggerSimulatedConflict = () => {
    GoogleDriveService.triggerSampleConflict('L-6657C');
    onRefresh();
    onClose();
  };

  const folderUrl =
    currentConfig.drive_folder_url ||
    (form.drive_folder_id && !form.drive_folder_id.startsWith('1A9x_DRIVE_FOLDER')
      ? `https://drive.google.com/drive/folders/${form.drive_folder_id}`
      : undefined);

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white">Configuración de Google Drive & Sheets API</h2>
                <p className="text-xs text-slate-400">
                  Sincronización automática y manual de los 16 módulos, carga masiva Excel y respaldo de contraseñas en Drive
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* OAuth Connection Card */}
            <div className="bg-slate-950/75 border border-cyan-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Cuenta Google Drive / Sheets</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      session.hasAccessToken
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {session.hasAccessToken ? 'OAuth Conectado' : 'Requiere Iniciar Sesión'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Carpeta oficial en Drive: <code className="text-cyan-300">SISTEMA_SUBTRANSMISION</code>
                  {session.email && (
                    <span> • Cuenta: <strong className="text-emerald-300">{session.email}</strong></span>
                  )}
                </p>
                {folderUrl && (
                  <a
                    href={folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>Abrir carpeta SISTEMA_SUBTRANSMISION en Google Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <GoogleSignInButton
                onSuccess={() => {
                  setForm({ ...storageService.getConfigDrive() });
                  onRefresh();
                }}
              />
            </div>

            {/* Manual Module Operations Bar (Subir a Drive / Sincronizar Todo / Carga Masiva) */}
            <div className="bg-slate-950/75 border border-indigo-800/60 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-400" />
                    <span>Centro Manual de Sincronización y Carga Masiva (16 Módulos)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona un módulo para subirlo a Drive o realizar carga masiva desde Excel, o sincroniza todos los módulos juntos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value as DriveModuleKey)}
                  className="flex-1 min-w-[220px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                >
                  {ALL_MODULES.map((k) => {
                    const m = DRIVE_MODULE_META[k];
                    const count = storageService.getModuleData(k, true).length;
                    return (
                      <option key={k} value={k}>
                        {m.label} ({count} reg.) — {m.fileName}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => setConfirmMode('single')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow cursor-pointer"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>Subir a Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmMode('all')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Sincronizar Todo a Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Carga Masiva (Excel)</span>
                </button>
              </div>

              {/* 16 Modules Sync Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                {ALL_MODULES.map((k) => {
                  const m = DRIVE_MODULE_META[k];
                  const count = storageService.getModuleData(k, true).length;
                  const isPending = (currentConfig.pending_sync_modules || []).includes(k);
                  const url =
                    currentConfig.module_file_urls?.[k] ||
                    (k === 'LINEAS' ? currentConfig.sheet_lineas_url : undefined) ||
                    (k === 'USUARIOS' ? currentConfig.sheet_usuarios_url : undefined);
                  return (
                    <div
                      key={k}
                      className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                        isPending
                          ? 'bg-amber-950/30 border-amber-700/60'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate" title={m.label}>
                          {m.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {count} reg. {isPending ? '• Pendiente' : ''}
                        </div>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-cyan-400 hover:text-cyan-200 shrink-0"
                          title={`Abrir ${m.fileName} en Drive`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Spreadsheet ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ID PRINCIPAL DE LÍNEAS (Google Sheets) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.sheet_lineas_id}
                  onChange={(e) => setForm({ ...form, sheet_lineas_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">URL LÍNEAS & ESTRUCTURAS</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.sheet_lineas_url}
                    onChange={(e) => setForm({ ...form, sheet_lineas_url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <a
                    href={form.sheet_lineas_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Usuarios Spreadsheet ID & URL */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-800/50 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-emerald-300">
                    ID HOJA USUARIOS (USUARIOS.XLSX)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Contraseñas protegidas en Drive</span>
                </div>
                <input
                  type="text"
                  value={form.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX'}
                  onChange={(e) => setForm({ ...form, sheet_usuarios_id: e.target.value })}
                  className="w-full bg-slate-800 border border-emerald-700/60 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">URL ACCESO DIRECTO USUARIOS.XLSX</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true'}
                    onChange={(e) => setForm({ ...form, sheet_usuarios_url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  />
                  <a
                    href={form.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/70 rounded-lg flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Google Apps Script Endpoint URL + Sync Interval */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">URL APPS SCRIPT (Opcional)</label>
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenDocs(); }}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <FileCode className="h-3 w-3" />
                    <span>CódigoServidor.gs</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={form.apps_script_url || ''}
                  onChange={(e) => setForm({ ...form, apps_script_url: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">SINCRONIZACIÓN PERIÓDICA</label>
                <select
                  value={form.auto_sync_interval}
                  onChange={(e) => setForm({ ...form, auto_sync_interval: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                >
                  <option value="0">Desactivada (Solo Automática al guardar y Manual)</option>
                  <option value="5">Cada 5 minutos</option>
                  <option value="15">Cada 15 minutos (Recomendado)</option>
                  <option value="30">Cada 30 minutos</option>
                  <option value="60">Cada 60 minutos</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ID CARPETA RAÍZ EN DRIVE</label>
                <input
                  type="text"
                  value={form.drive_folder_id}
                  onChange={(e) => setForm({ ...form, drive_folder_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/80 border-red-700 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-xs">{testResult.message}</span>
              </div>
            )}

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Resolución de Conflictos Drive vs Web</div>
                <div className="text-[11px] text-slate-400">Simula una discrepancia entre valores locales y Google Drive.</div>
              </div>
              <button
                type="button"
                onClick={handleTriggerSimulatedConflict}
                className="px-3 py-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900 text-xs font-semibold cursor-pointer"
              >
                Simular Conflicto
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      </div>

      <DriveActionConfirmModal
        isOpen={confirmMode !== null}
        mode={confirmMode || 'single'}
        moduleKey={selectedModule}
        onClose={() => setConfirmMode(null)}
        onCompleted={() => {
          setForm({ ...storageService.getConfigDrive() });
          onRefresh();
        }}
      />

      <BulkImportModal
        isOpen={showBulkModal}
        moduleKey={selectedModule}
        onClose={() => setShowBulkModal(false)}
        onImported={() => {
          setForm({ ...storageService.getConfigDrive() });
          onRefresh();
        }}
      />
    </>
  );
};
