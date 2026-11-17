import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Edit2,
  Search,
  Filter,
  FileSpreadsheet,
  Camera,
  CheckCircle,
  Clock,
  ExternalLink,
  Save,
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';
import {
  Deficiencia,
  LineaSubtransmision,
  Estructura,
  Usuario,
  Prioridad,
  EstadoDeficiencia,
  TipoPosteDeficiencia
} from '../types';

import {
  CATALOGO_DEFICIENCIAS_MADERA,
  CATALOGO_DEFICIENCIAS_CONCRETO,
  CATALOGO_DEFICIENCIAS_CELOSIA,
  CATALOGO_DEFICIENCIAS_POR_TIPO
} from '../data/catalogs';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface DeficienciasViewProps {
  deficiencias: Deficiencia[];
  lineas: LineaSubtransmision[];
  estructuras?: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const DeficienciasView: React.FC<DeficienciasViewProps> = ({
  deficiencias,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('TODAS');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Modal New/Edit
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Deficiencia> | null>(null);

  // Available structures / poles for chosen line directly from estructuras template
  const availablePostes = useMemo(() => {
    return getPostesForLine(estructuras, editingItem?.cod_linea);
  }, [editingItem?.cod_linea, estructuras]);


  // Notification & Soft Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Deficiencia | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storageService.deleteDeficiencia(deleteTarget.id_deficiencia);
    showNotification('success', `Deficiencia ${deleteTarget.id_deficiencia} marcada como Eliminado (borrado lógico).`);
    setDeleteTarget(null);
    onRefresh();
  };

  const filteredList = useMemo(() => {
    return deficiencias.filter(d => {
      const matchLine = selectedLine === 'TODAS' || d.cod_linea === selectedLine;
      const matchSearch =
        d.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tipo_deficiencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.usuario_responsable.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPrio = filterPrioridad === 'TODAS' || d.prioridad === filterPrioridad;
      const matchEst = filterEstado === 'TODOS' || d.estado === filterEstado;

      return matchLine && matchSearch && matchPrio && matchEst;
    });
  }, [deficiencias, selectedLine, searchTerm, filterPrioridad, filterEstado]);

  // Autocomplete OM State
  const [showOmDropdown, setShowOmDropdown] = useState(false);
  const allMantenimientos = useMemo(() => storageService.getMantenimiento(), []);
  const matchingOMs = useMemo(() => {
    const term = (editingItem?.numero_om || '').toLowerCase();
    if (!term) return allMantenimientos.slice(0, 6);
    return allMantenimientos
      .filter(m => m.orden_mantenimiento.toLowerCase().includes(term) || m.actividad_realizada.toLowerCase().includes(term))
      .slice(0, 8);
  }, [editingItem?.numero_om, allMantenimientos]);

  const getStructurePoleType = (line?: string, poste?: string): TipoPosteDeficiencia => {
    if (!line || !poste || !estructuras) return 'Madera';
    const st = getStructureDetails(estructuras, line, poste);
    const mat = (st?.poste_material || '').toLowerCase();
    if (mat.includes('cac') || mat.includes('concreto')) return 'Concreto';
    if (mat.includes('celos') || mat.includes('torre') || mat.includes('acero') || mat.includes('metal')) return 'Celosía';
    return 'Madera';
  };

  const inferTipoPosteFromDef = (tipoDef: string, explicitTipo?: TipoPosteDeficiencia): TipoPosteDeficiencia => {
    if (explicitTipo) return explicitTipo;
    if (CATALOGO_DEFICIENCIAS_CONCRETO.includes(tipoDef)) return 'Concreto';
    if (CATALOGO_DEFICIENCIAS_CELOSIA.includes(tipoDef)) return 'Celosía';
    return 'Madera';
  };

  const currentTipoPoste: TipoPosteDeficiencia = useMemo(() => {
    if (editingItem?.tipo_poste) return editingItem.tipo_poste;
    if (editingItem?.tipo_deficiencia) {
      return inferTipoPosteFromDef(editingItem.tipo_deficiencia);
    }
    return getStructurePoleType(editingItem?.cod_linea, editingItem?.poste_n);
  }, [editingItem?.tipo_poste, editingItem?.tipo_deficiencia, editingItem?.cod_linea, editingItem?.poste_n]);

  const activeCatalog = useMemo(() => {
    return CATALOGO_DEFICIENCIAS_POR_TIPO[currentTipoPoste] || CATALOGO_DEFICIENCIAS_MADERA;
  }, [currentTipoPoste]);

  const handleTipoPosteChange = (newTipo: TipoPosteDeficiencia) => {
    const allowed = CATALOGO_DEFICIENCIAS_POR_TIPO[newTipo] || [];
    const isCurrentValid = allowed.includes(editingItem?.tipo_deficiencia || '');
    setEditingItem(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tipo_poste: newTipo,
        // Al cambiar el tipo de poste, la deficiencia se limpia automáticamente si no corresponde
        tipo_deficiencia: isCurrentValid ? prev.tipo_deficiencia : ''
      };
    });
  };

  const handleStartNew = () => {
    const targetLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const initialPostes = getPostesForLine(estructuras, targetLine);
    const firstPoste = initialPostes[0] || '';
    const initialTipo = getStructurePoleType(targetLine, firstPoste);
    setEditingItem({
      cod_linea: targetLine,
      poste_n: firstPoste,
      tipo_poste: initialTipo,
      fecha_inspeccion: new Date().toISOString().split('T')[0],
      tipo_deficiencia: CATALOGO_DEFICIENCIAS_POR_TIPO[initialTipo][0] || '',
      descripcion: '',
      prioridad: 'PRIORITARIO',
      numero_om: '',
      evidencia_fotografica: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
      observaciones: '',
      usuario_responsable: `${currentUser.nombres} ${currentUser.apellidos}`,
      estado: 'Registrada'
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (def: Deficiencia) => {
    const resolvedTipo = inferTipoPosteFromDef(def.tipo_deficiencia, def.tipo_poste);
    setEditingItem({
      ...def,
      tipo_poste: resolvedTipo
    });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n || !editingItem.tipo_deficiencia) {
      showNotification('error', 'Complete todos los campos obligatorios, incluyendo la deficiencia específica del poste.');
      return;
    }

    if (!editingItem.evidencia_fotografica || editingItem.evidencia_fotografica.trim() === '') {
      showNotification('error', 'La evidencia fotográfica es obligatoria para registrar deficiencias.');
      return;
    }

    if (isNew) {
      storageService.addDeficiencia({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        tipo_poste: editingItem.tipo_poste || currentTipoPoste,
        fecha_inspeccion: editingItem.fecha_inspeccion || new Date().toISOString().split('T')[0],
        tipo_deficiencia: editingItem.tipo_deficiencia,
        descripcion: editingItem.descripcion || '',
        prioridad: (editingItem.prioridad as Prioridad) || 'PRIORITARIO',
        numero_om: editingItem.numero_om || '',
        evidencia_fotografica: editingItem.evidencia_fotografica,
        observaciones: editingItem.observaciones || '',
        usuario_responsable: editingItem.usuario_responsable || currentUser.nombres,
        estado: (editingItem.estado as EstadoDeficiencia) || 'Registrada'
      });
      showNotification('success', 'Deficiencia registrada con evidencia fotográfica vinculada.');
    } else {
      storageService.updateDeficiencia(editingItem.id_deficiencia!, {
        ...editingItem,
        tipo_poste: editingItem.tipo_poste || currentTipoPoste
      });
      showNotification('success', 'Deficiencia actualizada correctamente.');
    }

    setIsEditing(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportDeficiencias(filteredList);
    showNotification('success', `Exportadas ${filteredList.length} deficiencias a Registro_Deficiencias.xlsx.`);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'PRIORITARIO':
      case 'ALTO':
        return 'bg-red-950 text-red-300 border-red-700 font-extrabold';
      case 'NO PRIORITARIO':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700 font-semibold';
    }
  };


  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Módulo de Inspección de Deficiencias</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                {filteredList.length} registros
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro, evaluación y seguimiento de anomalías con catálogo oficial de 28 tipos de deficiencias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Deficiencia</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>
          </div>
        </div>

        <DriveModuleToolbar moduleKey="DEFICIENCIAS" onDataImported={onRefresh} />
      </div>

      {/* Edit / New Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-red-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                {isNew ? 'Registrar Nueva Deficiencia' : `Editar Deficiencia: ${editingItem.id_deficiencia}`}
              </h2>
              <p className="text-xs text-slate-400">
                La evidencia fotográfica es obligatoria según la especificación del sistema.
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">CÓDIGO DE LÍNEA <span className="text-red-400">*</span></label>
              <select
                value={editingItem.cod_linea || ''}
                onChange={(e) => {
                  const newCod = e.target.value;
                  const newPostes = getPostesForLine(estructuras, newCod);
                  setEditingItem({ ...editingItem, cod_linea: newCod, poste_n: newPostes[0] || '' });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
              >
                {lineas.map(l => (
                  <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                POSTE N° <span className="text-red-400">*</span>
                {availablePostes.length > 0 && (
                  <span className="text-[10px] text-cyan-400 ml-1 font-normal font-sans">
                    ({availablePostes.length} en plantilla)
                  </span>
                )}
              </label>
              <select
                value={editingItem.poste_n || ''}
                onChange={(e) => {
                  const newPoste = e.target.value;
                  const suggestedType = getStructurePoleType(editingItem.cod_linea, newPoste);
                  const allowed = CATALOGO_DEFICIENCIAS_POR_TIPO[suggestedType] || [];
                  const isCurrentValid = allowed.includes(editingItem.tipo_deficiencia || '');
                  setEditingItem({
                    ...editingItem,
                    poste_n: newPoste,
                    tipo_poste: suggestedType,
                    tipo_deficiencia: isCurrentValid ? editingItem.tipo_deficiencia : (allowed[0] || '')
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="">-- Seleccionar Poste --</option>
                {availablePostes.map(p => (
                  <option key={p} value={p}>Poste {p}</option>
                ))}
                {editingItem.poste_n && !availablePostes.includes(editingItem.poste_n) && (
                  <option value={editingItem.poste_n}>Poste {editingItem.poste_n} (Actual)</option>
                )}
              </select>
              {availablePostes.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">
                  No se encontraron postes en la plantilla para la línea {editingItem.cod_linea}.
                </p>
              )}
            </div>

            {/* Selector de Tipo de Poste */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>TIPO DE POSTE</span>
                <span className="text-[10px] text-amber-400 font-normal">Filtra catálogo</span>
              </label>
              <select
                value={currentTipoPoste}
                onChange={(e) => handleTipoPosteChange(e.target.value as TipoPosteDeficiencia)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-bold focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="Madera">Madera (28 deficiencias)</option>
                <option value="Concreto">Concreto (11 deficiencias)</option>
                <option value="Celosía">Celosía (11 deficiencias)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">FECHA DE INSPECCIÓN</label>
              <input
                type="date"
                value={editingItem.fecha_inspeccion || ''}
                onChange={(e) => setEditingItem({ ...editingItem, fecha_inspeccion: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PRIORIDAD <span className="text-red-400">*</span></label>
              <select
                value={editingItem.prioridad || 'PRIORITARIO'}
                onChange={(e) => setEditingItem({ ...editingItem, prioridad: e.target.value as Prioridad })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="PRIORITARIO">PRIORITARIO</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO</option>
              </select>
            </div>


            {/* Dropdown de deficiencias habilitado solo con las de ese tipo */}
            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  TIPO DE DEFICIENCIA — Catálogo Tipo {currentTipoPoste} ({activeCatalog.length} deficiencias)
                </span>
                <span className="text-[10px] text-red-400 font-normal">* Obligatorio</span>
              </label>
              <select
                value={editingItem.tipo_deficiencia || ''}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_deficiencia: e.target.value })}
                className={`w-full bg-slate-900 border ${!editingItem.tipo_deficiencia ? 'border-amber-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-cyan-500`}
                required
              >
                <option value="">-- Seleccionar Deficiencia para Poste de {currentTipoPoste} --</option>
                {activeCatalog.map((tipo, idx) => (
                  <option key={idx} value={tipo}>{idx + 1}. {tipo}</option>
                ))}
              </select>
              {!editingItem.tipo_deficiencia && (
                <p className="text-[11px] text-amber-400 mt-1">
                  Seleccione una deficiencia válida del catálogo para estructuras de {currentTipoPoste}.
                </p>
              )}
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">DESCRIPCIÓN DETALLADA</label>
              <textarea
                value={editingItem.descripcion || ''}
                onChange={(e) => setEditingItem({ ...editingItem, descripcion: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Detalle visual, ubicación en el poste, criticidad..."
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES / ACCIÓN REQUERIDA</label>
              <textarea
                value={editingItem.observaciones || ''}
                onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Materiales sugeridos, reforzamiento, cambio..."
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">
                EVIDENCIA FOTOGRÁFICA <span className="text-red-400">* (Obligatorio)</span>
              </label>
              <input
                type="text"
                value={editingItem.evidencia_fotografica || ''}
                onChange={(e) => setEditingItem({ ...editingItem, evidencia_fotografica: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="https://drive.google.com/... o enlace de fotografía"
              />
            </div>

            {/* Campo N° de OM con Autocompletado */}
            <div className="relative">
              <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>N° DE OM (ORDEN DE MANTENIMIENTO)</span>
                <span className="text-[10px] text-cyan-400 font-normal">Autocompletado</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editingItem.numero_om || ''}
                  onChange={(e) => {
                    setEditingItem({ ...editingItem, numero_om: e.target.value });
                    setShowOmDropdown(true);
                  }}
                  onFocus={() => setShowOmDropdown(true)}
                  placeholder="ej: OM-2026-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {showOmDropdown && matchingOMs.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-cyan-500/60 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1 divide-y divide-slate-800">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80 rounded-t-lg">
                    Sugerencias de Órdenes ({matchingOMs.length})
                  </div>
                  {matchingOMs.map((m) => (
                    <button
                      key={m.id_mantenimiento}
                      type="button"
                      onClick={() => {
                        setEditingItem({ ...editingItem, numero_om: m.orden_mantenimiento });
                        setShowOmDropdown(false);
                      }}
                      className="w-full text-left p-2 hover:bg-slate-800 rounded text-xs transition cursor-pointer flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300">{m.orden_mantenimiento}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {m.estado}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate mt-0.5">
                        {m.cod_linea} P-{m.poste_n} • {m.actividad_realizada}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingItem.estado || 'Registrada'}
                onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value as EstadoDeficiencia })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Registrada">Registrada</option>
                <option value="Pendiente de revisión">Pendiente de revisión</option>
                <option value="En atención">En atención</option>
                <option value="Corregida">Corregida</option>
                <option value="Pendiente de verificación">Pendiente de verificación</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Rechazada para corrección">Rechazada para corrección</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">USUARIO RESPONSABLE</label>
              <input
                type="text"
                value={editingItem.usuario_responsable || ''}
                onChange={(e) => setEditingItem({ ...editingItem, usuario_responsable: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <AuditFieldsBlock
            currentUser={currentUser}
            usuarioRegistro={editingItem.usuario_registro || editingItem.Usuario_Registro}
            fechaHoraMovimiento={editingItem.fecha_hora_movimiento || editingItem.Fecha_Hora_Movimiento}
            estadoRegistro={editingItem.estado_registro || editingItem.Estado_Registro || 'Activo'}
            isNew={isNew}
            className="mt-4"
          />

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Deficiencia</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas las Líneas</option>
              {Array.from(new Set(lineas.map(l => l.cod_linea))).map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Prioridad:</span>
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 font-bold"
            >
              <option value="TODAS">Todas</option>
              <option value="PRIORITARIO">PRIORITARIO</option>
              <option value="NO PRIORITARIO">NO PRIORITARIO</option>
            </select>

          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Estado:</span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODOS">Todos</option>
              <option value="Registrada">Registrada</option>
              <option value="Pendiente de revisión">Pendiente de revisión</option>
              <option value="En atención">En atención</option>
              <option value="Corregida">Corregida</option>
              <option value="Cerrada">Cerrada</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por poste, descripción..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-red-500"
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
                <th className="px-3 py-3">CÓDIGO</th>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-3 py-3">N° OM</th>
                <th className="px-4 py-3">TIPO DE DEFICIENCIA</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3">FECHA</th>
                <th className="px-3 py-3">RESPONSABLE</th>
                <th className="px-2 py-3">EVIDENCIA</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se encontraron deficiencias registradas.
                  </td>
                </tr>
              ) : (
                filteredList.map((d) => (
                  <tr key={d.id_deficiencia} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{d.id_deficiencia}</td>
                    <td className="px-3 py-2.5 font-mono text-white">{d.cod_linea}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-white">
                      <div>{d.poste_n}</div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-amber-300 font-sans font-medium inline-block mt-0.5">
                        {inferTipoPosteFromDef(d.tipo_deficiencia, d.tipo_poste)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-cyan-400 font-bold">
                      {d.numero_om ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                          {d.numero_om}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-sm">
                      <div className="font-semibold text-slate-200">{d.tipo_deficiencia}</div>
                      {d.descripcion && <div className="text-[11px] text-slate-400 truncate">{d.descripcion}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getPriorityBadge(d.prioridad)}`}>
                        {d.prioridad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{d.fecha_inspeccion}</td>
                    <td className="px-3 py-2.5 text-slate-300 truncate max-w-[120px]">{d.usuario_responsable}</td>
                    <td className="px-2 py-2.5 text-center">
                      {d.evidencia_fotografica ? (
                        <button
                          onClick={() => onOpenPhoto && onOpenPhoto(d.evidencia_fotografica, `Deficiencia ${d.cod_linea} P-${d.poste_n}`)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300"
                          title="Ver fotografía obligatoria"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-red-400 font-bold">Falta</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(d)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer"
                          title="Editar deficiencia"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {currentUser.rol !== 'Contratista' && (
                          <button
                            onClick={() => setDeleteTarget(d)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/70 text-red-400 transition cursor-pointer"
                            title="Eliminar deficiencia (borrado lógico)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmación Soft Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Confirmar Eliminación Lógica</h3>
                <p className="text-xs text-slate-400 mt-1">
                  El registro quedará marcado como <strong className="text-rose-300">Eliminado</strong> en auditoría y se sincronizará con Google Drive.
                </p>
              </div>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="font-mono font-bold text-cyan-300">{deleteTarget.id_deficiencia}</div>
              <div className="text-slate-300">Línea {deleteTarget.cod_linea} • Poste {deleteTarget.poste_n}</div>
              <div className="text-slate-400 line-clamp-2">{deleteTarget.tipo_deficiencia}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Sí, eliminar deficiencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
