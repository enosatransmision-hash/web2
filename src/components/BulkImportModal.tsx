import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CloudUpload
} from 'lucide-react';
import { DriveModuleKey } from '../types';
import { DRIVE_MODULE_META, ExcelService } from '../services/excelService';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import {
  GoogleAuthSession,
  getGoogleSession,
  onGoogleAuthChange
} from '../services/googleAuthService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface BulkImportModalProps {
  isOpen: boolean;
  moduleKey: DriveModuleKey;
  onClose: () => void;
  onImported?: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  moduleKey,
  onClose,
  onImported
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<GoogleAuthSession>(() => getGoogleSession());
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetsData, setSheetsData] = useState<Record<string, any[]>>({});
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [syncToDrive, setSyncToDrive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{
    message: string;
    driveMessage?: string;
    driveUrl?: string;
    driveSuccess?: boolean;
  } | null>(null);

  useEffect(() => {
    const unsub = onGoogleAuthChange((next) => setSession(next));
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFileName('');
      setSheetNames([]);
      setSelectedSheet('');
      setSheetsData({});
      setImportMode('merge');
      setSyncToDrive(true);
      setErrorMsg(null);
      setResultInfo(null);
      setIsProcessing(false);
    }
  }, [isOpen, moduleKey]);

  if (!isOpen) return null;

  const meta = DRIVE_MODULE_META[moduleKey];
  const rawRows = selectedSheet ? sheetsData[selectedSheet] || [] : [];
  const parsedPreview = rawRows.length > 0 ? ExcelService.parseModuleImportRows(moduleKey, rawRows) : [];
  const previewColumns = rawRows.length > 0 ? Object.keys(rawRows[0]).slice(0, 5) : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setResultInfo(null);
    setFileName(file.name);
    try {
      const parsed = await ExcelService.readExcelFile(file);
      if (parsed.sheetNames.length === 0) {
        setErrorMsg('El archivo seleccionado no contiene hojas legibles.');
        return;
      }
      setSheetNames(parsed.sheetNames);
      setSelectedSheet(parsed.sheetNames[0]);
      setSheetsData(parsed.data);
    } catch (err: any) {
      setErrorMsg(`No se pudo leer el archivo Excel: ${err?.message || 'Formato inválido'}`);
    }
  };

  const handleDownloadTemplate = () => {
    const currentItems = storageService.getModuleData(moduleKey, false);
    ExcelService.downloadModuleTemplate(moduleKey, currentItems);
  };

  const handleConfirmImport = async () => {
    if (rawRows.length === 0) {
      setErrorMsg('Selecciona un archivo Excel con filas válidas para importar.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = storageService.batchImportModule(moduleKey, rawRows, importMode);
      if (!res.success) {
        setErrorMsg(res.message);
        setIsProcessing(false);
        return;
      }

      let driveMessage: string | undefined;
      let driveUrl: string | undefined;
      let driveSuccess: boolean | undefined;

      if (syncToDrive) {
        if (session.hasAccessToken) {
          const driveRes = await GoogleDriveService.syncModuleToDrive(moduleKey);
          driveSuccess = driveRes.success;
          driveMessage = driveRes.message;
          driveUrl = driveRes.fileUrl;
        } else {
          driveSuccess = false;
          driveMessage = 'Datos cargados en web. Inicia sesión con Google Drive para completar la subida a la nube.';
        }
      }

      setResultInfo({
        message: res.message,
        driveMessage,
        driveUrl,
        driveSuccess
      });
      onImported?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-950 border border-emerald-700/70 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Carga Masiva desde Excel — {meta.label}</h3>
              <p className="text-xs text-slate-400">
                Importa datos masivos a la web y sincroniza automáticamente con <span className="text-cyan-300 font-mono">{meta.fileName}</span> en Google Drive.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Template + File Picker */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div>
              <p className="font-bold text-slate-200">1. Descarga la plantilla oficial o usa tu Excel exportado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Formato compatible: <code className="text-cyan-300">.xlsx</code>, <code className="text-cyan-300">.xls</code> o <code className="text-cyan-300">.csv</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 bg-slate-950/50 rounded-xl p-5 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-7 w-7 text-cyan-400 mx-auto mb-2" />
            <p className="font-bold text-slate-200">
              {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic aquí para seleccionar tu archivo Excel'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {rawRows.length > 0
                ? `${rawRows.length} filas detectadas • ${parsedPreview.length} registros listos para importar`
                : 'Se leerán automáticamente todas las columnas reconocidas del módulo'}
            </p>
          </div>

          {/* Sheet selector if multiple */}
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-slate-300 font-semibold">Pestaña de Excel:</label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold"
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <label className="block font-bold text-slate-300 mb-1.5">Modo de Carga</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="accent-cyan-500"
                  />
                  <span>Actualizar / Combinar con existentes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-amber-500"
                  />
                  <span>Reemplazar colección actual del módulo</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={syncToDrive}
                  onChange={(e) => setSyncToDrive(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span>Sincronizar automáticamente con Google Drive después de cargar en web</span>
              </label>
              {syncToDrive && !session.hasAccessToken && (
                <div className="pt-1">
                  <GoogleSignInButton compact />
                </div>
              )}
              {syncToDrive && session.hasAccessToken && (
                <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Listo para subir a {meta.fileName} en Drive</span>
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {rawRows.length > 0 && previewColumns.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-300">Vista previa (primeras {Math.min(5, rawRows.length)} filas)</span>
                <span className="font-mono text-cyan-300">{parsedPreview.length} válidos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900/60 text-slate-400">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-2.5 py-1.5 font-mono truncate max-w-[140px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300">
                    {rawRows.slice(0, 5).map((r, idx) => (
                      <tr key={idx}>
                        {previewColumns.map((col) => (
                          <td key={col} className="px-2.5 py-1.5 truncate max-w-[140px]">
                            {String(r[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {moduleKey === 'USUARIOS' && rawRows.length > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/70 text-[11px] text-emerald-200">
              Las contraseñas importadas desde la columna <code className="font-mono">PASSWORD</code> se guardan en el servidor y se sincronizan únicamente en <code className="font-mono">USUARIOS.XLSX</code> de Drive (nunca se muestran en la web).
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-700 text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultInfo && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold">{resultInfo.message}</p>
                  {resultInfo.driveMessage && (
                    <p className={`text-[11px] mt-1 ${resultInfo.driveSuccess ? 'text-cyan-300' : 'text-amber-300'}`}>
                      {resultInfo.driveMessage}
                    </p>
                  )}
                </div>
              </div>
              {resultInfo.driveUrl && (
                <a
                  href={resultInfo.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-600/60 font-semibold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir {meta.fileName} en Drive</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            {resultInfo ? 'Cerrar' : 'Cancelar'}
          </button>

          {!resultInfo && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || parsedPreview.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Cargando y sincronizando...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>Confirmar Carga Masiva ({parsedPreview.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
