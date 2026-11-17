import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Edit2,
  Search,
  FileSpreadsheet,
  Download,
  Camera,
  Save,
  X,
  CheckCircle,
  Trees,
  UserCheck,
  Trash2
} from 'lucide-react';
import { Poda, LineaSubtransmision, Usuario, Estructura, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface PodasViewProps {
  podas: Poda[];
  lineas: LineaSubtransmision[];
  estructuras?: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const PodasView: React.FC<PodasViewProps> = ({
  podas,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Poda> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Poda | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storageService.deletePoda(deleteTarget.id_poda);
    showNotification('success', `Actividad de poda ${deleteTarget.id_poda} marcada como Eliminado (borrado lógico).`);
    setDeleteTarget(null);
    onRefresh();
  };

  const filteredList = useMemo(() => {
    return podas.filter(p => {
      const matchLine = selectedLine === 'TODAS' || p.cod_linea === selectedLine;
      const matchSearch =
        p.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ubicacion_referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.contratista_responsable || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchEstado = filterEstado === 'TODOS' || p.estado === filterEstado;
      const matchPrio = filterPrioridad === 'TODAS' || p.prioridad === filterPrioridad;
      return matchLine && matchSearch && matchEstado && matchPrio;
    });
  }, [podas, selectedLine, searchTerm, filterEstado, filterPrioridad]);

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
      tipo_armado: st?.tipo_armado || 'A',
      tipo_aislador: st?.aislador_material || 'polimérico',
      nivel_tension_kv: '60',
      fecha_ejecucion: new Date().toISOString().split('T')[0],
      ubicacion_referencia: '',
      punto_inicial: '',
      punto_final: '',
      algarrobo: 0,
      palmera: 0,
      ornamental: 0,
      tamarindo: 0,
      ponceana: 0,
      otros: 0,
      observaciones: '',
      prioridad: 'NO PRIORITARIO',
      fotografias: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'],
      contratista_responsable: currentUser.rol === 'Contratista' ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Consorcio Eléctrico del Norte',
      estado: 'Programada'
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (item: Poda) => {
    setEditingItem({
      ...item,
      prioridad: item.prioridad || 'NO PRIORITARIO'
    });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'Línea y estructura son requeridos.');
      return;
    }

    const prio: Prioridad = (editingItem.prioridad as Prioridad) || 'NO PRIORITARIO';

    if (isNew) {
      storageService.addPoda({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        tipo_armado: editingItem.tipo_armado || 'A',
        tipo_aislador: editingItem.tipo_aislador || 'polimérico',
        nivel_tension_kv: editingItem.nivel_tension_kv || '60',
        fecha_ejecucion: editingItem.fecha_ejecucion || new Date().toISOString().split('T')[0],
        ubicacion_referencia: editingItem.ubicacion_referencia || '',
        punto_inicial: editingItem.punto_inicial || '',
        punto_final: editingItem.punto_final || '',
        algarrobo: Math.floor(Number(editingItem.algarrobo)) || 0,
        palmera: Math.floor(Number(editingItem.palmera)) || 0,
        ornamental: Math.floor(Number(editingItem.ornamental)) || 0,
        tamarindo: Math.floor(Number(editingItem.tamarindo)) || 0,
        ponceana: Math.floor(Number(editingItem.ponceana)) || 0,
        otros: Math.floor(Number(editingItem.otros)) || 0,
        observaciones: editingItem.observaciones || '',
        prioridad: prio,
        fotografias: editingItem.fotografias || [],
        contratista_responsable: editingItem.contratista_responsable || '',
        estado: (editingItem.estado as any) || 'Completada'
      });
      showNotification('success', 'Actividad de poda registrada exitosamente.');
    } else {
      storageService.updatePoda(editingItem.id_poda!, {
        ...editingItem,
        algarrobo: Math.floor(Number(editingItem.algarrobo)) || 0,
        palmera: Math.floor(Number(editingItem.palmera)) || 0,
        ornamental: Math.floor(Number(editingItem.ornamental)) || 0,
        tamarindo: Math.floor(Number(editingItem.tamarindo)) || 0,
        ponceana: Math.floor(Number(editingItem.ponceana)) || 0,
        otros: Math.floor(Number(editingItem.otros)) || 0,
        prioridad: prio
      });
      showNotification('success', 'Registro de poda actualizado.');
    }

    setIsEditing(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportPodas(filteredList);
    showNotification('success', `Exportadas ${filteredList.length} actividades de poda a Registro_Podas.xlsx.`);
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
              <Scissors className="h-5 w-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Registro y Control de Actividades de Poda</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {filteredList.length} actividades
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Conteo exacto por especie (Algarrobo, Palmera, Ornamental, Tamarindo, Ponceana, Otros) y franja de servidumbre.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Poda</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>
          </div>
        </div>

        <DriveModuleToolbar moduleKey="CONTROL_PODAS" onDataImported={onRefresh} />
      </div>

      {/* Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-emerald-400" />
                {isNew ? 'Registrar Nueva Actividad de Poda' : `Editar Poda: ${editingItem.id_poda}`}
              </h2>
              <p className="text-xs text-slate-400">
                Ingrese cantidades de árboles por especie tipo entero según los requerimientos técnicos.
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
                    tipo_aislador: st?.aislador_material || prev?.tipo_aislador || ''
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
                    ...(st?.aislador_material ? { tipo_aislador: st.aislador_material } : {})
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
              <label className="block font-semibold text-slate-300 mb-1">FECHA DE EJECUCIÓN</label>
              <input
                type="date"
                value={editingItem.fecha_ejecucion || ''}
                onChange={(e) => setEditingItem({ ...editingItem, fecha_ejecucion: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">UBICACIÓN / REFERENCIA</label>
              <input
                type="text"
                value={editingItem.ubicacion_referencia || ''}
                onChange={(e) => setEditingItem({ ...editingItem, ubicacion_referencia: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ej: Km 15 Carretera Piura - Chulucanas"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PUNTO INICIAL (Suministro)</label>
              <input
                type="text"
                value={editingItem.punto_inicial || ''}
                onChange={(e) => setEditingItem({ ...editingItem, punto_inicial: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Sum. 45091"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PUNTO FINAL (Suministro)</label>
              <input
                type="text"
                value={editingItem.punto_final || ''}
                onChange={(e) => setEditingItem({ ...editingItem, punto_final: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Sum. 45110"
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
                value={editingItem.estado || 'Completada'}
                onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Programada">Programada</option>
                <option value="En Ejecución">En Ejecución</option>
                <option value="Completada">Completada</option>
                <option value="Verificada">Verificada</option>
              </select>
            </div>

            <div>
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

            {/* Species Count Section */}
            <div className="lg:col-span-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-emerald-300 block mb-3">
                CANTIDAD DE ÁRBOLES INTERVENIDOS POR ESPECIE (Tipo Entero):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">ALGARROBO</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.algarrobo ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, algarrobo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">PALMERA</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.palmera ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, palmera: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">ORNAMENTAL</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.ornamental ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, ornamental: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">TAMARINDO</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.tamarindo ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, tamarindo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">PONCEANA</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.ponceana ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, ponceana: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">OTROS</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingItem.otros ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, otros: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="mt-2 text-right text-xs font-semibold text-emerald-400">
                Total Calculado: {
                  (Number(editingItem.algarrobo) || 0) +
                  (Number(editingItem.palmera) || 0) +
                  (Number(editingItem.ornamental) || 0) +
                  (Number(editingItem.tamarindo) || 0) +
                  (Number(editingItem.ponceana) || 0) +
                  (Number(editingItem.otros) || 0)
                } árboles
              </div>
            </div>

            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES</label>
              <textarea
                value={editingItem.observaciones || ''}
                onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Metros de distancia libre conseguidos, despeje de vano..."
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Actividad de Poda</span>
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
            <span>Estado:</span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODOS">Todos</option>
              <option value="Programada">Programada</option>
              <option value="En Ejecución">En Ejecución</option>
              <option value="Completada">Completada</option>
              <option value="Verificada">Verificada</option>
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
            placeholder="Buscar por poste, referencia, contratista..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
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
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-3 py-3">FECHA</th>
                <th className="px-3 py-3">REFERENCIA / SUMINISTROS</th>
                <th className="px-2 py-3 text-center">ALG</th>
                <th className="px-2 py-3 text-center">PAL</th>
                <th className="px-2 py-3 text-center">ORN</th>
                <th className="px-2 py-3 text-center">TAM</th>
                <th className="px-2 py-3 text-center">PON</th>
                <th className="px-2 py-3 text-center">OTR</th>
                <th className="px-3 py-3 text-emerald-300 font-bold text-center">TOTAL</th>
                <th className="px-3 py-3">CONTRATISTA</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-10 text-slate-500">
                    No se encontraron actividades de poda registradas.
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => (
                  <tr key={p.id_poda} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{p.cod_linea}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-white">{p.poste_n}</td>
                    <td className="px-3 py-2.5 text-slate-400">{p.fecha_ejecucion}</td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <div className="text-slate-200 truncate">{p.ubicacion_referencia || 'En vano'}</div>
                      {(p.punto_inicial || p.punto_final) && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.punto_inicial} &rarr; {p.punto_final}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.algarrobo}</td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.palmera}</td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.ornamental}</td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.tamarindo}</td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.ponceana}</td>
                    <td className="px-2 py-2.5 text-center font-mono">{p.otros}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-400 font-mono text-sm">
                      {p.total_arboles}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 truncate max-w-[120px]">{p.contratista_responsable}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.prioridad === 'PRIORITARIO'
                          ? 'bg-red-950 text-red-300 border-red-700 font-extrabold'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {p.prioridad || 'NO PRIORITARIO'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer"
                          title="Editar actividad de poda"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {currentUser.rol !== 'Contratista' && (
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/70 text-red-400 transition cursor-pointer"
                            title="Eliminar poda (borrado lógico)"
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
              <div className="font-mono font-bold text-cyan-300">{deleteTarget.id_poda}</div>
              <div className="text-slate-300">Línea {deleteTarget.cod_linea} • Poste {deleteTarget.poste_n}</div>
              <div className="text-emerald-300">Total árboles: {deleteTarget.total_arboles}</div>
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
