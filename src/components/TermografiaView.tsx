import React, { useState, useMemo } from 'react';
import {
  Flame,
  Search,
  Plus,
  Edit2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Camera,
  Save,
  X,
  CheckCircle,
  Thermometer,
  Trash2
} from 'lucide-react';
import { Termografia, LineaSubtransmision, Usuario, Estructura, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface TermografiaViewProps {
  termografia: Termografia[];
  lineas: LineaSubtransmision[];
  estructuras?: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const TermografiaView: React.FC<TermografiaViewProps> = ({
  termografia,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriticidad, setFilterCriticidad] = useState('TODAS');
  const [filterPrioridad, setFilterPrioridad] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Termografia> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Termografia | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storageService.deleteTermografia(deleteTarget.id_termografia);
    showNotification('success', `Inspección térmica ${deleteTarget.id_termografia} marcada como Eliminado (borrado lógico).`);
    setDeleteTarget(null);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportTermografia(filteredList);
    showNotification('success', `Exportadas ${filteredList.length} inspecciones a Inspecciones_Termograficas.xlsx.`);
  };

  const filteredList = useMemo(() => {
    return termografia.filter(t => {
      const matchLine = selectedLine === 'TODAS' || t.cod_linea === selectedLine;
      const matchSearch =
        t.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.componente_falla.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.comentario.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCrit = filterCriticidad === 'TODAS' || t.criticidad === filterCriticidad;
      const matchPrio = filterPrioridad === 'TODAS' || t.prioridad === filterPrioridad;
      return matchLine && matchSearch && matchCrit && matchPrio;
    });
  }, [termografia, selectedLine, searchTerm, filterCriticidad, filterPrioridad]);

  // Dynamic list of postes for current line in modal
  const availablePostesForForm = useMemo(() => {
    return getPostesForLine(estructuras, editingItem?.cod_linea);
  }, [estructuras, editingItem?.cod_linea]);

  const handleStartNew = () => {
    const targetLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const initialPostes = getPostesForLine(estructuras, targetLine);
    const firstPoste = initialPostes[0] || '';
    const st = getStructureDetails(estructuras, targetLine, firstPoste);

    setEditingItem({
      cod_linea: targetLine,
      poste_n: firstPoste,
      tipo_armado: st?.tipo_armado || 'AD',
      conductor_calibre: st?.conductor_calibre ? `${st.conductor_material || 'AAAC'} ${st.conductor_calibre}` : 'AAAC 240',
      conductor_n_fases: st?.conductor_n_fases || '3',
      nivel_tension: '60 kV',
      tipo_zona: 'Costa - Salina',
      temp_ambiente: 28.0,
      temp_max_componente: 35.0,
      emisividad: 0.95,
      delta_t: 7.0,
      hora: '11:00',
      fecha: new Date().toISOString().split('T')[0],
      componente_falla: 'Grapa de suspensión',
      comentario: 'Inspección termográfica preventiva rutinaria.',
      criticidad: 'Normal',
      prioridad: 'NO PRIORITARIO',
      evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      inspector: `${currentUser.nombres} ${currentUser.apellidos}`
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (item: Termografia) => {
    setEditingItem({
      ...item,
      prioridad: item.prioridad || (item.criticidad === 'Emergencia' || item.criticidad === 'Alerta' ? 'PRIORITARIO' : 'NO PRIORITARIO')
    });
    setIsNew(false);
    setIsEditing(true);
  };

  const calculateDeltaT = (tempMax: number, tempAmb: number) => {
    return Math.round((tempMax - tempAmb) * 10) / 10;
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'Línea y poste son obligatorios.');
      return;
    }

    const tAmb = Number(editingItem.temp_ambiente) || 25;
    const tMax = Number(editingItem.temp_max_componente) || 25;
    const deltaT = calculateDeltaT(tMax, tAmb);

    let crit: 'Normal' | 'Alerta' | 'Emergencia' = 'Normal';
    if (deltaT > 35) crit = 'Emergencia';
    else if (deltaT > 10) crit = 'Alerta';

    const prio: Prioridad = (editingItem.prioridad as Prioridad) || (crit === 'Emergencia' || crit === 'Alerta' ? 'PRIORITARIO' : 'NO PRIORITARIO');

    if (isNew) {
      storageService.addTermografia({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        tipo_armado: editingItem.tipo_armado || 'A',
        conductor_calibre: editingItem.conductor_calibre || 'AAAC 240',
        conductor_n_fases: editingItem.conductor_n_fases || '3',
        nivel_tension: editingItem.nivel_tension || '60 kV',
        tipo_zona: editingItem.tipo_zona || 'Normal',
        temp_ambiente: tAmb,
        temp_max_componente: tMax,
        emisividad: Number(editingItem.emisividad) || 0.95,
        delta_t: deltaT,
        hora: editingItem.hora || '12:00',
        fecha: editingItem.fecha || new Date().toISOString().split('T')[0],
        componente_falla: editingItem.componente_falla || '',
        comentario: editingItem.comentario || '',
        criticidad: crit,
        prioridad: prio,
        evidencia_url: editingItem.evidencia_url || '',
        inspector: editingItem.inspector || currentUser.nombres
      });
      showNotification('success', 'Inspección termográfica registrada.');
    } else {
      storageService.updateTermografia(editingItem.id_termografia!, {
        ...editingItem,
        temp_ambiente: tAmb,
        temp_max_componente: tMax,
        delta_t: deltaT,
        criticidad: crit,
        prioridad: prio
      });
      showNotification('success', 'Registro termográfico actualizado.');
    }

    setIsEditing(false);
    setEditingItem(null);
    onRefresh();
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
              <Flame className="h-5 w-5 text-orange-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Inspecciones Termográficas (Infrarrojo)</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-800">
                {filteredList.length} mediciones
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Detección de puntos calientes, sobrecalentamiento en grapas, puentes, seccionadores y conectores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Medición Térmica</span>
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

        <DriveModuleToolbar moduleKey="TERMOGRAFIA" onDataImported={onRefresh} />
      </div>

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
            <span>Criticidad:</span>
            <select
              value={filterCriticidad}
              onChange={(e) => setFilterCriticidad(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Alerta">Alerta</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Prioridad:</span>
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value as any)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 font-bold"
            >
              <option value="TODAS">Todas</option>
              <option value="PRIORITARIO">PRIORITARIO</option>
              <option value="NO PRIORITARIO">NO PRIORITARIO</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por poste, componente..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-orange-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Edit / New Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-orange-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-400" />
                {isNew ? 'Registrar Inspección Termográfica' : `Editar Medición: ${editingItem.cod_linea} P-${editingItem.poste_n}`}
              </h2>
              <p className="text-xs text-slate-400">
                El gradiente térmico (Delta T) y el nivel de criticidad se calculan automáticamente.
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
                  const firstP = newPostes[0] || '';
                  const st = getStructureDetails(estructuras, newCod, firstP);
                  setEditingItem(prev => ({
                    ...prev,
                    cod_linea: newCod,
                    poste_n: firstP,
                    tipo_armado: st?.tipo_armado || prev?.tipo_armado || '',
                    conductor_calibre: st?.conductor_calibre ? `${st.conductor_material || 'AAAC'} ${st.conductor_calibre}` : (prev?.conductor_calibre || '')
                  }));
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
                {availablePostesForForm.length > 0 && (
                  <span className="text-[10px] text-cyan-400 ml-1 font-normal font-sans">
                    ({availablePostesForForm.length} en plantilla)
                  </span>
                )}
              </label>
              <select
                value={editingItem.poste_n || ''}
                onChange={(e) => {
                  const selectedP = e.target.value;
                  const st = getStructureDetails(estructuras, editingItem.cod_linea, selectedP);
                  setEditingItem(prev => ({
                    ...prev,
                    poste_n: selectedP,
                    ...(st?.tipo_armado ? { tipo_armado: st.tipo_armado } : {}),
                    ...(st?.conductor_calibre ? { conductor_calibre: `${st.conductor_material || 'AAAC'} ${st.conductor_calibre}` } : {})
                  }));
                }}
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
              <label className="block font-semibold text-slate-300 mb-1">TIPO DE ZONA</label>
              <input
                type="text"
                value={editingItem.tipo_zona || ''}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_zona: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Costa - Salina, Rural, Urbana"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NIVEL DE TENSIÓN</label>
              <input
                type="text"
                value={editingItem.nivel_tension || '60 kV'}
                onChange={(e) => setEditingItem({ ...editingItem, nivel_tension: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TEMP. AMBIENTE (°C)</label>
              <input
                type="number"
                step="0.1"
                value={editingItem.temp_ambiente ?? 25}
                onChange={(e) => setEditingItem({ ...editingItem, temp_ambiente: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TEMP. MÁX. COMPONENTE (°C)</label>
              <input
                type="number"
                step="0.1"
                value={editingItem.temp_max_componente ?? 25}
                onChange={(e) => setEditingItem({ ...editingItem, temp_max_componente: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-orange-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">EMISIVIDAD</label>
              <input
                type="number"
                step="0.01"
                value={editingItem.emisividad ?? 0.95}
                onChange={(e) => setEditingItem({ ...editingItem, emisividad: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">COMPONENTE DE FALLA</label>
              <input
                type="text"
                value={editingItem.componente_falla || ''}
                onChange={(e) => setEditingItem({ ...editingItem, componente_falla: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Grapa de suspensión, Conector bimetálico"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">TERMOGRAMA / EVIDENCIA URL</label>
              <input
                type="text"
                value={editingItem.evidencia_url || ''}
                onChange={(e) => setEditingItem({ ...editingItem, evidencia_url: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="https://drive.google.com/... o enlace de termograma"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">
                PRIORIDAD <span className="text-red-400">*</span>
              </label>
              <select
                value={editingItem.prioridad || 'NO PRIORITARIO'}
                onChange={(e) => setEditingItem({ ...editingItem, prioridad: e.target.value as Prioridad })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="PRIORITARIO">PRIORITARIO</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">FECHA & HORA</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={editingItem.fecha || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, fecha: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="time"
                  value={editingItem.hora || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, hora: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1">COMENTARIOS TÉCNICOS</label>
              <textarea
                value={editingItem.comentario || ''}
                onChange={(e) => setEditingItem({ ...editingItem, comentario: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Análisis de sobrecalentamiento, recomendación de apriete con torquímetro..."
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Termografía</span>
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
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-3 py-3">ZONA</th>
                <th className="px-3 py-3">T. AMB (°C)</th>
                <th className="px-3 py-3 text-orange-300">T. MÁX (°C)</th>
                <th className="px-3 py-3 text-red-300">ΔT (°C)</th>
                <th className="px-3 py-3">CRITICIDAD</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-4 py-3">COMPONENTE / COMENTARIOS</th>
                <th className="px-2 py-3">FOTO</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-500">
                    No se encontraron mediciones termográficas.
                  </td>
                </tr>
              ) : (
                filteredList.map((t, idx) => (
                  <tr key={`${t.id_termografia}-${idx}`} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{t.id_termografia}</td>
                    <td className="px-3 py-2.5 font-mono text-white">{t.cod_linea}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-white">{t.poste_n}</td>
                    <td className="px-3 py-2.5 text-slate-400">{t.tipo_zona}</td>
                    <td className="px-3 py-2.5 font-mono">{t.temp_ambiente}°C</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-orange-300">{t.temp_max_componente}°C</td>
                    <td className="px-3 py-2.5 font-mono font-extrabold text-red-400">+{t.delta_t}°C</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.criticidad === 'Emergencia'
                          ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                          : t.criticidad === 'Alerta'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}>
                        {t.criticidad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t.prioridad === 'PRIORITARIO'
                          ? 'bg-red-950 text-red-300 border-red-700 font-extrabold'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {t.prioridad || 'NO PRIORITARIO'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="font-semibold text-slate-200">{t.componente_falla}</div>
                      <div className="text-[11px] text-slate-400 truncate">{t.comentario}</div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {t.evidencia_url && (
                        <button
                          onClick={() => onOpenPhoto && onOpenPhoto(t.evidencia_url, `Termograma ${t.cod_linea} P-${t.poste_n}`)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-orange-300"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer"
                          title="Editar inspección térmica"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {currentUser.rol !== 'Contratista' && (
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/70 text-red-400 transition cursor-pointer"
                            title="Eliminar termografía (borrado lógico)"
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
                  La inspección quedará marcada como <strong className="text-rose-300">Eliminado</strong> en auditoría y se sincronizará con Google Drive.
                </p>
              </div>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="font-mono font-bold text-cyan-300">{deleteTarget.id_termografia}</div>
              <div className="text-slate-300">Línea {deleteTarget.cod_linea} • Poste {deleteTarget.poste_n}</div>
              <div className="text-orange-300">{deleteTarget.componente_falla} (ΔT +{deleteTarget.delta_t}°C)</div>
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
