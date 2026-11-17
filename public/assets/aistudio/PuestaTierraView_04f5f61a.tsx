import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  TowerControl as Tower,
  Search,
  Filter,
  Camera,
  X,
  Edit2,
  AlertCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { PuestaTierra, LineaSubtransmision, Estructura, Usuario, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';

interface PuestaTierraViewProps {
  puestaTierraList?: PuestaTierra[];
  puestaTierra?: PuestaTierra[];
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  selectedPoste?: string;
  onSelectPoste?: (poste: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
  onGoToDeficiencias?: () => void;
  onNavigateToDeficiencias?: () => void;
}

const DRIVE_PHOTO_FOLDER = 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link';

export const PuestaTierraView: React.FC<PuestaTierraViewProps> = ({
  puestaTierraList: propList,
  puestaTierra,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  selectedPoste = 'TODOS',
  onSelectPoste,
  onRefresh,
  onOpenPhoto,
  onGoToDeficiencias,
  onNavigateToDeficiencias
}) => {
  const puestaTierraList = propList || puestaTierra || [];
  const handleGoToDef = onGoToDeficiencias || onNavigateToDeficiencias;

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PuestaTierra> | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // Structures for currently selected line in the form
  const structuresForEditingLine = useMemo(() => {
    if (!editingItem?.cod_linea) return [];
    const list = estructuras.filter(e => e.cod_linea === editingItem.cod_linea);
    return Array.from(new Set(list.map(e => e.poste_n))).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [estructuras, editingItem?.cod_linea]);

  // Structures for header / filter bar
  const availablePostesForSelectedLine = useMemo(() => {
    if (selectedLine === 'TODAS') return [];
    const list = estructuras.filter(e => e.cod_linea === selectedLine);
    return Array.from(new Set(list.map(e => e.poste_n))).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [estructuras, selectedLine]);

  // Filtered List
  const filteredList = useMemo(() => {
    return puestaTierraList.filter(item => {
      // Line filter
      if (selectedLine !== 'TODAS' && item.cod_linea !== selectedLine) {
        return false;
      }
      // Poste filter
      if (selectedPoste !== 'TODOS' && item.poste_n !== selectedPoste) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== 'TODAS' && item.prioridad !== priorityFilter) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.cod_linea.toLowerCase().includes(q) ||
          String(item.poste_n).toLowerCase().includes(q) ||
          (item.tipo_estructura || '').toLowerCase().includes(q) ||
          (item.material_estructura || '').toLowerCase().includes(q) ||
          (item.comentario || '').toLowerCase().includes(q) ||
          String(item.valor_resistencia_pat).includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [puestaTierraList, selectedLine, selectedPoste, priorityFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = puestaTierraList.length;
    const criticos = puestaTierraList.filter(p => p.valor_resistencia_pat >= 5.0).length;
    const conformes = total - criticos;
    const avg = total > 0 ? (puestaTierraList.reduce((acc, cur) => acc + cur.valor_resistencia_pat, 0) / total).toFixed(2) : '0';
    const max = total > 0 ? Math.max(...puestaTierraList.map(p => p.valor_resistencia_pat)).toFixed(2) : '0';
    return { total, criticos, conformes, avg, max };
  }, [puestaTierraList]);

  const handleStartNew = () => {
    const defaultLine = selectedLine !== 'TODAS' ? selectedLine : (lineas[0]?.cod_linea || 'L-6561');
    setEditingItem({
      cod_linea: defaultLine,
      poste_n: '',
      utm_este: '',
      utm_norte: '',
      tipo_estructura: 'Alineamiento',
      material_estructura: 'Madera',
      fecha_medicion: ' ',
      valor_resistencia_pat: 0,
      comentario: '',
      prioridad: 'NO PRIORITARIO',
      alerta_deficiencia: false,
      evidencia_url: DRIVE_PHOTO_FOLDER,
      responsable: `${currentUser.nombres} ${currentUser.apellidos}`
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleStartEdit = (p: PuestaTierra) => {
    setEditingItem({ ...p });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'Debe seleccionar una línea y un número de estructura/poste.');
      return;
    }

    const valor = Number(editingItem.valor_resistencia_pat);
    if (isNaN(valor) || valor < 0) {
      showNotification('error', 'Ingrese un valor de resistencia válido.');
      return;
    }

    if (isEditing && editingItem.id_pat) {
      storageService.updatePuestaTierra(editingItem.id_pat, {
        ...editingItem,
        valor_resistencia_pat: valor
      });
     showNotification('success', `Medición PAT ${editingItem.id_pat} actualizada.`);
    } else {
      const result = storageService.addPuestaTierra({
        cod_linea: editingItem.cod_linea,
        poste_n: String(editingItem.poste_n).trim(),
        utm_este: editingItem.utm_este,
        utm_norte: editingItem.utm_norte,
        tipo_estructura: editingItem.tipo_estructura,
        material_estructura: editingItem.material_estructura,
        fecha_medicion: editingItem.fecha_medicion || ' ',
        valor_resistencia_pat: valor,
        comentario: editingItem.comentario,
        evidencia_url: editingItem.evidencia_url || DRIVE_PHOTO_FOLDER,
        responsable: editingItem.responsable || `${currentUser.nombres} ${currentUser.apellidos}`
      });

      if (result.deficienciaCreada) {
        showNotification(
          'warning',
          `⚠️ Alerta emitida a la base: Resistencia de PAT ≥ 5.0 Ω (${valor} Ω). Se registró automáticamente la Deficiencia ${result.deficienciaCreada.id_deficiencia} con PRIORIDAD para su levantamiento.`
        );
      } else {
       showNotification('success', `Medición PAT ${editingItem.id_pat} actualizada.`);
      }
    }

    setIsModalOpen(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleCreateDeficienciaManual = (pat: PuestaTierra) => {
    const def = storageService.crearDeficienciaDesdePAT(pat.id_pat);
    if (def) {
      showNotification(
        'success',
        `Deficiencia ${def.id_deficiencia} registrada con PRIORIDAD para la estructura ${pat.poste_n} (Línea ${pat.cod_linea}).`
      );
      onRefresh();
    }
  };


  return (
    <div className="space-y-6">
      {/* Notifications toast */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
          notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : notification.type === 'warning'
            ? 'bg-amber-950/90 border-amber-600 text-amber-200'
            : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 animate-bounce" />
            ) : notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner with Rules and Statistics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Toma de Medición de Puestas a Tierra (PAT)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Norma CNE / OSINERGMIN
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Límite admisible: <strong className="text-emerald-400">&lt; 5.0 Ω</strong>. Toda medición de <strong>5.0 Ω a más</strong> emite notificación inmediata a la base como <span className="text-red-400 font-bold">PRIORITARIO</span> para el levantamiento de deficiencia.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={DRIVE_PHOTO_FOLDER}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              title="Abrir carpeta Google Drive para subir fotografías de puestas a tierra"
            >
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              <span>Subir Fotos a Google Drive</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>

            <button
              onClick={() => ExcelService.exportPuestaTierra(filteredList)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              title="Exportar datos en Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Medición PAT</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Mediciones</span>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">{stats.total}</div>
          </div>

          <div className="bg-slate-950/60 border border-emerald-900/50 rounded-xl p-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Conformes (&lt; 5 Ω)</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">{stats.conformes}</div>
          </div>

          <div className="bg-slate-950/60 border border-red-900/60 rounded-xl p-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Críticos (≥ 5 Ω)</span>
              {stats.criticos > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
            </div>
            <div className="text-xl font-extrabold text-red-400 font-mono mt-0.5 flex items-center gap-1">
              <span>{stats.criticos}</span>
              <span className="text-[10px] font-bold text-amber-300 font-sans">PRIORITARIO</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Promedio (Ω)</span>
            <div className="text-xl font-extrabold text-cyan-300 font-mono mt-0.5">{stats.avg} Ω</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Máximo Medido</span>
            <div className="text-xl font-extrabold text-orange-400 font-mono mt-0.5">{stats.max} Ω</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Line Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Línea:</label>
            <div className="relative">
              <select
                value={selectedLine}
                onChange={(e) => onSelectLine(e.target.value)}
                className="bg-slate-950 text-xs font-semibold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-8 cursor-pointer"
              >
                <option value="TODAS">Todas las Líneas ({lineas.length})</option>
                {Array.from(new Set(lineas.map(l => l.cod_linea))).map(cod => (
                  <option key={`pat-line-${cod}`} value={cod}>{cod}</option>
                ))}
              </select>
              <Layers className="h-3.5 w-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Dynamic Pole Filter */}
          {selectedLine !== 'TODAS' && availablePostesForSelectedLine.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Poste:</label>
              <div className="relative">
                <select
                  value={selectedPoste}
                  onChange={(e) => onSelectPoste && onSelectPoste(e.target.value)}
                  className="bg-slate-950 text-xs font-semibold text-emerald-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8 cursor-pointer"
                >
                  <option value="TODOS">Todos los Postes ({availablePostesForSelectedLine.length})</option>
                  {availablePostesForSelectedLine.map(p => (
                    <option key={`pat-filter-poste-${p}`} value={p}>Poste {p}</option>
                  ))}
                </select>
                <Tower className="h-3.5 w-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Simplified Priority Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Prioridad:</label>
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-slate-950 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="TODAS">Todas las Prioridades</option>
                <option value="PRIORITARIO">PRIORITARIO (≥ 5.0 Ω)</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO (&lt; 5.0 Ω)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por poste, material, valor..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3">ITEM</th>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">ESTRUCTURA</th>
                <th className="px-3 py-3">TIPO / MATERIAL</th>
                <th className="px-3 py-3">COORDENADAS UTM</th>
                <th className="px-3 py-3">FECHA MED.</th>
                <th className="px-4 py-3 text-right">RESISTENCIA (PAT)</th>
                <th className="px-3 py-3 text-center">PRIORIDAD</th>
                <th className="px-3 py-3">ALERTA A LA BASE</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredList.map((p, idx) => {
                const esCritico = p.valor_resistencia_pat >= 5.0;
                return (
                  <tr
                    key={`pat-${p.id_pat}-${idx}`}
                    className={`transition ${esCritico ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-800/50'}`}
                  >
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                      {p.item || idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-cyan-300 font-mono text-xs">{p.cod_linea}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Tower className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-extrabold text-white text-sm">P-{p.poste_n}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-200 font-medium">{p.tipo_estructura || '-'}</div>
                      <div className="text-[10px] text-slate-400">{p.material_estructura || '-'}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                      {p.utm_este && p.utm_norte ? (
                        <span>E: {p.utm_este} / N: {p.utm_norte}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-[11px]">
                      {p.fecha_medicion}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`font-mono text-base font-extrabold ${esCritico ? 'text-red-400' : 'text-emerald-400'}`}>
                        {p.valor_resistencia_pat.toFixed(2)} Ω
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        p.prioridad === 'PRIORITARIO'
                          ? 'bg-red-950 text-red-300 border-red-700 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {p.prioridad === 'PRIORITARIO' && <AlertCircle className="h-3 w-3 text-red-400" />}
                        {p.prioridad}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {esCritico ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                            Requiere Levantamiento
                          </span>
                          <button
                            onClick={() => handleCreateDeficienciaManual(p)}
                            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                          >
                            <span>Generar Deficiencia</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Conforme (&lt; 5.0 Ω)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Editar Medición"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={p.evidencia_url || DRIVE_PHOTO_FOLDER}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300"
                          title="Abrir carpeta Google Drive para fotos"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron mediciones de puesta a tierra con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New / Edit Puesta a Tierra */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isEditing ? `Editar Medición PAT (${editingItem.id_pat})` : 'Registrar Nueva Medición de Puesta a Tierra'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ingrese el valor de resistencia obtenido en la estructura.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Critical Alert Warning */}
            {Number(editingItem.valor_resistencia_pat) >= 5.0 && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-start gap-2.5 animate-in zoom-in-95">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <strong className="font-extrabold text-red-300 block">ALERTA NORMATIVA: Resistencia ≥ 5.0 Ω</strong>
                  <span>
                    El valor de {Number(editingItem.valor_resistencia_pat).toFixed(2)} Ω supera el límite admisible del CNE. Se emitirá una notificación prioritaria a la base para la programación urgente del levantamiento de deficiencia.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Línea selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  LÍNEA DE SUBTRANSMISIÓN <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={editingItem.cod_linea || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, cod_linea: e.target.value, poste_n: '' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-bold"
                  >
                    {Array.from(new Set(lineas.map(l => l.cod_linea))).map(cod => (
                      <option key={`modal-line-${cod}`} value={cod}>{cod}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Structure / Poste Dropdown */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ESTRUCTURA / POSTE <span className="text-red-400">*</span>
                </label>
                {structuresForEditingLine.length > 0 ? (
                  <select
                    value={editingItem.poste_n || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, poste_n: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold"
                  >
                    <option value="">-- Seleccionar Poste de la Línea --</option>
                    {structuresForEditingLine.map(p => (
                      <option key={`modal-poste-${p}`} value={p}>Poste {p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editingItem.poste_n || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, poste_n: e.target.value })}
                    placeholder="ej: 14, 46, 78"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                )}
              </div>

              {/* Valor de Resistencia (PAT) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  VALOR DE RESISTENCIA (Ω) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.valor_resistencia_pat ?? ''}
                  onChange={(e) => setEditingItem({ ...editingItem, valor_resistencia_pat: parseFloat(e.target.value) || 0 })}
                  placeholder="ej: 4.50 ó 22.30"
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 font-mono text-sm font-extrabold ${
                    Number(editingItem.valor_resistencia_pat) >= 5.0
                      ? 'border-red-500 text-red-400'
                      : 'border-slate-700 text-emerald-300'
                  }`}
                />
                <span className="text-[10px] text-slate-400">Límite norma: &lt; 5.0 Ω</span>
              </div>

              {/* Fecha de Medición */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">FECHA DE MEDICIÓN</label>
                <input
                  type="text"
                  value={editingItem.fecha_medicion || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, fecha_medicion: e.target.value })}
                  placeholder="2026-10-29"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Tipo de Estructura */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">TIPO DE ESTRUCTURA</label>
                <select
                  value={editingItem.tipo_estructura || 'Alineamiento'}
                  onChange={(e) => setEditingItem({ ...editingItem, tipo_estructura: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Alineamiento">Alineamiento</option>
                  <option value="Anclaje">Anclaje</option>
                  <option value="Angulo">Ángulo</option>
                  <option value="CD">CD (Corte de Distancia)</option>
                  <option value="Terminal">Terminal</option>
                </select>
              </div>

              {/* Material de Estructura */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">MATERIAL DE ESTRUCTURA</label>
                <select
                  value={editingItem.material_estructura || 'Madera'}
                  onChange={(e) => setEditingItem({ ...editingItem, material_estructura: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Madera">Madera</option>
                  <option value="CAC">CAC (Concreto Armado Centrifugado)</option>
                  <option value="Celosía Metálica">Celosía Metálica</option>
                  <option value="Polimérico">Polimérico</option>
                </select>
              </div>

              {/* Coordenadas UTM */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">COORDENADA UTM ESTE</label>
                <input
                  type="text"
                  value={editingItem.utm_este || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, utm_este: e.target.value })}
                  placeholder="ej: 544609"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">COORDENADA UTM NORTE</label>
                <input
                  type="text"
                  value={editingItem.utm_norte || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, utm_norte: e.target.value })}
                  placeholder="ej: 9597877"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Responsable */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">RESPONSABLE / CONTRATISTA</label>
                <input
                  type="text"
                  value={editingItem.responsable || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, responsable: e.target.value })}
                  placeholder="ej: Consorcio Eléctrico del Norte / Ing. Peña"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Comentarios */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">COMENTARIOS / OBSERVACIONES</label>
                <textarea
                  rows={2}
                  value={editingItem.comentario || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, comentario: e.target.value })}
                  placeholder="Detalle de estado de conectores, soldadura exotérmica o salinidad..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Google Drive Photo Folder Link */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>ENLACE DE EVIDENCIA FOTOGRÁFICA (GOOGLE DRIVE)</span>
                  <a
                    href={DRIVE_PHOTO_FOLDER}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                  >
                    <span>Abrir carpeta oficial de fotos</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={editingItem.evidencia_url || DRIVE_PHOTO_FOLDER}
                  onChange={(e) => setEditingItem({ ...editingItem, evidencia_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer"
              >
                {isEditing ? 'Guardar Cambios' : 'Registrar Medición PAT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
