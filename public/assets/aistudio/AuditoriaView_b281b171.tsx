import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  FileSpreadsheet,
  Download,
  Filter,
  Shield,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AuditoriaRegistro, Usuario } from '../types';
import { ExcelService } from '../services/excelService';

interface AuditoriaViewProps {
  auditoria: AuditoriaRegistro[];
  currentUser: Usuario;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({ auditoria, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccion, setFilterAccion] = useState('TODAS');
  const [filterModulo, setFilterModulo] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const filteredList = useMemo(() => {
    return auditoria.filter(a => {
      const matchSearch =
        a.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.estructura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.valores_nuevos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.modulo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchAccion = filterAccion === 'TODAS' || a.accion === filterAccion;
      const matchMod = filterModulo === 'TODOS' || a.modulo === filterModulo;

      return matchSearch && matchAccion && matchMod;
    });
  }, [auditoria, searchTerm, filterAccion, filterModulo]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleExportExcel = () => {
    ExcelService.exportAuditoria(auditoria);
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case 'CREACION':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'EDICION':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'REORDENAMIENTO':
        return 'bg-purple-950 text-purple-300 border-purple-800 font-bold';
      case 'DESACTIVACION':
      case 'ELIMINACION':
        return 'bg-red-950 text-red-300 border-red-800 font-bold';
      case 'SINCRONIZACION':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'CIERRE_DMS':
        return 'bg-amber-950 text-amber-300 border-amber-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Historial de Auditoría del Sistema</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {auditoria.length} eventos registrados
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Archivo oficial: Historial_Modificaciones.xlsx • Zona Horaria: America/Lima (Inmutable)
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          <span>Exportar Historial_Modificaciones.xlsx</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Acción:</span>
            <select
              value={filterAccion}
              onChange={(e) => { setFilterAccion(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5"
            >
              <option value="TODAS">Todas las Acciones</option>
              <option value="CREACION">CREACION</option>
              <option value="EDICION">EDICION</option>
              <option value="REORDENAMIENTO">REORDENAMIENTO</option>
              <option value="DESACTIVACION">DESACTIVACION</option>
              <option value="ELIMINACION">ELIMINACION</option>
              <option value="SINCRONIZACION">SINCRONIZACION</option>
              <option value="CIERRE_DMS">CIERRE_DMS</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Módulo:</span>
            <select
              value={filterModulo}
              onChange={(e) => { setFilterModulo(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5"
            >
              <option value="TODOS">Todos los Módulos</option>
              <option value="LÍNEAS">LÍNEAS</option>
              <option value="ESTRUCTURAS">ESTRUCTURAS</option>
              <option value="EFECTO_CORONA">EFECTO_CORONA</option>
              <option value="DEFICIENCIAS">DEFICIENCIAS</option>
              <option value="TERMOGRAFIA">TERMOGRAFIA</option>
              <option value="PODAS">PODAS</option>
              <option value="DMS">DMS</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por usuario, línea, poste, detalle..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">FECHA / HORA</th>
                <th className="px-3 py-3">USUARIO / ROL</th>
                <th className="px-3 py-3">ACCIÓN</th>
                <th className="px-3 py-3">MÓDULO</th>
                <th className="px-3 py-3">LÍNEA / POSTE</th>
                <th className="px-4 py-3">DETALLE / VALORES NUEVOS</th>
                <th className="px-2 py-3">ORIGEN</th>
                <th className="px-2 py-3">RESULTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono text-[11px]">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500 font-sans">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                paginatedList.map((a) => (
                  <tr key={a.id_auditoria} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2 text-cyan-300 font-bold">{a.id_auditoria}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {a.fecha} <span className="text-slate-300">{a.hora}</span>
                    </td>
                    <td className="px-3 py-2 font-sans font-semibold text-white">
                      {a.usuario}
                      <span className="block text-[10px] text-slate-400 font-mono">{a.rol}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getActionBadge(a.accion)}`}>
                        {a.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-sans text-slate-300">{a.modulo}</td>
                    <td className="px-3 py-2 font-bold text-cyan-300">
                      {a.cod_linea} {a.estructura && a.estructura !== '-' ? `P-${a.estructura}` : ''}
                    </td>
                    <td className="px-4 py-2 font-sans text-slate-200 max-w-sm truncate" title={a.valores_nuevos}>
                      {a.valores_nuevos}
                    </td>
                    <td className="px-2 py-2 font-sans text-slate-400">{a.origen}</td>
                    <td className="px-2 py-2">
                      <span className="text-emerald-400 font-bold font-sans">✓ {a.resultado}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
