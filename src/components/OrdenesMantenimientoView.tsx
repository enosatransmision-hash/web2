import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  X,
  Save,
  ShieldCheck,
  Flame,
  Scissors,
  Wrench,
  Camera,
  Check,
  Layers,
  ArrowRight,
  Droplets,
  FileSpreadsheet
} from 'lucide-react';
import {
  OrdenMantenimiento,
  EstadoOrdenMantenimiento,
  TipoActividadOM,
  ItemRegistroOM,
  Prioridad,
  LineaSubtransmision,
  Estructura,
  Usuario
} from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface OrdenesMantenimientoViewProps {
  ordenes: OrdenMantenimiento[];
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const OrdenesMantenimientoView: React.FC<OrdenesMantenimientoViewProps> = ({
  ordenes,
  lineas,
  estructuras,
  currentUser,
  onRefresh,
  onOpenPhoto
}) => {
  // Main filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | EstadoOrdenMantenimiento>('TODOS');
  const [filterActividad, setFilterActividad] = useState<'TODAS' | TipoActividadOM>('TODAS');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOMForDetail, setSelectedOMForDetail] = useState<OrdenMantenimiento | null>(null);
  const [omToDelete, setOmToDelete] = useState<OrdenMantenimiento | null>(null);

  // Notification feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Form editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    numero_om: string;
    fecha_inicio: string;
    fecha_ejecucion: string;
    estado: EstadoOrdenMantenimiento;
    tipo_actividad: TipoActividadOM;
    responsable: string;
    observaciones: string;
    selectedRegistros: ItemRegistroOM[];
  }>({
    numero_om: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_ejecucion: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    estado: 'Por subsanar',
    tipo_actividad: 'Deficiencias Técnicas',
    responsable: `${currentUser.nombres} ${currentUser.apellidos}`,
    observaciones: '',
    selectedRegistros: []
  });

  // Filters within the record selection modal
  const [subFilterLinea, setSubFilterLinea] = useState<string>('TODAS');
  const [subFilterPoste, setSubFilterPoste] = useState<string>('TODOS');
  const [subFilterPrioridad, setSubFilterPrioridad] = useState<'TODAS' | Prioridad>('TODAS');
  const [subSearchTerm, setSubSearchTerm] = useState<string>('');

  // Helper to retrieve all records of a given activity as ItemRegistroOM
  const loadRecordsForActivity = (actividad: TipoActividadOM): ItemRegistroOM[] => {
    switch (actividad) {
      case 'Deficiencias Técnicas': {
        return storageService.getDeficiencias().map(d => ({
          id_registro: d.id_deficiencia,
          cod_linea: d.cod_linea,
          poste_n: d.poste_n,
          descripcion: d.descripcion || 'Sin descripción',
          prioridad: d.prioridad || 'PRIORITARIO',
          tipo_actividad: 'Deficiencias Técnicas',
          estado_original: d.estado,
          fecha_original: d.fecha_inspeccion,
          evidencia_url: d.evidencia_fotografica
        }));
      }
      case 'Puesta a Tierra': {
        return storageService.getPuestaTierra().map(p => ({
          id_registro: p.id_pat,
          cod_linea: p.cod_linea,
          poste_n: p.poste_n,
          descripcion: `Resistencia: ${p.valor_resistencia_pat} Ω${p.comentario ? ` - ${p.comentario}` : ''}`,
          prioridad: p.prioridad || (p.valor_resistencia_pat >= 5 ? 'PRIORITARIO' : 'NO PRIORITARIO'),
          tipo_actividad: 'Puesta a Tierra',
          fecha_original: p.fecha_medicion,
          evidencia_url: p.evidencia_url
        }));
      }
      case 'Termografía Infrarroja': {
        return storageService.getTermografia().map(t => ({
          id_registro: t.id_termografia,
          cod_linea: t.cod_linea,
          poste_n: t.poste_n,
          descripcion: `Punto caliente: ${t.componente_falla} (${t.temp_max_componente}°C - ΔT: ${t.delta_t}°C)`,
          prioridad: t.prioridad || 'PRIORITARIO',
          tipo_actividad: 'Termografía Infrarroja',
          fecha_original: t.fecha,
          evidencia_url: t.evidencia_url
        }));
      }
      case 'Control de Podas': {
        return storageService.getPodas().map(poda => ({
          id_registro: poda.id_poda,
          cod_linea: poda.cod_linea,
          poste_n: poda.poste_n,
          descripcion: `Poda: ${poda.total_arboles} árboles (${poda.ubicacion_referencia || 'Tramo'})`,
          prioridad: poda.prioridad || 'PRIORITARIO',
          tipo_actividad: 'Control de Podas',
          estado_original: poda.estado,
          fecha_original: poda.fecha_ejecucion,
          evidencia_url: poda.fotografias && poda.fotografias.length > 0 ? poda.fotografias[0] : undefined
        }));
      }
      case 'Mantenimiento de Postes': {
        return storageService.getMantenimiento().map(m => ({
          id_registro: m.id_mantenimiento,
          cod_linea: m.cod_linea,
          poste_n: m.poste_n,
          descripcion: `${m.tipo_mantenimiento}: ${m.actividad_realizada}`,
          prioridad: m.prioridad || 'PRIORITARIO',
          tipo_actividad: 'Mantenimiento de Postes',
          estado_original: m.estado,
          fecha_original: m.fecha_ejecucion,
          evidencia_url: m.fotografias && m.fotografias.length > 0 ? m.fotografias[0] : undefined
        }));
      }
      case 'Hidrolavado': {
        return storageService.getHidrolavado().map(h => ({
          id_registro: h.id_hidrolavado,
          cod_linea: h.cod_linea,
          poste_n: h.poste_n,
          descripcion: `Hidrolavado ${h.metodo_lavado} • Contam: ${h.nivel_contaminacion} (${h.agua_utilizada_litros} L)`,
          prioridad: h.prioridad || 'PRIORITARIO',
          tipo_actividad: 'Hidrolavado',
          estado_original: h.estado,
          fecha_original: h.fecha_ejecucion,
          evidencia_url: h.fotografias && h.fotografias.length > 0 ? h.fotografias[0] : undefined
        }));
      }
      default:
        return [];
    }
  };

  // Records available for current selected activity in form modal
  const availableRecords = useMemo(() => {
    return loadRecordsForActivity(formData.tipo_actividad);
  }, [formData.tipo_actividad, ordenes]);

  // Available postes for current line in sub-filters
  const availablePostesForSubFilter = useMemo(() => {
    if (subFilterLinea === 'TODAS') {
      const allPostes = availableRecords.map(r => r.poste_n);
      return Array.from(new Set(allPostes)).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    }
    return getPostesForLine(estructuras, subFilterLinea);
  }, [availableRecords, subFilterLinea, estructuras]);

  // Filtered records in form modal
  const filteredRecordsInForm = useMemo(() => {
    return availableRecords.filter(r => {
      const matchLinea = subFilterLinea === 'TODAS' || r.cod_linea === subFilterLinea;
      const matchPoste = subFilterPoste === 'TODOS' || r.poste_n === subFilterPoste;
      const matchPrioridad = subFilterPrioridad === 'TODAS' || r.prioridad === subFilterPrioridad;
      const matchSearch =
        subSearchTerm === '' ||
        r.cod_linea.toLowerCase().includes(subSearchTerm.toLowerCase()) ||
        r.poste_n.toLowerCase().includes(subSearchTerm.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(subSearchTerm.toLowerCase());
      return matchLinea && matchPoste && matchPrioridad && matchSearch;
    });
  }, [availableRecords, subFilterLinea, subFilterPoste, subFilterPrioridad, subSearchTerm]);

  // Filtered main OM list
  const filteredOrdenes = useMemo(() => {
    return ordenes.filter(om => {
      const matchEstado = filterEstado === 'TODOS' || om.estado === filterEstado;
      const matchActividad = filterActividad === 'TODAS' || om.tipo_actividad === filterActividad;
      const matchSearch =
        searchTerm === '' ||
        om.numero_om.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (om.responsable || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (om.observaciones || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        om.tipo_actividad.toLowerCase().includes(searchTerm.toLowerCase());
      return matchEstado && matchActividad && matchSearch;
    });
  }, [ordenes, filterEstado, filterActividad, searchTerm]);

  // Activity icon helper
  const getActivityIcon = (act: TipoActividadOM) => {
    switch (act) {
      case 'Deficiencias Técnicas':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'Puesta a Tierra':
        return <ShieldCheck className="h-4 w-4 text-cyan-400" />;
      case 'Termografía Infrarroja':
        return <Flame className="h-4 w-4 text-orange-400" />;
      case 'Control de Podas':
        return <Scissors className="h-4 w-4 text-emerald-400" />;
      case 'Mantenimiento de Postes':
        return <Wrench className="h-4 w-4 text-blue-400" />;
      case 'Hidrolavado':
        return <Droplets className="h-4 w-4 text-sky-400" />;
    }
  };

  // Open Form for New OM
  const handleOpenNew = () => {
    const nextNum = `OM-${new Date().getFullYear()}-${String(ordenes.length + 1).padStart(3, '0')}`;
    setEditingId(null);
    setFormData({
      numero_om: nextNum,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_ejecucion: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      estado: 'Por subsanar',
      tipo_actividad: 'Deficiencias Técnicas',
      responsable: `${currentUser.nombres} ${currentUser.apellidos}`,
      observaciones: '',
      selectedRegistros: []
    });
    setSubFilterLinea('TODAS');
    setSubFilterPoste('TODOS');
    setSubFilterPrioridad('TODAS');
    setSubSearchTerm('');
    setIsFormOpen(true);
  };

  // Open Form for Edit OM
  const handleOpenEdit = (om: OrdenMantenimiento) => {
    setEditingId(om.id_om);
    setFormData({
      numero_om: om.numero_om,
      fecha_inicio: om.fecha_inicio,
      fecha_ejecucion: om.fecha_ejecucion,
      estado: om.estado,
      tipo_actividad: om.tipo_actividad,
      responsable: om.responsable || '',
      observaciones: om.observaciones || '',
      selectedRegistros: [...(om.registros_asociados || [])]
    });
    setSubFilterLinea('TODAS');
    setSubFilterPoste('TODOS');
    setSubFilterPrioridad('TODAS');
    setSubSearchTerm('');
    setIsFormOpen(true);
  };

  // Toggle record selection
  const handleToggleRecordSelection = (item: ItemRegistroOM) => {
    setFormData(prev => {
      const exists = prev.selectedRegistros.some(r => r.id_registro === item.id_registro);
      return {
        ...prev,
        selectedRegistros: exists
          ? prev.selectedRegistros.filter(r => r.id_registro !== item.id_registro)
          : [...prev.selectedRegistros, item]
      };
    });
  };

  // Select all / deselect all filtered records
  const handleSelectAllFiltered = () => {
    setFormData(prev => {
      const currentIds = new Set(prev.selectedRegistros.map(r => r.id_registro));
      const toAdd = filteredRecordsInForm.filter(r => !currentIds.has(r.id_registro));
      return {
        ...prev,
        selectedRegistros: [...prev.selectedRegistros, ...toAdd]
      };
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredRecordsInForm.map(r => r.id_registro));
    setFormData(prev => ({
      ...prev,
      selectedRegistros: prev.selectedRegistros.filter(r => !filteredIdsSet.has(r.id_registro))
    }));
  };

  // Bulk set priority for selected records
  const handleBulkSetPriority = (prioridad: Prioridad) => {
    const idsToUpdate = formData.selectedRegistros.map(r => r.id_registro);
    if (idsToUpdate.length === 0) {
      showNotification('error', 'Seleccione al menos un registro para aplicar prioridad masiva.');
      return;
    }
    const count = storageService.bulkUpdateRegistrosPrioridad(
      formData.tipo_actividad,
      idsToUpdate,
      prioridad
    );
    // Update local state in form
    setFormData(prev => ({
      ...prev,
      selectedRegistros: prev.selectedRegistros.map(r => ({ ...r, prioridad }))
    }));
    showNotification('success', `Se marcaron ${count} registros como ${prioridad}.`);
    onRefresh();
  };

  // Single record priority change inline
  const handleSingleSetPriority = (idRegistro: string, prioridad: Prioridad) => {
    storageService.updateRegistroPrioridad(formData.tipo_actividad, idRegistro, prioridad);
    setFormData(prev => ({
      ...prev,
      selectedRegistros: prev.selectedRegistros.map(r =>
        r.id_registro === idRegistro ? { ...r, prioridad } : r
      )
    }));
    onRefresh();
  };

  // Save OM
  const handleSaveOM = () => {
    if (!formData.numero_om.trim()) {
      showNotification('error', 'El número de orden es obligatorio.');
      return;
    }
    if (!formData.fecha_inicio || !formData.fecha_ejecucion) {
      showNotification('error', 'Las fechas de inicio y ejecución son obligatorias.');
      return;
    }

    if (editingId) {
      // Update
      storageService.updateOrdenMantenimiento(editingId, {
        numero_om: formData.numero_om.trim(),
        fecha_inicio: formData.fecha_inicio,
        fecha_ejecucion: formData.fecha_ejecucion,
        estado: formData.estado,
        tipo_actividad: formData.tipo_actividad,
        responsable: formData.responsable,
        observaciones: formData.observaciones,
        registros_asociados: formData.selectedRegistros
      });
      showNotification('success', `Orden ${formData.numero_om} actualizada con éxito.`);
    } else {
      // Create
      storageService.addOrdenMantenimiento({
        numero_om: formData.numero_om.trim(),
        fecha_inicio: formData.fecha_inicio,
        fecha_ejecucion: formData.fecha_ejecucion,
        estado: formData.estado,
        tipo_actividad: formData.tipo_actividad,
        responsable: formData.responsable,
        observaciones: formData.observaciones,
        registros_asociados: formData.selectedRegistros
      });
      showNotification('success', `Orden ${formData.numero_om} creada con éxito.`);
    }

    setIsFormOpen(false);
    onRefresh();
  };

  // Open confirmation modal for OM deletion
  const handleDeleteOM = (om: OrdenMantenimiento) => {
    setOmToDelete(om);
  };

  // Execute safe deletion with unlinking in storage and realtime sync
  const handleConfirmDelete = () => {
    if (!omToDelete) return;
    const num = omToDelete.numero_om;
    const id = omToDelete.id_om;
    storageService.deleteOrdenMantenimiento(id);
    showNotification('success', `Orden de Mantenimiento ${num} eliminada y desvinculada exitosamente.`);
    setOmToDelete(null);
    if (selectedOMForDetail?.id_om === id || selectedOMForDetail?.numero_om === num) {
      setIsDetailOpen(false);
      setSelectedOMForDetail(null);
    }
    onRefresh();
  };

  // Toggle Estado directly (Subsanado <-> Por subsanar)
  const handleToggleEstado = (om: OrdenMantenimiento) => {
    const nuevoEstado: EstadoOrdenMantenimiento =
      om.estado === 'Subsanado' ? 'Por subsanar' : 'Subsanado';
    const success = storageService.updateOrdenMantenimiento(om.id_om, { estado: nuevoEstado });
    if (success) {
      showNotification('success', `Orden ${om.numero_om} actualizada a estado "${nuevoEstado}".`);
      if (selectedOMForDetail?.id_om === om.id_om) {
        setSelectedOMForDetail({ ...selectedOMForDetail, estado: nuevoEstado });
      }
      onRefresh();
    }
  };

  // View detail
  const handleOpenDetail = (om: OrdenMantenimiento) => {
    setSelectedOMForDetail(om);
    setIsDetailOpen(true);
  };

  // Overall statistics
  const stats = useMemo(() => {
    const total = ordenes.length;
    const subsanadas = ordenes.filter(o => o.estado === 'Subsanado').length;
    const pendientes = ordenes.filter(o => o.estado === 'Por subsanar').length;
    const totalRegistrosAsignados = ordenes.reduce(
      (acc, o) => acc + (o.registros_asociados?.length || 0),
      0
    );
    return { total, subsanadas, pendientes, totalRegistrosAsignados };
  }, [ordenes]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header and Action */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Órdenes de Mantenimiento (OM)</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                {ordenes.length} órdenes registradas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gestión, programación y seguimiento de órdenes de trabajo por actividad técnica con clasificación de prioridad y cambio de estado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Orden de Mantenimiento</span>
            </button>

            <button
              onClick={() => {
                ExcelService.exportOrdenesMantenimiento(filteredOrdenes);
                showNotification('success', `Exportadas ${filteredOrdenes.length} órdenes a Ordenes_Mantenimiento.xlsx.`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>
          </div>
        </div>

        <DriveModuleToolbar moduleKey="ORDENES_OM" onDataImported={onRefresh} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Órdenes</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{stats.total}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-amber-900/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Por Subsanar</div>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{stats.pendientes}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-emerald-900/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Subsanadas</div>
            <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">{stats.subsanadas}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-blue-900/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Registros en OM</div>
            <div className="text-2xl font-black text-blue-300 mt-1 font-mono">{stats.totalRegistrosAsignados}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° OM, responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Estado:</span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODOS">TODOS LOS ESTADOS</option>
              <option value="Por subsanar">Por subsanar</option>
              <option value="Subsanado">Subsanado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Actividad:</span>
            <select
              value={filterActividad}
              onChange={(e) => setFilterActividad(e.target.value as any)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">TODAS LAS ACTIVIDADES</option>
              <option value="Deficiencias Técnicas">Deficiencias Técnicas</option>
              <option value="Puesta a Tierra">Puesta a Tierra</option>
              <option value="Termografía Infrarroja">Termografía Infrarroja</option>
              <option value="Control de Podas">Control de Podas</option>
              <option value="Mantenimiento de Postes">Mantenimiento de Postes</option>
              <option value="Hidrolavado">Hidrolavado</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Mostrando: <strong className="text-white">{filteredOrdenes.length}</strong></span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3">N° ORDEN</th>
                <th className="px-3 py-3">ACTIVIDAD</th>
                <th className="px-3 py-3">FECHA INICIO</th>
                <th className="px-3 py-3">FECHA EJECUCIÓN</th>
                <th className="px-3 py-3">ESTADO (CAMBIO RÁPIDO)</th>
                <th className="px-3 py-3 text-center">REGISTROS ASIGNADOS</th>
                <th className="px-3 py-3">RESPONSABLE</th>
                <th className="px-3 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredOrdenes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No se encontraron órdenes de mantenimiento con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrdenes.map((om) => {
                  const isSubsanado = om.estado === 'Subsanado';
                  return (
                    <tr key={om.id_om} className="hover:bg-slate-750/70 transition">
                      <td className="px-3 py-3 font-mono font-bold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{om.numero_om}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          {getActivityIcon(om.tipo_actividad)}
                          <span>{om.tipo_actividad}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-300 font-mono">{om.fecha_inicio}</td>
                      <td className="px-3 py-3 text-slate-300 font-mono">{om.fecha_ejecucion}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleEstado(om)}
                          title="Haz clic para alternar entre Subsanado y Por subsanar"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                            isSubsanado
                              ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                              : 'bg-amber-950/80 border-amber-600 text-amber-300 hover:bg-amber-900/80'
                          }`}
                        >
                          {isSubsanado ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                          )}
                          <span>{om.estado}</span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-white font-mono font-bold">
                          {om.registros_asociados?.length || 0} registros
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{om.responsable || 'No asignado'}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(om)}
                            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-cyan-300 transition cursor-pointer"
                            title="Ver Detalle de la Orden"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(om)}
                            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-blue-300 transition cursor-pointer"
                            title="Editar Orden"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOM(om)}
                            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-red-900/60 text-red-400 transition cursor-pointer"
                            title="Eliminar Orden de Mantenimiento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nueva / Editar Orden */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingId ? `Editar Orden: ${formData.numero_om}` : 'Nueva Orden de Mantenimiento'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina los datos de la orden y seleccione los registros de la actividad para clasificar su prioridad masiva o individual.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    N° DE ORDEN <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numero_om}
                    onChange={(e) => setFormData({ ...formData, numero_om: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                    placeholder="OM-2026-001"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TIPO DE ACTIVIDAD <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.tipo_actividad}
                    onChange={(e) => {
                      const nextAct = e.target.value as TipoActividadOM;
                      setFormData({
                        ...formData,
                        tipo_actividad: nextAct,
                        selectedRegistros: []
                      });
                      setSubFilterLinea('TODAS');
                      setSubFilterPoste('TODOS');
                      setSubFilterPrioridad('TODAS');
                      setSubSearchTerm('');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-bold focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Deficiencias Técnicas">Deficiencias Técnicas</option>
                    <option value="Puesta a Tierra">Puesta a Tierra</option>
                    <option value="Termografía Infrarroja">Termografía Infrarroja</option>
                    <option value="Control de Podas">Control de Podas</option>
                    <option value="Mantenimiento de Postes">Mantenimiento de Postes</option>
                    <option value="Hidrolavado">Hidrolavado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    FECHA DE INICIO <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    FECHA DE EJECUCIÓN <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_ejecucion}
                    onChange={(e) => setFormData({ ...formData, fecha_ejecucion: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    ESTADO DE LA ORDEN <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoOrdenMantenimiento })}
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 font-bold focus:ring-2 ${
                      formData.estado === 'Subsanado'
                        ? 'text-emerald-300 border-emerald-700'
                        : 'text-amber-300 border-amber-700'
                    }`}
                  >
                    <option value="Por subsanar">Por subsanar</option>
                    <option value="Subsanado">Subsanado</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block font-semibold text-slate-300 mb-1">RESPONSABLE / CONTRATISTA</label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                    placeholder="Nombre del ingeniero o contratista responsable"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES / ALCANCE DE LA ORDEN</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                    placeholder="Instrucciones especiales de seguridad, permisos de corte de energía, materiales..."
                  />
                </div>
              </div>

              {(() => {
                const editingOmRecord = editingId ? ordenes.find(o => o.id_om === editingId) : undefined;
                return (
                  <AuditFieldsBlock
                    currentUser={currentUser}
                    usuarioRegistro={editingOmRecord?.usuario_registro || editingOmRecord?.Usuario_Registro}
                    fechaHoraMovimiento={editingOmRecord?.fecha_hora_movimiento || editingOmRecord?.Fecha_Hora_Movimiento}
                    estadoRegistro={editingOmRecord?.estado_registro || editingOmRecord?.Estado_Registro || 'Activo'}
                    isNew={!editingId}
                  />
                );
              })()}

              {/* Records Selection & Bulk Priority Section */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">REGISTROS DISPONIBLES DE LA ACTIVIDAD:</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                        {formData.tipo_actividad}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Filtre por línea, poste y prioridad. Marque los registros que integrarán esta orden y aplique clasificación masiva.
                    </p>
                  </div>

                  {/* Bulk Priority Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Clasificación Masiva:</span>
                    <button
                      type="button"
                      onClick={() => handleBulkSetPriority('PRIORITARIO')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                      title="Marcar todos los seleccionados como PRIORITARIO"
                    >
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span>Marcar como PRIORITARIO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetPriority('NO PRIORITARIO')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                      title="Marcar todos los seleccionados como NO PRIORITARIO"
                    >
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Marcar como NO PRIORITARIO</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Filters for records */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Línea</label>
                    <select
                      value={subFilterLinea}
                      onChange={(e) => {
                        setSubFilterLinea(e.target.value);
                        setSubFilterPoste('TODOS');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="TODAS">TODAS LAS LÍNEAS</option>
                      {lineas.map(l => (
                        <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Poste</label>
                    <select
                      value={subFilterPoste}
                      onChange={(e) => setSubFilterPoste(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="TODOS">TODOS LOS POSTES</option>
                      {availablePostesForSubFilter.map(p => (
                        <option key={p} value={p}>Poste {p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Prioridad</label>
                    <select
                      value={subFilterPrioridad}
                      onChange={(e) => setSubFilterPrioridad(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      <option value="TODAS">TODAS</option>
                      <option value="PRIORITARIO">PRIORITARIO</option>
                      <option value="NO PRIORITARIO">NO PRIORITARIO</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Buscar en detalle</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar texto..."
                        value={subSearchTerm}
                        onChange={(e) => setSubSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-Selection Header */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
                    >
                      Seleccionar visibles ({filteredRecordsInForm.length})
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      className="text-slate-400 hover:text-slate-300 font-semibold underline cursor-pointer"
                    >
                      Deseleccionar visibles
                    </button>
                  </div>
                  <div>
                    <span className="font-bold text-white">{formData.selectedRegistros.length}</span> seleccionados para esta OM
                  </div>
                </div>

                {/* Records Table in Modal */}
                <div className="max-h-72 overflow-y-auto border border-slate-700/80 rounded-xl bg-slate-950/60">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 sticky top-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">OM</th>
                        <th className="px-3 py-2">LÍNEA</th>
                        <th className="px-3 py-2">POSTE</th>
                        <th className="px-3 py-2">DESCRIPCIÓN / HALLAZGO</th>
                        <th className="px-3 py-2">PRIORIDAD (EDITABLE)</th>
                        <th className="px-3 py-2">FECHA</th>
                        <th className="px-3 py-2 text-center">FOTO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredRecordsInForm.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-500">
                            No se encontraron registros de {formData.tipo_actividad} con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredRecordsInForm.map((rec) => {
                          const isChecked = formData.selectedRegistros.some(
                            r => r.id_registro === rec.id_registro
                          );
                          return (
                            <tr
                              key={rec.id_registro}
                              className={`transition ${isChecked ? 'bg-cyan-950/20' : 'hover:bg-slate-800/40'}`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleRecordSelection(rec)}
                                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-cyan-300 font-bold">{rec.cod_linea}</td>
                              <td className="px-3 py-2 font-mono font-bold text-white">{rec.poste_n}</td>
                              <td className="px-3 py-2 max-w-xs truncate text-slate-200" title={rec.descripcion}>
                                {rec.descripcion}
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={rec.prioridad}
                                  onChange={(e) => handleSingleSetPriority(rec.id_registro, e.target.value as Prioridad)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                    rec.prioridad === 'PRIORITARIO'
                                      ? 'bg-red-950 text-red-300 border-red-800'
                                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  }`}
                                >
                                  <option value="PRIORITARIO">PRIORITARIO</option>
                                  <option value="NO PRIORITARIO">NO PRIORITARIO</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-slate-400 font-mono">{rec.fecha_original || '-'}</td>
                              <td className="px-3 py-2 text-center">
                                {rec.evidencia_url ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPhoto && onOpenPhoto(rec.evidencia_url!, `Poste ${rec.poste_n}`)}
                                    className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                                    title="Ver foto"
                                  >
                                    <Camera className="h-3.5 w-3.5 mx-auto" />
                                  </button>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <span className="font-bold text-cyan-300">{formData.selectedRegistros.length}</span> registros asignados a esta OM
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveOM}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingId ? 'Guardar Cambios' : 'Crear Orden de Mantenimiento'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vista de Detalle de la Orden */}
      {isDetailOpen && selectedOMForDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Detail Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white font-mono">{selectedOMForDetail.numero_om}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                      {selectedOMForDetail.tipo_actividad}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detalle de ejecución y registros vinculados
                  </p>
                </div>
              </div>

              {/* Status Switcher in Detail */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleEstado(selectedOMForDetail)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    selectedOMForDetail.estado === 'Subsanado'
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-300 hover:bg-emerald-900'
                      : 'bg-amber-950 border-amber-600 text-amber-300 hover:bg-amber-900'
                  }`}
                  title="Haz clic para alternar estado"
                >
                  {selectedOMForDetail.estado === 'Subsanado' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-400" />
                  )}
                  <span>Estado: {selectedOMForDetail.estado} (Cambiar)</span>
                </button>

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fecha de Inicio</span>
                  <span className="text-white font-mono font-semibold">{selectedOMForDetail.fecha_inicio}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fecha de Ejecución</span>
                  <span className="text-white font-mono font-semibold">{selectedOMForDetail.fecha_ejecucion}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Responsable</span>
                  <span className="text-white font-semibold">{selectedOMForDetail.responsable || 'No asignado'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Registros</span>
                  <span className="text-cyan-300 font-mono font-bold text-sm">
                    {selectedOMForDetail.registros_asociados?.length || 0} ítems
                  </span>
                </div>

                {selectedOMForDetail.observaciones && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Observaciones / Alcance</span>
                    <p className="text-slate-200">{selectedOMForDetail.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Associated records */}
              <div>
                <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <span>Registros Técnicos Vinculados</span>
                  <span className="text-slate-400 font-normal">
                    ({(selectedOMForDetail.registros_asociados || []).length} asociados)
                  </span>
                </h3>

                <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">LÍNEA</th>
                        <th className="px-3 py-2.5">POSTE</th>
                        <th className="px-4 py-2.5">DESCRIPCIÓN / HALLAZGO</th>
                        <th className="px-3 py-2.5">PRIORIDAD</th>
                        <th className="px-3 py-2.5">FECHA</th>
                        <th className="px-3 py-2.5 text-center">FOTO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(!selectedOMForDetail.registros_asociados || selectedOMForDetail.registros_asociados.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500">
                            No hay registros vinculados a esta orden de mantenimiento.
                          </td>
                        </tr>
                      ) : (
                        selectedOMForDetail.registros_asociados.map((rec) => (
                          <tr key={rec.id_registro} className="hover:bg-slate-800/40 transition">
                            <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{rec.cod_linea}</td>
                            <td className="px-3 py-2.5 font-mono font-bold text-white">{rec.poste_n}</td>
                            <td className="px-4 py-2.5 text-slate-200">{rec.descripcion}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                rec.prioridad === 'PRIORITARIO'
                                  ? 'bg-red-950/80 text-red-300 border-red-800'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              }`}>
                                {rec.prioridad}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-400 font-mono">{rec.fecha_original || '-'}</td>
                            <td className="px-3 py-2.5 text-center">
                              {rec.evidencia_url ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenPhoto && onOpenPhoto(rec.evidencia_url!, `Poste ${rec.poste_n}`)}
                                  className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                                  title="Ver foto"
                                >
                                  <Camera className="h-4 w-4 mx-auto" />
                                </button>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Detail Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenEdit(selectedOMForDetail);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Editar Orden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOmToDelete(selectedOMForDetail)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/70 text-xs font-semibold cursor-pointer transition"
                  title="Eliminar esta Orden de Mantenimiento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar Orden</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition shadow-md shadow-cyan-600/20"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación Seguro */}
      {omToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 ring-1 ring-red-500/20">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400 shrink-0 shadow-inner">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Confirmar Eliminación de Orden de Mantenimiento
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esta acción eliminará la orden de la base y desvinculará sus registros asociados automáticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOmToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen de la Orden a Eliminar */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">N° de Orden (OM):</span>
                <span className="font-mono text-sm font-black text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800/60">
                  {omToDelete.numero_om}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Actividad Técnica:</span>
                <span className="font-semibold text-slate-200">{omToDelete.tipo_actividad}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Estado Actual:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  omToDelete.estado === 'Subsanado'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}>
                  {omToDelete.estado === 'Subsanado' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {omToDelete.estado}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Vigencia / Período:</span>
                <span className="font-mono text-slate-300">
                  {omToDelete.fecha_inicio} al {omToDelete.fecha_ejecucion}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Registros Vinculados:</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {omToDelete.registros_asociados?.length || 0} registros
                </span>
              </div>
            </div>

            {/* Aviso de Desvinculación Segura */}
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong className="text-amber-300">Desvinculación automática:</strong> Si existían deficiencias o actividades con esta orden asociada, se limpia y desvincula automáticamente el campo N° de OM para evitar registros huérfanos. Se difunde por WebSockets y se registra en la bitácora de auditoría.
              </p>
            </div>

            {/* Botones Interactivos */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOmToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-700/30 cursor-pointer transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Sí, eliminar Orden de Mantenimiento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
