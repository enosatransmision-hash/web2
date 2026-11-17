import React from 'react';
import {
  AlertTriangle,
  X,
  Check,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ConflictoRegistro } from '../types';
import { storageService } from '../services/storageService';

interface ConflictosModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictos: ConflictoRegistro[];
  onRefresh: () => void;
}

export const ConflictosModal: React.FC<ConflictosModalProps> = ({
  isOpen,
  onClose,
  conflictos,
  onRefresh
}) => {
  if (!isOpen) return null;

  const handleResolve = (id: string, decision: 'Local' | 'Drive') => {
    storageService.resolveConflicto(id, decision);
    onRefresh();
  };

  const pendingConflicts = conflictos.filter(c => !c.resuelto);
  const resolvedConflicts = conflictos.filter(c => c.resuelto);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <h2 className="text-base font-bold text-white">Resolución de Conflictos de Sincronización</h2>
              <p className="text-xs text-slate-400">
                Se han detectado discrepancias entre las modificaciones locales y las realizadas directamente en Google Drive.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pending Conflicts */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {pendingConflicts.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800">
              <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">No hay conflictos pendientes</div>
              <p className="text-xs text-slate-400 mt-1">Todos los registros están sincronizados con Google Drive.</p>
            </div>
          ) : (
            pendingConflicts.map((c) => (
              <div key={c.id_conflicto} className="p-4 bg-slate-800/90 rounded-xl border border-amber-600/60 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300">
                    Conflicto en Módulo: {c.modulo} • ID Registro: {c.id_registro} • Campo: <code className="text-white bg-slate-900 px-1 py-0.5 rounded">{c.campo}</code>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{c.fecha_deteccion}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                  {/* Local version */}
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-700">
                    <span className="text-[11px] font-bold text-cyan-300 block mb-1">Versión en la Aplicación Web:</span>
                    <div className="text-slate-200 font-mono text-xs">{c.valor_local}</div>
                    <button
                      onClick={() => handleResolve(c.id_conflicto, 'Local')}
                      className="mt-2.5 w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition"
                    >
                      Conservar Versión Web
                    </button>
                  </div>

                  {/* Google Drive version */}
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-700">
                    <span className="text-[11px] font-bold text-emerald-300 block mb-1">Versión en Google Drive:</span>
                    <div className="text-slate-200 font-mono text-xs">{c.valor_drive}</div>
                    <button
                      onClick={() => handleResolve(c.id_conflicto, 'Drive')}
                      className="mt-2.5 w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                    >
                      Conservar Versión Drive
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Resolved History */}
          {resolvedConflicts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
              <span className="font-bold text-slate-400 mb-2 block">Conflictos Resueltos Recientemente ({resolvedConflicts.length}):</span>
              <div className="space-y-1.5">
                {resolvedConflicts.slice(0, 5).map(r => (
                  <div key={r.id_conflicto} className="flex items-center justify-between p-2 bg-slate-950/40 rounded border border-slate-800 text-[11px] text-slate-400">
                    <span>{r.modulo} ({r.id_registro}) - {r.campo}</span>
                    <span className="text-emerald-400 font-semibold">Resuelto: Se conservó versión {r.resolucion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
