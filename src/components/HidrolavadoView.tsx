import React, { useMemo, useState } from 'react';
import {
  Droplets,
  Plus,
  Edit2,
  Trash2,
  Search,
  FileSpreadsheet,
  Camera,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Waves
} from 'lucide-react';
import { Hidrolavado, LineaSubtransmision, Usuario, Estructura, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface HidrolavadoViewProps {
  hidrolavado: Hidrolavado[];
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const HidrolavadoView: React.FC<HidrolavadoViewProps> = ({
  hidrolavado,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('TODOS');
  const [filterContaminacion, setFilterContaminacion] = useState('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Hidrolavado> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hidrolavado | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredList = useMemo(() => {
    return hidrolavado.filter(h => {
      const matchLine = selectedLine === 'TODAS' || h.cod_linea === selectedLine;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        h.poste_n.toLowerCase().includes(q) ||
        h.cod_linea.toLowerCase().includes(q) ||
        (h.orden_mantenimiento || '').toLowerCase().includes(q) ||
        (h.contratista_responsable || '').toLowerCase().includes(q) ||
        (h.observaciones || '').toLowerCase().includes(q);
      const matchMetodo = filterMetodo === 'TODOS' || h.metodo_lavado === filterMetodo;
      const matchContam = filterContaminacion === 'TODOS' || h.nivel_contaminacion === filterContaminacion;
      const matchPrio = filterPrioridad === 'TODAS' || h.prioridad === filterPrioridad;
      return matchLine && matchSearch && matchMetodo && matchContam && matchPrio;
    });
  }, [hidrolavado, selectedLine, searchTerm, filterMetodo, filterContaminacion, filterPrioridad]);

  const kpis = useMemo(() => {
    const total = filteredList.length;
    const enCaliente = filteredList.filter(h => h.metodo_lavado.includes('Caliente')).length;
    const litrosTotales = filteredList.reduce((acc, h) => acc + (Number(h.agua_utilizada_litros) || 0), 0);
    const criticosSalinos = filteredList.filter(h => h.nivel_contaminacion === 'Crítico (Salino)' || h.prioridad === 'PRIORITARIO').length;
    return { total, enCaliente, litrosTotales, criticosSalinos };
  }, [filteredList]);

  const availablePostesForForm = useMemo(() => {
    return getPostesForLine(estructuras, editingItem?.cod_linea);
  }, [estructuras, editingItem?.cod_linea]);

  const getLineVoltage = (codLinea: string) => {
    const found = lineas.find(l => l.cod_linea === codLinea);
    return found ? String(found.tension_nom).replace(/kv/i, '').trim() : '60';
  };

  const handleStartNew = () => {
    const targetLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const initialPostes = getPostesForLine(estructuras, targetLine);
    const firstPoste = initialPostes[0] || '';
    const details = firstPoste ? getStructureDetails(estructuras, targetLine, firstPoste) : null;

    setEditingItem({
      cod_linea: targetLine,
      poste_n: firstPoste,
      tipo_armado: details?.tipo_armado || 'A',
      tipo_aislador: details?.aislador_material || 'Polimérico',
      nivel_tension_kv: getLineVoltage(targetLine),
      fecha_ejecucion: new Date().toISOString().split('T')[0],
      metodo_lavado: 'En Caliente (Línea Energizada)',
      agua_utilizada_litros: 200,
      conductividad_agua_us: 18,
      presion_psi: 650,
      nivel_contaminacion: 'Alto',
      prioridad: 'PRIORITARIO',
      estado: 'Completado',
      contratista_responsable:
        currentUser.rol === 'Contratista'
          ? `${currentUser.nombres} ${currentUser.apellidos}`
          : 'Consorcio Eléctrico del Norte S.A.C.',
      orden_mantenimiento: '',
      observaciones: '',
      fotografias: ['https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=80']
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (item: Hidrolavado) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleLineOrPosteChange = (codLinea: string, posteN: string) => {
    if (!editingItem) return;
    const details = posteN ? getStructureDetails(estructuras, codLinea, posteN) : null;
    setEditingItem({
      ...editingItem,
      cod_linea: codLinea,
      poste_n: posteN,
      tipo_armado: details?.tipo_armado || editingItem.tipo_armado || 'A',
      tipo_aislador: details?.aislador_material || editingItem.tipo_aislador || 'Polimérico',
      nivel_tension_kv: getLineVoltage(codLinea)
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) {
        setEditingItem(prev =>
          prev
            ? { ...prev, fotografias: [dataUrl, ...(prev.fotografias || [])] }
            : prev
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'La línea y el número de poste son obligatorios.');
      return;
    }

    const prio: Prioridad =
      editingItem.prioridad ||
      (editingItem.nivel_contaminacion === 'Crítico (Salino)' || editingItem.nivel_contaminacion === 'Alto'
        ? 'PRIORITARIO'
        : 'NO PRIORITARIO');

    if (isNew) {
      storageService.addHidrolavado({
        cod_linea: editingItem.cod_linea,
        poste_n: editingItem.poste_n,
        tipo_armado: editingItem.tipo_armado || 'A',
        tipo_aislador: editingItem.tipo_aislador || 'Polimérico',
        nivel_tension_kv: editingItem.nivel_tension_kv || '60',
        fecha_ejecucion: editingItem.fecha_ejecucion || new Date().toISOString().split('T')[0],
        metodo_lavado: editingItem.metodo_lavado || 'En Caliente (Línea Energizada)',
        agua_utilizada_litros: Number(editingItem.agua_utilizada_litros) || 0,
        conductividad_agua_us: Number(editingItem.conductividad_agua_us) || 0,
        presion_psi: Number(editingItem.presion_psi) || 0,
        nivel_contaminacion: editingItem.nivel_contaminacion || 'Alto',
        prioridad: prio,
        estado: editingItem.estado || 'Completado',
        contratista_responsable: editingItem.contratista_responsable || 'Consorcio Eléctrico del Norte S.A.C.',
        orden_mantenimiento: editingItem.orden_mantenimiento || '',
        observaciones: editingItem.observaciones || '',
        fotografias: editingItem.fotografias || []
      });
      showNotification('success', 'Registro de hidrolavado guardado y sincronizado.');
    } else if (editingItem.id_hidrolavado) {
      storageService.updateHidrolavado(editingItem.id_hidrolavado, {
        ...editingItem,
        agua_utilizada_litros: Number(editingItem.agua_utilizada_litros) || 0,
        conductividad_agua_us: Number(editingItem.conductividad_agua_us) || 0,
        presion_psi: Number(editingItem.presion_psi) || 0,
        prioridad: prio
      });
      showNotification('success', 'Registro de hidrolavado actualizado.');
    }

    setIsEditing(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storageService.deleteHidrolavado(deleteTarget.id_hidrolavado);
    showNotification('success', `Hidrolavado ${deleteTarget.id_hidrolavado} enviado a papelera lógica.`);
    setDeleteTarget(null);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportHidrolavado(filteredList);
    showNotification('success', `Exportados ${filteredList.length} registros a Hidrolavado_Aisladores.xlsx.`);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
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
              <Droplets className="h-5 w-5 text-sky-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Hidrolavado de Aisladores</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                {filteredList.length} lavados registrados
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Control de lavado en línea energizada/desenergizada, conductividad de agua desmineralizada (µS/cm), presión PSI y mitigación salina.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Hidrolavado</span>
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

        <DriveModuleToolbar moduleKey="HIDROLAVADO" onDataImported={onRefresh} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400">Total Intervenciones</div>
          <div className="text-2xl font-extrabold text-white mt-1">{kpis.total}</div>
          <div className="text-[11px] text-sky-400 mt-0.5">Estructuras lavadas</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400">En Caliente (Línea Viva)</div>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">{kpis.enCaliente}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sin corte de servicio</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400">Agua Desmineralizada</div>
          <div className="text-2xl font-extrabold text-cyan-300 mt-1">{kpis.litrosTotales.toLocaleString()} L</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Volumen total aplicado</div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400">Críticos / Prioritarios</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">{kpis.criticosSalinos}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Alta contaminación salina</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px] md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar poste, OM, contratista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={selectedLine}
            onChange={(e) => onSelectLine(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
          >
            <option value="TODAS">TODAS LAS LÍNEAS</option>
            {lineas.map((l) => (
              <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
            ))}
          </select>

          <select
            value={filterMetodo}
            onChange={(e) => setFilterMetodo(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="TODOS">TODOS LOS MÉTODOS</option>
            <option value="En Caliente (Línea Energizada)">En Caliente (Energizada)</option>
            <option value="En Frío (Línea Desenergizada)">En Frío (Desenergizada)</option>
          </select>

          <select
            value={filterContaminacion}
            onChange={(e) => setFilterContaminacion(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="TODOS">TODA CONTAMINACIÓN</option>
            <option value="Bajo">Bajo</option>
            <option value="Medio">Medio</option>
            <option value="Alto">Alto</option>
            <option value="Crítico (Salino)">Crítico (Salino)</option>
          </select>

          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value as any)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold"
          >
            <option value="TODAS">TODAS LAS PRIORIDADES</option>
            <option value="PRIORITARIO">PRIORITARIO</option>
            <option value="NO PRIORITARIO">NO PRIORITARIO</option>
          </select>
        </div>
      </div>

      {/* Create / Edit Form Modal */}
      {isEditing && editingItem && (
        <div className="bg-slate-800/95 border-2 border-sky-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">
                {isNew ? 'Nuevo Registro de Hidrolavado de Aisladores' : `Editar Hidrolavado ${editingItem.id_hidrolavado}`}
              </h2>
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
                  const nextCod = e.target.value;
                  const nextPostes = getPostesForLine(estructuras, nextCod);
                  handleLineOrPosteChange(nextCod, nextPostes[0] || '');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
              >
                {lineas.map((l) => (
                  <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">POSTE N° <span className="text-red-400">*</span></label>
              <select
                value={editingItem.poste_n || ''}
                onChange={(e) => handleLineOrPosteChange(editingItem.cod_linea || '', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
              >
                <option value="">-- Seleccionar Poste --</option>
                {availablePostesForForm.map((p) => (
                  <option key={p} value={p}>Poste {p}</option>
                ))}
                {editingItem.poste_n && !availablePostesForForm.includes(editingItem.poste_n) && (
                  <option value={editingItem.poste_n}>Poste {editingItem.poste_n}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TIPO ARMADO / AISLADOR</label>
              <input
                type="text"
                value={editingItem.tipo_aislador || ''}
                onChange={(e) => setEditingItem({ ...editingItem, tipo_aislador: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Polimérico / Porcelana / Vidrio"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NIVEL DE TENSIÓN (kV)</label>
              <input
                type="text"
                value={editingItem.nivel_tension_kv || '60'}
                onChange={(e) => setEditingItem({ ...editingItem, nivel_tension_kv: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
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

            <div>
              <label className="block font-semibold text-slate-300 mb-1">MÉTODO DE LAVADO</label>
              <select
                value={editingItem.metodo_lavado || 'En Caliente (Línea Energizada)'}
                onChange={(e) => setEditingItem({ ...editingItem, metodo_lavado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="En Caliente (Línea Energizada)">En Caliente (Línea Energizada)</option>
                <option value="En Frío (Línea Desenergizada)">En Frío (Línea Desenergizada)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">AGUA UTILIZADA (Litros)</label>
              <input
                type="number"
                min={0}
                value={editingItem.agua_utilizada_litros ?? 200}
                onChange={(e) => setEditingItem({ ...editingItem, agua_utilizada_litros: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CONDUCTIVIDAD AGUA (µS/cm)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={editingItem.conductividad_agua_us ?? 18}
                onChange={(e) => setEditingItem({ ...editingItem, conductividad_agua_us: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PRESIÓN DE CHORRO (PSI)</label>
              <input
                type="number"
                min={0}
                value={editingItem.presion_psi ?? 650}
                onChange={(e) => setEditingItem({ ...editingItem, presion_psi: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NIVEL DE CONTAMINACIÓN</label>
              <select
                value={editingItem.nivel_contaminacion || 'Alto'}
                onChange={(e) => {
                  const val = e.target.value as Hidrolavado['nivel_contaminacion'];
                  setEditingItem({
                    ...editingItem,
                    nivel_contaminacion: val,
                    prioridad: val === 'Crítico (Salino)' || val === 'Alto' ? 'PRIORITARIO' : 'NO PRIORITARIO'
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="Bajo">Bajo</option>
                <option value="Medio">Medio</option>
                <option value="Alto">Alto</option>
                <option value="Crítico (Salino)">Crítico (Salino)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">PRIORIDAD</label>
              <select
                value={editingItem.prioridad || 'PRIORITARIO'}
                onChange={(e) => setEditingItem({ ...editingItem, prioridad: e.target.value as Prioridad })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="PRIORITARIO">PRIORITARIO</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingItem.estado || 'Completado'}
                onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Programado">Programado</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Completado">Completado</option>
                <option value="Verificado">Verificado</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">CONTRATISTA RESPONSABLE</label>
              <input
                type="text"
                value={editingItem.contratista_responsable || ''}
                onChange={(e) => setEditingItem({ ...editingItem, contratista_responsable: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">N° ORDEN MANTENIMIENTO (OM)</label>
              <input
                type="text"
                value={editingItem.orden_mantenimiento || ''}
                onChange={(e) => setEditingItem({ ...editingItem, orden_mantenimiento: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                placeholder="OM-2026-..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">FOTO / EVIDENCIA</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-[11px]"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES TÉCNICAS</label>
              <textarea
                rows={2}
                value={editingItem.observaciones || ''}
                onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ej: Lavado de cadena de suspensión sin interrupción de servicio..."
              />
            </div>

            <div className="lg:col-span-4">
              <AuditFieldsBlock
                currentUser={currentUser}
                usuarioRegistro={editingItem.usuario_registro || editingItem.Usuario_Registro}
                fechaHoraMovimiento={editingItem.fecha_hora_movimiento || editingItem.Fecha_Hora_Movimiento}
                estadoRegistro={editingItem.estado_registro || editingItem.Estado_Registro || 'Activo'}
                isNew={isNew}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Registro de Hidrolavado</span>
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
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE</th>
                <th className="px-3 py-3">MÉTODO LAVADO</th>
                <th className="px-3 py-3">PARÁMETROS AGUA / PSI</th>
                <th className="px-3 py-3">CONTAMINACIÓN</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-3 py-3">FECHA / OM</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3">EVIDENCIA</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500">
                    No se han registrado jornadas de hidrolavado con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredList.map((h) => (
                  <tr key={h.id_hidrolavado} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono text-white font-bold">{h.cod_linea}</td>
                    <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{h.poste_n}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          h.metodo_lavado.includes('Caliente')
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                            : 'bg-sky-950/70 text-sky-300 border-sky-800'
                        }`}
                      >
                        {h.metodo_lavado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-300">
                      <div>{h.agua_utilizada_litros} L • {h.presion_psi} PSI</div>
                      <div className="text-cyan-400">{h.conductividad_agua_us} µS/cm</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.nivel_contaminacion === 'Crítico (Salino)'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : h.nivel_contaminacion === 'Alto'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : 'bg-slate-900 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {h.nivel_contaminacion}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          h.prioridad === 'PRIORITARIO'
                            ? 'bg-red-950/80 text-red-300 border-red-800'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {h.prioridad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">
                      <div>{h.fecha_ejecucion}</div>
                      {h.orden_mantenimiento && (
                        <div className="text-[10px] font-mono text-cyan-400">{h.orden_mantenimiento}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {h.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {h.fotografias && h.fotografias.length > 0 ? (
                        <button
                          onClick={() => onOpenPhoto && onOpenPhoto(h.fotografias[0], `Hidrolavado ${h.cod_linea} Poste ${h.poste_n}`)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>{h.fotografias.length} foto</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(h)}
                          className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition cursor-pointer"
                          title="Eliminar (Soft Delete)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soft Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-700/70 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-300 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Confirmar Eliminación Lógica</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              ¿Deseas marcar como eliminado el registro de hidrolavado <strong className="text-white">{deleteTarget.id_hidrolavado}</strong> ({deleteTarget.cod_linea} • Poste {deleteTarget.poste_n})? Permanecerá auditado en historial y se sincronizará con Google Drive.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
