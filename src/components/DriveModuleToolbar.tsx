import React, { useEffect, useState } from 'react';
import {
  CloudUpload,
  RefreshCw,
  Upload,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { DriveModuleKey } from '../types';
import { storageService } from '../services/storageService';
import { DRIVE_MODULE_META } from '../services/excelService';
import { DriveActionConfirmModal } from './DriveActionConfirmModal';
import { BulkImportModal } from './BulkImportModal';
import { GoogleSignInButton } from './GoogleSignInButton';
import { onGoogleAuthChange, getGoogleSession } from '../services/googleAuthService';

interface DriveModuleToolbarProps {
  moduleKey: DriveModuleKey;
  onDataImported?: () => void;
  compact?: boolean;
  className?: string;
}

export const DriveModuleToolbar: React.FC<DriveModuleToolbarProps> = ({
  moduleKey,
  onDataImported,
  compact = false,
  className = ''
}) => {
  const [confirmMode, setConfirmMode] = useState<'single' | 'all' | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [hasToken, setHasToken] = useState(() => getGoogleSession().hasAccessToken);

  useEffect(() => {
    const unsub = onGoogleAuthChange((s) => {
      setHasToken(s.hasAccessToken);
      setConfigVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const config = storageService.getConfigDrive();
  const isPending = (config.pending_sync_modules || []).includes(moduleKey);
  const meta = DRIVE_MODULE_META[moduleKey];

  const driveUrl =
    config.module_file_urls?.[moduleKey] ||
    (moduleKey === 'LINEAS' ? config.sheet_lineas_url : undefined) ||
    (moduleKey === 'USUARIOS' ? config.sheet_usuarios_url : undefined);

  const handleCompleted = () => {
    setConfigVersion(v => v + 1);
    onDataImported?.();
  };

  return (
    <>
      <div
        data-cfg-ver={configVersion}
        className={`flex flex-wrap items-center gap-2 ${
          compact ? '' : 'bg-slate-900/75 border border-slate-700/80 rounded-xl px-3 py-2'
        } ${className}`}
      >
        {!compact && (
          <GoogleSignInButton
            compact
            onSuccess={() => setConfigVersion(v => v + 1)}
          />
        )}

        {isPending && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/70 border border-amber-700/70 text-[11px] font-semibold text-amber-300"
            title={
              hasToken
                ? 'Hay cambios pendientes de subir a Google Drive'
                : 'Conecta Google Drive y pulsa Subir a Drive para sincronizar cambios recientes'
            }
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>Pendiente Drive</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => setConfirmMode('single')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900/80 text-sky-200 border border-sky-700/80 text-xs font-semibold transition cursor-pointer"
          title={`Subir módulo ${meta.label} a Google Drive (${meta.fileName})`}
        >
          <CloudUpload className="h-3.5 w-3.5 text-sky-400" />
          <span>Subir a Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setConfirmMode('all')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/80 text-xs font-semibold transition cursor-pointer"
          title="Sincronizar todos los 16 módulos a Google Drive"
        >
          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
          <span>Sincronizar Todo a Google Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBulkModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
          title={`Carga masiva desde Excel para ${meta.label}`}
        >
          <Upload className="h-3.5 w-3.5 text-emerald-400" />
          <span>Carga Masiva (Excel)</span>
        </button>

        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition"
            title={`Abrir ${meta.fileName} en Google Drive`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver en Drive</span>
          </a>
        )}
      </div>

      <DriveActionConfirmModal
        isOpen={confirmMode !== null}
        mode={confirmMode || 'single'}
        moduleKey={moduleKey}
        onClose={() => setConfirmMode(null)}
        onCompleted={handleCompleted}
      />

      <BulkImportModal
        isOpen={showBulkModal}
        moduleKey={moduleKey}
        onClose={() => setShowBulkModal(false)}
        onImported={handleCompleted}
      />
    </>
  );
};
