import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Plus,
  Edit2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Camera,
  ExternalLink,
  Save,
  X,
  CheckCircle,
  Eye,
  Sliders
} from 'lucide-react';
import { EfectoCorona, LineaSubtransmision, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';

interface CoronaViewProps {
  corona: EfectoCorona[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const CoronaView: React.FC<CoronaViewProps> = ({
  corona,
  lineas,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  // Edit / New Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<EfectoCorona> | null>(null);

  // Situaciones catalog
  const catalogSituaciones = storageService.getSituacionesCorona();
  const [newSituacionInput, setNewSituacionInput] = useState('');

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter list
  const filteredList = useMemo(() => {
    return corona.filter(item => {
      const matchLine = selectedLine === 'TODAS' || item.cod_linea === selectedLine;
      const matchSearch =
        item.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipo_aislador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.comentarios || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.situaciones || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      const maxPhotons = Math.max(item.fase_r_conteo, item.fase_s_conteo, item.fase_t_conteo);
      const isAlerta = maxPhotons > 100;
      const matchRiesgo =
        filterRiesgo === 'TODOS' ||
        (filterRiesgo === 'ALERTA' && isAlerta) ||
        (filterRiesgo === 'NORMAL' && !isAlerta);

      return matchLine && matchSearch && matchRiesgo;
    });
  }, [corona, selectedLine, searchTerm, filterRiesgo]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleStartNew = () => {
    const lineTarget = selectedLine === 'TODAS' ? 'L-6657C' : selectedLine;
    setEditingItem({
      cod_linea: lineTarget,
      poste_n: '1',
      tipo_armado: 'A',
      tipo_aislador: 'polimérico',
      nivel_tension_kv: '60',
      temp_c: '28',
      humedad_pct: '70',
      fase_r_ganancia: '100',
      fase_r_conteo: 25,
      fase_s_ganancia: '100',
      fase_s_conteo: 30,
      fase_t_ganancia: '100',
      fase_t_conteo: 28,
      fecha: new Date().toLocaleDateString('es-PE'),
      hora: '10:30',
      comentarios: 'Medición UV completada sin observaciones críticas.',
      situaciones: ['Operación normal'],
      evidencia_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
      inspector: `${currentUser.nombres} ${currentUser.apellidos}`
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (item: EfectoCorona) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleToggleSituacion = (sit: string) => {
    if (!editingItem) return;
    const current = editingItem.situaciones || [];
    const exists = current.includes(sit);
    const updated = exists ? current.filter(s => s !== sit) : [...current, sit];
    setEditingItem({ ...editingItem, situaciones: updated });
  };

  const handleAddCustomSituacion = () => {
    if (!newSituacionInput.trim()) return;
    storageService.addSituacionCorona(newSituacionInput.trim());
    handleToggleSituacion(newSituacionInput.trim());
    setNewSituacionInput('');
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'Línea y POSTE_N son obligatorios.');
      return;
    }

    if (!editingItem.evidencia_url) {
      showNotification('error', 'La evidencia fotográfica / reporte UV es obligatoria según la especificación.');
      return;
    }

    if (isNew) {
      storageService.addCorona({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        tipo_armado: editingItem.tipo_armado || 'A',
        tipo_aislador: editingItem.tipo_aislador || 'polimérico',
        nivel_tension_kv: editingItem.nivel_tension_kv || '60',
        temp_c: editingItem.temp_c || '28',
        humedad_pct: editingItem.humedad_pct || '70',
        fase_r_ganancia: editingItem.fase_r_ganancia || '100',
        fase_r_conteo: Number(editingItem.fase_r_conteo) || 0,
        fase_s_ganancia: editingItem.fase_s_ganancia || '100',
        fase_s_conteo: Number(editingItem.fase_s_conteo) || 0,
        fase_t_ganancia: editingItem.fase_t_ganancia || '100',
        fase_t_conteo: Number(editingItem.fase_t_conteo) || 0,
        fecha: editingItem.fecha || '',
        hora: editingItem.hora || '',
        comentarios: editingItem.comentarios || '',
        situaciones: editingItem.situaciones || ['Operación normal'],
        evidencia_url: editingItem.evidencia_url || '',
        inspector: editingItem.inspector || `${currentUser.nombres} ${currentUser.apellidos}`
      });
      showNotification('success', 'Inspección de Efecto Corona registrada con éxito.');
    } else {
      storageService.updateCorona(editingItem.id_corona!, editingItem);
      showNotification('success', 'Registro de Efecto Corona actualizado.');
    }

    setIsEditing(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportCorona(filteredList);
    showNotification('success', `Exportados ${filteredList.length} registros a Registro_Efecto_Corona.xlsx.`);
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
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
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Inspección de Efecto Corona (Cámara UV)</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
              {filteredList.length} mediciones
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conteo de fotones/minuto por fases R, S, T, calibración del lente y catálogo de situaciones operativas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Medición Corona</span>
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

      {/* Edit / New Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                {isNew ? 'Registrar Inspección de Efecto Corona' : `Editar Medición: ${editingItem.cod_linea} P-${editingItem.poste_n}`}
              </h2>
              <p className="text-xs text-slate-400">
                Ingrese las lecturas fotónicas y seleccione las situaciones operativas detectadas.
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
                onChange={(e) => setEditingItem({ ...editingItem, cod_linea: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
              >
                {lineas.map(l => (
                  <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">POSTE N° <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingItem.poste_n || ''}
                onChange={(e) => setEditingItem({ ...editingItem, poste_n: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                placeholder="Ej: 1, 14, 28"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TIPO DE ARMADO</label>
              <input
                type="text"
                value={editingItem.tipo_armado || ''}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_armado: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="A, AD, CD"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TIPO DE AISLADOR</label>
              <input
                type="text"
                value={editingItem.tipo_aislador || ''}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_aislador: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="polimérico, porcelana"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NIVEL TENSIÓN (kV)</label>
              <input
                type="text"
                value={editingItem.nivel_tension_kv || '60'}
                onChange={(e) => setEditingItem({ ...editingItem, nivel_tension_kv: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TEMPERATURA AMBIENTE (°C)</label>
              <input
                type="text"
                value={editingItem.temp_c || ''}
                onChange={(e) => setEditingItem({ ...editingItem, temp_c: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="28"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">HUMEDAD RELATIVA (%)</label>
              <input
                type="text"
                value={editingItem.humedad_pct || ''}
                onChange={(e) => setEditingItem({ ...editingItem, humedad_pct: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="75"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">FECHA & HORA</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editingItem.fecha || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, fecha: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white"
                  placeholder="DD/MM/AAAA"
                />
                <input
                  type="text"
                  value={editingItem.hora || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, hora: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white"
                  placeholder="HH:mm"
                />
              </div>
            </div>

            {/* FASE R */}
            <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3">
              <span className="text-[11px] font-bold text-red-300 uppercase block mb-1">FASE R</span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-slate-400">Ganancia Lente</label>
                  <input
                    type="text"
                    value={editingItem.fase_r_ganancia || '100'}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_r_ganancia: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Conteo (Fotón/Min)</label>
                  <input
                    type="number"
                    value={editingItem.fase_r_conteo ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_r_conteo: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-red-300 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* FASE S */}
            <div className="bg-blue-950/40 border border-blue-900/60 rounded-xl p-3">
              <span className="text-[11px] font-bold text-blue-300 uppercase block mb-1">FASE S</span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-slate-400">Ganancia Lente</label>
                  <input
                    type="text"
                    value={editingItem.fase_s_ganancia || '100'}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_s_ganancia: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Conteo (Fotón/Min)</label>
                  <input
                    type="number"
                    value={editingItem.fase_s_conteo ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_s_conteo: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-blue-300 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* FASE T */}
            <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-3">
              <span className="text-[11px] font-bold text-emerald-300 uppercase block mb-1">FASE T</span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-slate-400">Ganancia Lente</label>
                  <input
                    type="text"
                    value={editingItem.fase_t_ganancia || '100'}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_t_ganancia: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Conteo (Fotón/Min)</label>
                  <input
                    type="number"
                    value={editingItem.fase_t_conteo ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, fase_t_conteo: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Evidencia Fotográfica Obligatoria */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                EVIDENCIA FOTOGRÁFICA UV <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingItem.evidencia_url || ''}
                onChange={(e) => setEditingItem({ ...editingItem, evidencia_url: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs mb-1"
                placeholder="https://drive.google.com/... o enlace de foto"
              />
              <span className="text-[10px] text-slate-400">Obligatorio por norma técnica.</span>
            </div>

            {/* Situaciones Multiseleccion */}
            <div className="lg:col-span-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <label className="block text-xs font-bold text-slate-200 mb-2">
                SITUACIONES DETECTADAS (Catálogo editable con multiselección):
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {catalogSituaciones.map(sit => {
                  const isChecked = (editingItem.situaciones || []).includes(sit);
                  return (
                    <button
                      type="button"
                      key={sit}
                      onClick={() => handleToggleSituacion(sit)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        isChecked
                          ? 'bg-purple-900 text-purple-200 border-purple-600 shadow'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '} {sit}
                    </button>
                  );
                })}
              </div>

              {/* Add custom situacion to catalog */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={newSituacionInput}
                  onChange={(e) => setNewSituacionInput(e.target.value)}
                  placeholder="Agregar nueva situación al catálogo..."
                  className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSituacion}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1">COMENTARIOS / CONCLUSIÓN TÉCNICA</label>
              <textarea
                value={editingItem.comentarios || ''}
                onChange={(e) => setEditingItem({ ...editingItem, comentarios: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                placeholder="Los valores de Fot/Min obtenidos indican..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Registro UV</span>
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
              onChange={(e) => { onSelectLine(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas las Líneas ({corona.length})</option>
              {lineas.map(l => (
                <option key={l.cod_linea} value={l.cod_linea}>{l.cod_linea}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Nivel de Descarga:</span>
            <select
              value={filterRiesgo}
              onChange={(e) => { setFilterRiesgo(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODOS">Todos los niveles</option>
              <option value="ALERTA">⚠️ Alerta (&gt; 100 fot/min)</option>
              <option value="NORMAL">✓ Normal (≤ 100 fot/min)</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por poste, comentario, situación..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Corona Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-2 py-3">ARMADO</th>
                <th className="px-3 py-3">AISLADOR</th>
                <th className="px-3 py-3 text-red-300">FASE R (Fot/min)</th>
                <th className="px-3 py-3 text-blue-300">FASE S (Fot/min)</th>
                <th className="px-3 py-3 text-emerald-300">FASE T (Fot/min)</th>
                <th className="px-3 py-3">FECHA / HORA</th>
                <th className="px-4 py-3">DIAGNÓSTICO / SITUACIÓN</th>
                <th className="px-2 py-3">EVIDENCIA</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se encontraron mediciones de Efecto Corona.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const maxPhotons = Math.max(item.fase_r_conteo, item.fase_s_conteo, item.fase_t_conteo);
                  const isHigh = maxPhotons > 100;
                  return (
                    <tr key={item.id_corona} className={`hover:bg-slate-750/70 transition ${isHigh ? 'bg-amber-950/20' : ''}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-cyan-300">{item.cod_linea}</td>
                      <td className="px-3 py-2.5 font-mono font-extrabold text-white">{item.poste_n}</td>
                      <td className="px-2 py-2.5 font-mono text-[10px] text-slate-400">{item.tipo_armado}</td>
                      <td className="px-3 py-2.5 capitalize">{item.tipo_aislador}</td>
                      <td className="px-3 py-2.5 font-mono font-bold">
                        <span className={item.fase_r_conteo > 100 ? 'text-amber-400 font-extrabold bg-red-950/80 px-1.5 py-0.5 rounded' : 'text-slate-300'}>
                          {item.fase_r_conteo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold">
                        <span className={item.fase_s_conteo > 100 ? 'text-amber-400 font-extrabold bg-blue-950/80 px-1.5 py-0.5 rounded' : 'text-slate-300'}>
                          {item.fase_s_conteo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold">
                        <span className={item.fase_t_conteo > 100 ? 'text-amber-400 font-extrabold bg-emerald-950/80 px-1.5 py-0.5 rounded' : 'text-slate-300'}>
                          {item.fase_t_conteo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-400">
                        {item.fecha} {item.hora}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="truncate text-slate-200" title={item.comentarios}>
                          {item.comentarios}
                        </div>
                        {item.situaciones && item.situaciones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.situaciones.map(s => (
                              <span key={s} className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {item.evidencia_url ? (
                          <button
                            onClick={() => onOpenPhoto && onOpenPhoto(item.evidencia_url, `Corona UV ${item.cod_linea} P-${item.poste_n}`)}
                            className="p-1 rounded bg-slate-700/80 hover:bg-slate-700 text-purple-300"
                            title="Ver evidencia"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                          title="Editar medición"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({filteredList.length} inspecciones)
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
