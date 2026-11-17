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
  Thermometer
} from 'lucide-react';
import { Termografia, LineaSubtransmision, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';

interface TermografiaViewProps {
  termografia: Termografia[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const TermografiaView: React.FC<TermografiaViewProps> = ({
  termografia,
  lineas,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriticidad, setFilterCriticidad] = useState('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Termografia> | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
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
      return matchLine && matchSearch && matchCrit;
    });
  }, [termografia, selectedLine, searchTerm, filterCriticidad]);

  const handleStartNew = () => {
    const targetLine = selectedLine === 'TODAS' ? 'L-6657C' : selectedLine;
    setEditingItem({
      cod_linea: targetLine,
      poste_n: '1',
      tipo_armado: 'AD',
      conductor_calibre: 'AAAC 240',
      conductor_n_fases: '3',
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
      evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      inspector: `${currentUser.nombres} ${currentUser.apellidos}`
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (item: Termografia) => {
    setEditingItem({ ...item });
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
        criticidad: crit
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
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              />
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
                <th className="px-4 py-3">COMPONENTE / COMENTARIOS</th>
                <th className="px-2 py-3">FOTO</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se encontraron mediciones termográficas.
                  </td>
                </tr>
              ) : (
                filteredList.map((t) => (
                  <tr key={t.id_termografia} className="hover:bg-slate-750/70 transition">
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
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
