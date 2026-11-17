import React, { useState } from 'react';
import {
  Settings,
  X,
  Save,
  CheckCircle,
  AlertCircle,
  CloudCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  FileCode
} from 'lucide-react';
import { ConfiguracionDrive } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';

interface ConfiguracionDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionDrive;
  onRefresh: () => void;
  onOpenDocs: () => void;
}

export const ConfiguracionDriveModal: React.FC<ConfiguracionDriveModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefresh,
  onOpenDocs
}) => {
  const [form, setForm] = useState<ConfiguracionDrive>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      storageService.updateConfigDrive(form);
      const res = await GoogleDriveService.testConnection();
      setTestResult({ success: res.success, message: res.message });
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Configuración de Google Drive & Sheets API</h2>
              <p className="text-xs text-slate-400">Parámetros oficiales de almacenamiento y sincronización en la nube</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Main Spreadsheet ID */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              ID DEL ARCHIVO PRINCIPAL DE LÍNEAS (Google Sheets) <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={form.sheet_lineas_id}
              onChange={(e) => setForm({ ...form, sheet_lineas_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Configurado según especificación oficial: <code className="text-cyan-400">1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y</code>
            </span>
          </div>

          {/* Spreadsheet URL */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">URL COMPLETA DE ACCESO (LÍNEAS & ESTRUCTURAS)</label>
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
                <span>Abrir</span>
              </a>
            </div>
          </div>

          {/* Usuarios Spreadsheet ID & URL */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-800/50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-emerald-300">
                  ID DE LA HOJA OFICIAL DE USUARIOS (USUARIOS.XLSX)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">USUARIOS.XLSX</span>
              </div>
              <input
                type="text"
                value={form.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX'}
                onChange={(e) => setForm({ ...form, sheet_usuarios_id: e.target.value })}
                className="w-full bg-slate-800 border border-emerald-700/60 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                ID configurado: <code className="text-emerald-400">1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX</code>
              </span>
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
                  <span>Abrir</span>
                </a>
              </div>
            </div>
          </div>

          {/* Google Apps Script Endpoint URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                URL DE LA APLICACIÓN WEB DE GOOGLE APPS SCRIPT (Opcional para webhook en vivo)
              </label>
              <button
                type="button"
                onClick={() => { onClose(); onOpenDocs(); }}
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <FileCode className="h-3 w-3" />
                <span>Ver CódigoServidor.gs</span>
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

          {/* Sync Interval */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">SINCRONIZACIÓN AUTOMÁTICA PERIÓDICA</label>
              <select
                value={form.auto_sync_interval}
                onChange={(e) => setForm({ ...form, auto_sync_interval: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="0">Desactivada (Solo Manual)</option>
                <option value="5">Cada 5 minutos</option>
                <option value="15">Cada 15 minutos (Recomendado)</option>
                <option value="30">Cada 30 minutos</option>
                <option value="60">Cada 60 minutos</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CARPETA RAÍZ EN DRIVE</label>
              <input
                type="text"
                value={form.drive_folder_id}
                onChange={(e) => setForm({ ...form, drive_folder_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Test Result Feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              testResult.success ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
            }`}>
              {testResult.success ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span className="text-xs">{testResult.message}</span>
            </div>
          )}

          {/* Testing buttons */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">Pruebas de Sincronización y Conflictos:</div>
              <div className="text-[11px] text-slate-400">Prueba la detección de discrepancias y resolución interactiva.</div>
            </div>
            <button
              type="button"
              onClick={handleTriggerSimulatedConflict}
              className="px-3 py-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900 text-xs font-semibold"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
