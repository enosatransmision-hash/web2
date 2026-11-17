import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Edit2,
  Search,
  FileSpreadsheet,
  Download,
  Camera,
  Save,
  X,
  CheckCircle,
  TowerControl as Tower,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';
import { Mantenimiento, LineaSubtransmision, Usuario, Estructura, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface MantenimientoViewProps {
  mantenimiento: Mantenimiento[];
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const MantenimientoView: React.FC<MantenimientoViewProps> = ({
  mantenimiento,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Mantenimiento> | null>(null);

  // Structure creation with reordering option in Maintenance
  const [includesStructureShift, setIncludesStructureShift] = useState(false);
  const [newStructureData, setNewStructureData] = useState<Partial<Estructura>>({
    tipo_armado: 'A',
    poste_material: 'madera',
    cruceta_material: 'madera',
    aislador_material: 'polimérico',
    conductor_material: 'AAAC',
    conductor_calibre: '240'
  });

  const [deleteTarget, setDeleteTarget] = useState<Mantenimiento | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storageService.deleteMantenimiento(deleteTarget.id_mantenimiento);
    showNotification('success', `Registro de mantenimiento ${deleteTarget.orden_mantenimiento} marcado como Eliminado (borrado lógico).`);
    setDeleteTarget(null);
    onRefresh();
  };

  const filteredList = useMemo(() => {
    return mantenimiento.filter(m => {
      const matchLine = selectedLine === 'TODAS' || m.cod_linea === selectedLine;
      const matchSearch =
        m.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.orden_mantenimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.actividad_realizada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchTipo = filterTipo === 'TODOS' || m.tipo_mantenimiento === filterTipo;
      const matchPrio = filterPrioridad === 'TODAS' || m.prioridad === filterPrioridad;
      return matchLine && matchSearch && matchTipo && matchPrio;
    });
  }, [mantenimiento, selectedLine, searchTerm, filterTipo, filterPrioridad]);

  // Dynamic list of postes for current line in modal
  const availablePostesForForm = useMemo(() => {
    return getPostesForLine(estructuras, editingItem?.cod_linea);
  }, [estructuras, editingItem?.cod_linea]);

  const handleStartNew = (withStructure = false) => {
    const targetLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const initialPostes = getPostesForLine(estructuras, targetLine);
    const firstPoste = initialPostes[0] || '';
    setEditingItem({
      cod_linea: targetLine,
      poste_n: firstPoste,
      fecha_ejecucion: new Date().toISOString().split('T')[0],
      tipo_mantenimiento: withStructure ? 'Predictivo' : 'Preventivo',
      actividad_realizada: withStructure ? 'Instalación de nueva estructura intermedia y ajuste de orden' : '',
      orden_mantenimiento: `OM-${Math.floor(10000 + Math.random() * 90000)}-2026`,
      observaciones: '',
      prioridad: 'PRIORITARIO',
      fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'],
      contratista_responsable: currentUser.rol === 'Contratista' ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Consorcio Eléctrico del Norte',
      estado: 'Finalizado',
      altera_estructuras: withStructure
    });
    setIncludesStructureShift(withStructure);
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (m: Mantenimiento) => {
    setEditingItem({
      ...m,
      prioridad: m.prioridad || 'PRIORITARIO'
    });
    setIncludesStructureShift(false);
    setIsNew(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n || !editingItem.actividad_realizada) {
      showNotification('error', 'Línea, poste y actividad realizada son obligatorios.');
      return;
    }

    const prio: Prioridad = (editingItem.prioridad as Prioridad) || 'PRIORITARIO';

    let detalleReordenamiento = '';
    if (includesStructureShift && isNew) {
      // Execute the structure shifting insertion as specified in section 7
      const shiftRes = storageService.insertStructureWithShift(
        editingItem.cod_linea,
        editingItem.poste_n,
        {
          tipo_armado: newStructureData.tipo_armado || 'A',
          poste_cantidad: '1',
          poste_material: newStructureData.poste_material || 'madera',
          cruceta_material: newStructureData.cruceta_material || 'madera',
          mensula_material: '',
          riostra_o_amarre_material: '',
          aislador_material: newStructureData.aislador_material || 'polimérico',
          aislador_cant: '6',
          aislador_tipo: '',
          conductor_material: newStructureData.conductor_material || 'AAAC',
          conductor_calibre: newStructureData.conductor_calibre || '240',
          conductor_n_fases: '3',
          estado: 'Operativo',
          observaciones: `Estructura dada de alta mediante orden de mantenimiento ${editingItem.orden_mantenimiento}`
        },
        true
      );
      detalleReordenamiento = shiftRes.message;
    }

    if (isNew) {
      storageService.addMantenimiento({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        fecha_ejecucion: editingItem.fecha_ejecucion || new Date().toISOString().split('T')[0],
        tipo_mantenimiento: (editingItem.tipo_mantenimiento as any) || 'Preventivo',
        actividad_realizada: editingItem.actividad_realizada,
        orden_mantenimiento: editingItem.orden_mantenimiento || 'OM-2026',
        observaciones: editingItem.observaciones || '',
        prioridad: prio,
        fotografias: editingItem.fotografias || [],
        contratista_responsable: editingItem.contratista_responsable || '',
        estado: (editingItem.estado as any) || 'Finalizado',
        altera_estructuras: includesStructureShift,
        detalle_reordenamiento: detalleReordenamiento
      });
      showNotification('success', `Mantenimiento registrado.${detalleReordenamiento ? ' ' + detalleReordenamiento : ''}`);
    } else {
      storageService.updateMantenimiento(editingItem.id_mantenimiento!, {
        ...editingItem,
        prioridad: prio
      });
      showNotification('success', 'Registro de mantenimiento actualizado.');
    }
    setIsEditing(false);
    setEditingItem(null);
    setIncludesStructureShift(false);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportMantenimiento(filteredList);
    showNotification('success', `Exportados ${filteredList.length} registros a Registro_Mantenimiento.xlsx.`);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
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
              <Wrench className="h-5 w-5 text-cyan-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Registro y Control de Mantenimiento</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                {filteredList.length} órdenes registradas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mantenimiento preventivo, correctivo y alta / reordenamiento estructural con actualización de POSTE_N.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleStartNew(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Mantenimiento Estándar</span>
            </button>

            {currentUser.rol !== 'Contratista' && (
              <button
                onClick={() => handleStartNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition cursor-pointer"
                title="Cumple sección 7: Alta de estructura a través de Mantenimiento con reordenamiento"
              >
                <Tower className="h-4 w-4" />
                <span>Alta / Reordenamiento de Estructura</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>
          </div>
        </div>

        <DriveModuleToolbar moduleKey="MANTENIMIENTO" onDataImported={onRefresh} />
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por poste, actividad, OM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">TODAS LAS LÍNEAS</option>
              {lineas.map((l) => (
                <option key={l.id_linea} value={l.cod_linea}>
                  {l.cod_linea} - {l.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Tipo:</span>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODOS">TODOS LOS TIPOS</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Predictivo">Predictivo</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Prioridad:</span>
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value as any)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">TODAS</option>
              <option value="PRIORITARIO">PRIORITARIO</option>
              <option value="NO PRIORITARIO">NO PRIORITARIO</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Mostrando: <strong className="text-white">{filteredList.length}</strong></span>
          <span className="px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800 text-red-300 font-bold">
            {filteredList.filter(m => m.prioridad === 'PRIORITARIO').length} Prioritarios
          </span>
        </div>
      </div>

      {/* Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-cyan-400" />
                {includesStructureShift ? 'Alta de Estructura vía Mantenimiento (Reordenando Línea)' : 'Registrar Orden de Mantenimiento'}
              </h2>
              <p className="text-xs text-slate-400">
                {includesStructureShift
                  ? 'Conforme a la Sección 7: Se creará la nueva estructura en POSTE_N y se correrán los números posteriores automáticamente.'
                  : 'Registro de intervenciones preventivas, correctivas o rutinarias.'}
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">LÍNEA <span className="text-red-400">*</span></label>
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
                POSTE N° {includesStructureShift && '(Posición a insertar)'} <span className="text-red-400">*</span>
                {availablePostesForForm.length > 0 && (
                  <span className="text-[10px] text-cyan-400 ml-1 font-normal font-sans">
                    ({availablePostesForForm.length} en plantilla)
                  </span>
                )}
              </label>
              <select
                value={editingItem.poste_n || ''}
                onChange={(e) => setEditingItem({ ...editingItem, poste_n: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="">-- Seleccionar Poste --</option>
                {availablePostesForForm.map(p => (
                  <option key={p} value={p}>Poste {p}</option>
                ))}
                {editingItem.poste_n && !availablePostesForForm.includes(editingItem.poste_n) && (
                  <option value={editingItem.poste_n}>Poste {editingItem.poste_n} (Actual)</option>
                )}
              </select>
              {availablePostesForForm.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">
                  No se encontraron postes en la plantilla para la línea {editingItem.cod_linea}.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TIPO DE MANTENIMIENTO</label>
              <select
                value={editingItem.tipo_mantenimiento || 'Preventivo'}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_mantenimiento: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
               
                <option value="Emergencia">Emergencia</option>
                <option value="Predictivo">Predictivo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">N° ORDEN DE MANTENIMIENTO</label>
              <input
                type="text"
                value={editingItem.orden_mantenimiento || ''}
                onChange={(e) => setEditingItem({ ...editingItem, orden_mantenimiento: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                placeholder="OM-12345-2026"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PRIORIDAD <span className="text-red-400">*</span></label>
              <select
                value={editingItem.prioridad || 'PRIORITARIO'}
                onChange={(e) => setEditingItem({ ...editingItem, prioridad: e.target.value as Prioridad })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="PRIORITARIO">PRIORITARIO</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">ACTIVIDAD REALIZADA <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingItem.actividad_realizada || ''}
                onChange={(e) => setEditingItem({ ...editingItem, actividad_realizada: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ej: Cambio de cruceta de madera fisurada y ajuste de tirantes"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CONTRATISTA RESPONSABLE</label>
              <input
                type="text"
                value={editingItem.contratista_responsable || ''}
                onChange={(e) => setEditingItem({ ...editingItem, contratista_responsable: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingItem.estado || 'Finalizado'}
                onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Programado">Programado</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Aprobado">Aprobado</option>
              </select>
            </div>

            {/* Extra fields if inserting a new structure into the transmission line */}
            {includesStructureShift && (
              <div className="lg:col-span-4 bg-blue-950/40 border border-blue-800/80 p-4 rounded-xl">
                <span className="text-xs font-bold text-cyan-300 block mb-2">
                  DATOS DE LA NUEVA ESTRUCTURA QUE SE INCORPORA A LA LÍNEA:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Tipo de Armado</label>
                    <input
                      type="text"
                      value={newStructureData.tipo_armado || 'A'}
                      onChange={(e) => setNewStructureData({ ...newStructureData, tipo_armado: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Material Poste</label>
                    <input
                      type="text"
                      value={newStructureData.poste_material || 'madera'}
                      onChange={(e) => setNewStructureData({ ...newStructureData, poste_material: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Material Aislador</label>
                    <input
                      type="text"
                      value={newStructureData.aislador_material || 'polimérico'}
                      onChange={(e) => setNewStructureData({ ...newStructureData, aislador_material: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Conductor Calibre</label>
                    <input
                      type="text"
                      value={newStructureData.conductor_calibre || '240'}
                      onChange={(e) => setNewStructureData({ ...newStructureData, conductor_calibre: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES</label>
              <textarea
                value={editingItem.observaciones || ''}
                onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Observaciones de entrega, pruebas de continuidad y puesta en servicio..."
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Orden de Mantenimiento</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3">ORDEN N°</th>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-3 py-3">TIPO</th>
                <th className="px-4 py-3">ACTIVIDAD REALIZADA</th>
                <th className="px-3 py-3">FECHA</th>
                <th className="px-3 py-3">CONTRATISTA</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3">EVIDENCIAS</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se han registrado órdenes de mantenimiento aún.
                  </td>
                </tr>
              ) : (
                filteredList.map((m) => (
                  <tr key={m.id_mantenimiento} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{m.orden_mantenimiento}</td>
                    <td className="px-3 py-2.5 font-mono text-white">{m.cod_linea}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-white">{m.poste_n}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        m.prioridad === 'PRIORITARIO'
                          ? 'bg-red-950/80 text-red-300 border-red-800'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}>
                        {m.prioridad || 'PRIORITARIO'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                        {m.tipo_mantenimiento}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-sm">
                      <div className="font-semibold text-slate-200">{m.actividad_realizada}</div>
                      {m.detalle_reordenamiento && (
                        <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">
                          ✓ {m.detalle_reordenamiento}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{m.fecha_ejecucion}</td>
                    <td className="px-3 py-2.5 text-slate-300">{m.contratista_responsable}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {m.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.fotografias && m.fotografias.length > 0 ? (
                        <button
                          onClick={() => onOpenPhoto && onOpenPhoto(m.fotografias[0], `Mantenimiento ${m.orden_mantenimiento}`)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>{m.fotografias.length} fotos</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                        {currentUser.rol !== 'Contratista' && (
                          <button
                            onClick={() => setDeleteTarget(m)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/70 text-red-400 transition cursor-pointer"
                            title="Eliminar mantenimiento (borrado lógico)"
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
              <div className="font-mono font-bold text-cyan-300">{deleteTarget.orden_mantenimiento}</div>
              <div className="text-slate-300">Línea {deleteTarget.cod_linea} • Poste {deleteTarget.poste_n}</div>
              <div className="text-slate-400 line-clamp-2">{deleteTarget.actividad_realizada}</div>
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
                Sí, eliminar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
