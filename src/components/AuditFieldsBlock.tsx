import React from 'react';
import { UserCheck, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Usuario, EstadoRegistro } from '../types';
import { getUserAuditIdentifier, getLimaAuditTimestamp } from '../utils/auditUtils';

interface AuditFieldsBlockProps {
  currentUser?: Usuario | null;
  usuarioRegistro?: string;
  fechaHoraMovimiento?: string;
  estadoRegistro?: EstadoRegistro;
  isNew?: boolean;
  className?: string;
}

export const AuditFieldsBlock: React.FC<AuditFieldsBlockProps> = ({
  currentUser,
  usuarioRegistro,
  fechaHoraMovimiento,
  estadoRegistro = 'Activo',
  isNew = false,
  className = ''
}) => {
  const currentActiveUserTag = getUserAuditIdentifier(currentUser);
  const displayUser = isNew
    ? currentActiveUserTag
    : (usuarioRegistro || currentActiveUserTag);
  const displayFecha = isNew
    ? getLimaAuditTimestamp()
    : (fechaHoraMovimiento || getLimaAuditTimestamp());

  return (
    <div className={`bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Auditoría y Trazabilidad de Movimiento
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {isNew ? 'Registro Automático por Sesión' : 'Trazabilidad Registrada'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Usuario Registro */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold">Usuario_Registro</span>
          </div>
          <div className="text-xs font-mono font-bold text-cyan-300 truncate" title={displayUser}>
            {displayUser}
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            {isNew ? 'Detectado desde sesión activa' : 'Usuario autor del movimiento'}
          </span>
        </div>

        {/* Fecha Hora Movimiento */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold">Fecha_Hora_Movimiento</span>
          </div>
          <div className="text-xs font-mono font-bold text-amber-300">
            {displayFecha}
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            Formato: DD/MM/YYYY HH:MM:SS
          </span>
        </div>

        {/* Estado Registro */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <AlertCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold">Estado_Registro</span>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
              estadoRegistro === 'Activo'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estadoRegistro === 'Activo' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {estadoRegistro}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            {estadoRegistro === 'Activo' ? 'Registro vigente en sistema' : 'Borrado lógico (Soft Delete)'}
          </span>
        </div>
      </div>
    </div>
  );
};
