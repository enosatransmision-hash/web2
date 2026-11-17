import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Search,
  Eye,
  Camera,
  Save,
  X,
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  Trash2
} from 'lucide-react';
import {
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  LineaSubtransmision,
  Usuario,
  Prioridad,
  EstadoDMS,
  Estructura
} from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { getPostesForLine, getStructureDetails } from '../utils/structureUtils';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface DMSViewProps {
  dmsList: DMSItem[];
  levantamientos: LevantamientoDMS[];
  inspecciones: InspeccionCierreDMS[];
  lineas: LineaSubtransmision[];
  estructuras?: Estructura[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const DMSView: React.FC<DMSViewProps> = ({
  dmsList,
  levantamientos,
  inspecciones,
  lineas,
  estructuras,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onOpenPhoto
}) => {
  const [activeTab, setActiveTab] = useState<'DMS' | 'LEVANTAMIENTOS' | 'INSPECCIONES'>('DMS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Modal States
  const [isNewDMSModalOpen, setIsNewDMSModalOpen] = useState(false);
  const [newDMS, setNewDMS] = useState<Partial<DMSItem>>({
    cod_linea: selectedLine === 'TODAS' ? 'L-6657C' : selectedLine,
    poste_n: '1',
    codigo_dms: 'DMS-2026-',
    descripcion: '',
    fecha_identificacion: new Date().toISOString().split('T')[0],
    prioridad: 'PRIORITARIO',
    fuente: 'OSINERGMIN',
    orden_servicio: 'OS-2026',
    estado: 'Pendiente',
    observaciones: '',
    evidencias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
  });

  // Dynamic list of postes for current line in new DMS modal
  const availablePostesForNewDMS = useMemo(() => {
    return getPostesForLine(estructuras, newDMS?.cod_linea);
  }, [estructuras, newDMS?.cod_linea]);

  const handleOpenNewDMSModal = () => {
    const initialLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const initialPostes = getPostesForLine(estructuras, initialLine);
    setNewDMS(prev => ({
      ...prev,
      cod_linea: initialLine,
      poste_n: initialPostes[0] || ''
    }));
    setIsNewDMSModalOpen(true);
  };

  // Levantamiento Modal State
  const [isLevantamientoModalOpen, setIsLevantamientoModalOpen] = useState(false);
  const [selectedDMSForLev, setSelectedDMSForLev] = useState<DMSItem | null>(null);
  const [levForm, setLevForm] = useState<Partial<LevantamientoDMS>>({
    fecha_ejecucion: new Date().toISOString().split('T')[0],
    descripcion_trabajo: '',
    orden_servicio: '',
    fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'],
    observaciones: '',
    contratista_responsable: currentUser.rol === 'Contratista' ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Consorcio Eléctrico del Norte'
  });

  // Inspección y Cierre Modal State
  const [isInspecModalOpen, setIsInspecModalOpen] = useState(false);
  const [selectedDMSForInsp, setSelectedDMSForInsp] = useState<DMSItem | null>(null);
  const [inspForm, setInspForm] = useState<Partial<InspeccionCierreDMS>>({
    fecha_inspeccion: new Date().toISOString().split('T')[0],
    inspector: `${currentUser.nombres} ${currentUser.apellidos}`,
    resultado: 'Levantamiento conforme',
    observaciones: '',
    evidencias_fotograficas: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'],
    estado_final: 'Cerrada'
  });

  // Asistente Importación 12 Pasos
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [rawFileRows, setRawFileRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    cod_linea: '',
    poste_n: '',
    codigo_dms: '',
    descripcion: '',
    fecha_identificacion: '',
    prioridad: '',
    fuente: '',
    orden_servicio: '',
    observaciones: ''
  });
  const [previewItems, setPreviewItems] = useState<DMSItem[]>([]);
  const [wizardErrors, setWizardErrors] = useState<string[]>([]);

  // Soft Delete state
  const [dmsToDelete, setDmsToDelete] = useState<DMSItem | null>(null);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmDeleteDMS = () => {
    if (!dmsToDelete) return;
    storageService.deleteDMS(dmsToDelete.id_dms);
    showNotification('success', `Caso DMS ${dmsToDelete.codigo_dms} marcado como Eliminado (borrado lógico) y sincronizado.`);
    setDmsToDelete(null);
    onRefresh();
  };

  const filteredDMS = useMemo(() => {
    return dmsList.filter(d => {
      const matchLine = selectedLine === 'TODAS' || d.cod_linea === selectedLine;
      const matchSearch =
        d.codigo_dms.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.fuente.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEstado = filterEstado === 'TODOS' || d.estado === filterEstado;
      return matchLine && matchSearch && matchEstado;
    });
  }, [dmsList, selectedLine, searchTerm, filterEstado]);

  // Handlers
  const handleSaveNewDMS = () => {
    if (!newDMS.cod_linea || !newDMS.poste_n || !newDMS.descripcion) {
      showNotification('error', 'Línea, poste y descripción son obligatorios.');
      return;
    }
    storageService.addDMS({
      cod_linea: newDMS.cod_linea,
      poste_n: newDMS.poste_n,
      codigo_dms: newDMS.codigo_dms || `DMS-${Date.now()}`,
      descripcion: newDMS.descripcion,
      fecha_identificacion: newDMS.fecha_identificacion || new Date().toISOString().split('T')[0],
      prioridad: (newDMS.prioridad as Prioridad) || 'PRIORITARIO',
      fuente: newDMS.fuente || 'OSINERGMIN',
      orden_servicio: newDMS.orden_servicio || '',
      estado: (newDMS.estado as EstadoDMS) || 'Pendiente',
      observaciones: newDMS.observaciones || '',
      evidencias: newDMS.evidencias || []
    });
    showNotification('success', 'Caso de DMS registrado.');
    setIsNewDMSModalOpen(false);
    onRefresh();
  };

  const handleOpenLevantamiento = (item: DMSItem) => {
    setSelectedDMSForLev(item);
    setLevForm({
      fecha_ejecucion: new Date().toISOString().split('T')[0],
      descripcion_trabajo: `Despeje y corrección de DMS en vano/poste ${item.poste_n} de línea ${item.cod_linea}`,
      orden_servicio: item.orden_servicio || 'OS-2026',
      fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'],
      observaciones: '',
      contratista_responsable: currentUser.rol === 'Contratista' ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Consorcio Eléctrico del Norte'
    });
    setIsLevantamientoModalOpen(true);
  };

  const handleSaveLevantamiento = () => {
    if (!selectedDMSForLev || !levForm.descripcion_trabajo) {
      showNotification('error', 'Complete la descripción del trabajo realizado.');
      return;
    }
    storageService.addLevantamiento({
      id_dms: selectedDMSForLev.id_dms,
      cod_linea: selectedDMSForLev.cod_linea,
      poste_n: selectedDMSForLev.poste_n,
      fecha_ejecucion: levForm.fecha_ejecucion || new Date().toISOString().split('T')[0],
      descripcion_trabajo: levForm.descripcion_trabajo,
      orden_servicio: levForm.orden_servicio || '',
      fotografias: levForm.fotografias || [],
      observaciones: levForm.observaciones || '',
      contratista_responsable: levForm.contratista_responsable || `${currentUser.nombres} ${currentUser.apellidos}`,
      estado: 'Registrado'
    });
    showNotification('success', 'Levantamiento registrado. Pendiente de inspección de cierre por supervisor.');
    setIsLevantamientoModalOpen(false);
    onRefresh();
  };

  const handleOpenInspeccion = (item: DMSItem) => {
    if (currentUser.rol === 'Contratista') {
      showNotification('error', 'Permiso denegado: El contratista no puede realizar la inspección ni el cierre definitivo de DMS.');
      return;
    }
    setSelectedDMSForInsp(item);
    setInspForm({
      fecha_inspeccion: new Date().toISOString().split('T')[0],
      inspector: `${currentUser.nombres} ${currentUser.apellidos}`,
      resultado: 'Levantamiento conforme',
      observaciones: 'Verificación en campo conforme con distancias de seguridad según CNE Suministro.',
      evidencias_fotograficas: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'],
      estado_final: 'Cerrada'
    });
    setIsInspecModalOpen(true);
  };

  const handleSaveInspeccion = () => {
    if (!selectedDMSForInsp) return;
    try {
      storageService.addInspeccionCierre({
        id_dms: selectedDMSForInsp.id_dms,
        id_levantamiento: 'LEV-AUTO',
        cod_linea: selectedDMSForInsp.cod_linea,
        poste_n: selectedDMSForInsp.poste_n,
        fecha_inspeccion: inspForm.fecha_inspeccion || new Date().toISOString().split('T')[0],
        inspector: inspForm.inspector || currentUser.nombres,
        resultado: inspForm.resultado as any,
        observaciones: inspForm.observaciones || '',
        evidencias_fotograficas: inspForm.evidencias_fotograficas || [],
        estado_final: inspForm.resultado === 'Levantamiento conforme' ? 'Cerrada' : 'En Corrección'
      });
      showNotification('success', inspForm.resultado === 'Levantamiento conforme' ? 'DMS CERRADA DEFINITIVAMENTE con informe conforme.' : 'Inspección registrada con observaciones.');
      setIsInspecModalOpen(false);
      onRefresh();
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  // --- WIZARD FILE UPLOAD & COLUMN MAPPING ---
  const handleWizardFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { sheetNames, data } = await ExcelService.readExcelFile(file);
      const rows = data[sheetNames[0]];
      if (!rows || rows.length === 0) {
        showNotification('error', 'El archivo no contiene filas de datos.');
        return;
      }
      setRawFileRows(rows);
      const headers = Object.keys(rows[0]);
      setDetectedHeaders(headers);

      // Auto-match common OSINERGMIN headers
      const autoMap: Record<string, string> = {
        cod_linea: headers.find(h => /linea|cod/i.test(h)) || '',
        poste_n: headers.find(h => /poste|estructura|punto/i.test(h)) || '',
        codigo_dms: headers.find(h => /dms|codigo|id/i.test(h)) || '',
        descripcion: headers.find(h => /descrip|observ|detalle/i.test(h)) || '',
        fecha_identificacion: headers.find(h => /fecha/i.test(h)) || '',
        prioridad: headers.find(h => /prioridad|criticidad/i.test(h)) || '',
        fuente: headers.find(h => /fuente|origen|entidad/i.test(h)) || '',
        orden_servicio: headers.find(h => /orden|os|servicio/i.test(h)) || '',
        observaciones: headers.find(h => /obs|coment/i.test(h)) || ''
      };
      setColumnMapping(autoMap);
      setWizardStep(2); // Go to mapping step
    } catch (err: any) {
      showNotification('error', `Error al leer Excel: ${err.message}`);
    }
  };

  const handleConfirmMappingAndPreview = () => {
    const preview: DMSItem[] = [];
    const errors: string[] = [];

    rawFileRows.forEach((row, i) => {
      const lineVal = String(row[columnMapping.cod_linea] || selectedLine || 'L-6657C').trim();
      const posteVal = String(row[columnMapping.poste_n] || (i + 1)).trim();

      if (!lineVal) {
        errors.push(`Fila ${i + 1}: Código de línea vacío.`);
      }

      preview.push({
        id_dms: `DMS-IMP-${i + 1}`,
        cod_linea: lineVal,
        poste_n: posteVal,
        codigo_dms: String(row[columnMapping.codigo_dms] || `OSINERGMIN-${i + 1}`).trim(),
        descripcion: String(row[columnMapping.descripcion] || 'Deficiencia de Distancia Mínima de Seguridad').trim(),
        fecha_identificacion: String(row[columnMapping.fecha_identificacion] || new Date().toISOString().split('T')[0]).trim(),
        prioridad: 'PRIORITARIO',
        fuente: String(row[columnMapping.fuente] || 'OSINERGMIN').trim(),
        orden_servicio: String(row[columnMapping.orden_servicio] || 'OS-2026').trim(),
        estado: 'Pendiente',
        observaciones: String(row[columnMapping.observaciones] || 'Importado').trim(),
        evidencias: []
      });
    });

    setPreviewItems(preview);
    setWizardErrors(errors);
    setWizardStep(3); // Go to Preview & Validation step
  };

  const handleFinishImport = () => {
    const importedCount = storageService.importDMSBatch(previewItems);
    showNotification('success', `Importación exitosa: ${importedCount} registros de DMS cargados al sistema oficial.`);
    setIsImportWizardOpen(false);
    setWizardStep(1);
    setRawFileRows([]);
    onRefresh();
  };

  const handleExportExcel = () => {
    ExcelService.exportDMS(dmsList, levantamientos, inspecciones);
    showNotification('success', `Exportado libro Registro_DMS.xlsx con 3 hojas (DMS, Levantamientos, Cierres).`);
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
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Gestión Integral de Distancias Mínimas de Seguridad (DMS)
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                {dmsList.length} casos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Asistente de importación OSINERGMIN en 12 etapas, control de levantamientos y actas de cierre técnico.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser.rol !== 'Contratista' && (
              <button
                onClick={handleOpenNewDMSModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar DMS</span>
              </button>
            )}

            <button
              onClick={() => { setIsImportWizardOpen(true); setWizardStep(1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer"
            >
              <Upload className="h-4 w-4 text-cyan-400" />
              <span>Asistente Importación OSINERGMIN</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar Registro_DMS.xlsx</span>
            </button>
          </div>
        </div>

        <DriveModuleToolbar
          moduleKey={
            activeTab === 'LEVANTAMIENTOS'
              ? 'LEVANTAMIENTOS_DMS'
              : activeTab === 'INSPECCIONES'
              ? 'INSPECCIONES_DMS'
              : 'DMS'
          }
          onDataImported={onRefresh}
        />
      </div>

      {/* Internal Tabs (DMS / Levantamientos / Inspecciones) */}
      <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('DMS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'DMS'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>1. Registro DMS ({filteredDMS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LEVANTAMIENTOS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'LEVANTAMIENTOS'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowRight className="h-4 w-4" />
          <span>2. Levantamientos Contratista ({levantamientos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INSPECCIONES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'INSPECCIONES'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          <span>3. Inspecciones & Cierre ({inspecciones.length})</span>
        </button>
      </div>

      {/* Tab 1: DMS Table */}
      {activeTab === 'DMS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
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
                  {lineas.map(l => (
                    <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
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
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Levantamiento">En Levantamiento</option>
                  <option value="Levantada">Levantada</option>
                  <option value="Cerrada">Cerrada</option>
                </select>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar código DMS, poste, descripción..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
              />
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* DMS Table */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-3">CÓDIGO DMS</th>
                    <th className="px-3 py-3">LÍNEA</th>
                    <th className="px-3 py-3">POSTE/TRAMO</th>
                    <th className="px-4 py-3">DESCRIPCIÓN DE INFRACCIÓN</th>
                    <th className="px-3 py-3">PRIORIDAD</th>
                    <th className="px-3 py-3">FUENTE</th>
                    <th className="px-3 py-3">ESTADO</th>
                    <th className="px-4 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredDMS.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        No se encontraron casos de DMS.
                      </td>
                    </tr>
                  ) : (
                    filteredDMS.map((item) => (
                      <tr key={item.id_dms} className="hover:bg-slate-750/70 transition">
                        <td className="px-3 py-2.5 font-mono text-amber-300 font-bold">{item.codigo_dms}</td>
                        <td className="px-3 py-2.5 font-mono text-white">{item.cod_linea}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-white">{item.poste_n}</td>
                        <td className="px-4 py-2.5 max-w-sm">
                          <div className="text-slate-200">{item.descripcion}</div>
                          {item.orden_servicio && (
                            <span className="text-[10px] text-cyan-400 font-mono">OS: {item.orden_servicio}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">
                            {item.prioridad}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{item.fuente}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.estado === 'Cerrada'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : item.estado === 'Levantada'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Action to perform Levantamiento */}
                            {item.estado !== 'Cerrada' && (
                              <button
                                onClick={() => handleOpenLevantamiento(item)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition"
                                title="Registrar Levantamiento Contratista"
                              >
                                Registrar Levantamiento
                              </button>
                            )}

                            {/* Action for Supervisor to Inspect and Close */}
                            {currentUser.rol !== 'Contratista' && item.estado === 'Levantada' && (
                              <button
                                onClick={() => handleOpenInspeccion(item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer"
                                title="Inspección y Cierre Técnico"
                              >
                                Inspeccionar / Cerrar
                              </button>
                            )}

                            {currentUser.rol !== 'Contratista' && (
                              <button
                                onClick={() => setDmsToDelete(item)}
                                className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-red-900/70 text-red-400 transition cursor-pointer"
                                title="Eliminar caso DMS (borrado lógico)"
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
        </div>
      )}

      {/* Tab 2: Levantamientos Realizados */}
      {activeTab === 'LEVANTAMIENTOS' && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-white">Historial de Levantamientos Registrados por Contratistas</h2>
            <button
              onClick={() => {
                ExcelService.exportLevantamientosDMS(levantamientos);
                showNotification('success', `Exportados ${levantamientos.length} levantamientos a Levantamientos_DMS.xlsx.`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Exportar Levantamientos XLSX</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-3 py-3">ID LEVANTAMIENTO</th>
                  <th className="px-3 py-3">LÍNEA / POSTE</th>
                  <th className="px-3 py-3">FECHA</th>
                  <th className="px-4 py-3">DESCRIPCIÓN DEL TRABAJO</th>
                  <th className="px-3 py-3">ORDEN SERVICIO</th>
                  <th className="px-3 py-3">CONTRATISTA</th>
                  <th className="px-3 py-3">FOTOS</th>
                  <th className="px-3 py-3">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {levantamientos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      No hay levantamientos registrados todavía.
                    </td>
                  </tr>
                ) : (
                  levantamientos.map((lev) => (
                    <tr key={lev.id_levantamiento}>
                      <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{lev.id_levantamiento}</td>
                      <td className="px-3 py-2.5 font-mono text-white">{lev.cod_linea} P-{lev.poste_n}</td>
                      <td className="px-3 py-2.5 text-slate-400">{lev.fecha_ejecucion}</td>
                      <td className="px-4 py-2.5 text-slate-200">{lev.descripcion_trabajo}</td>
                      <td className="px-3 py-2.5 font-mono text-cyan-400">{lev.orden_servicio}</td>
                      <td className="px-3 py-2.5">{lev.contratista_responsable}</td>
                      <td className="px-3 py-2.5">
                        {lev.fotografias && lev.fotografias.length > 0 && (
                          <button
                            onClick={() => onOpenPhoto && onOpenPhoto(lev.fotografias[0], `Levantamiento DMS ${lev.id_levantamiento}`)}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {lev.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Inspecciones y Cierre */}
      {activeTab === 'INSPECCIONES' && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-white">Actas de Inspección y Cierre Definitivo de DMS</h2>
            <button
              onClick={() => {
                ExcelService.exportInspeccionesDMS(inspecciones);
                showNotification('success', `Exportadas ${inspecciones.length} inspecciones a Inspecciones_Cierre_DMS.xlsx.`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Exportar Inspecciones XLSX</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-3 py-3">ID INSPECCIÓN</th>
                  <th className="px-3 py-3">LÍNEA / POSTE</th>
                  <th className="px-3 py-3">FECHA</th>
                  <th className="px-3 py-3">INSPECTOR SUPERVISOR</th>
                  <th className="px-4 py-3">RESULTADO</th>
                  <th className="px-4 py-3">OBSERVACIONES</th>
                  <th className="px-3 py-3">ESTADO FINAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {inspecciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No hay inspecciones de cierre concluidas aún.
                    </td>
                  </tr>
                ) : (
                  inspecciones.map((insp) => (
                    <tr key={insp.id_inspeccion_cierre}>
                      <td className="px-3 py-2.5 font-mono text-emerald-300 font-bold">{insp.id_inspeccion_cierre}</td>
                      <td className="px-3 py-2.5 font-mono text-white">{insp.cod_linea} P-{insp.poste_n}</td>
                      <td className="px-3 py-2.5 text-slate-400">{insp.fecha_inspeccion}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-200">{insp.inspector}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          insp.resultado === 'Levantamiento conforme'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}>
                          {insp.resultado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{insp.observaciones}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-200">
                          {insp.estado_final}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Nuevo Registro DMS */}
      {isNewDMSModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
                Registrar Nuevo Caso de DMS
              </h3>
              <button onClick={() => setIsNewDMSModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">LÍNEA <span className="text-red-400">*</span></label>
                <select
                  value={newDMS.cod_linea || ''}
                  onChange={(e) => {
                    const newCod = e.target.value;
                    const newPostes = getPostesForLine(estructuras, newCod);
                    setNewDMS({ ...newDMS, cod_linea: newCod, poste_n: newPostes[0] || '' });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                >
                  {lineas.map(l => (
                    <option key={l.id_linea || l.cod_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  POSTE N° <span className="text-red-400">*</span>
                  {availablePostesForNewDMS.length > 0 && (
                    <span className="text-[10px] text-cyan-400 ml-1 font-normal font-sans">
                      ({availablePostesForNewDMS.length} en plantilla)
                    </span>
                  )}
                </label>
                <select
                  value={newDMS.poste_n || ''}
                  onChange={(e) => setNewDMS({ ...newDMS, poste_n: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  required
                >
                  <option value="">-- Seleccionar Poste --</option>
                  {availablePostesForNewDMS.map(p => (
                    <option key={p} value={p}>Poste {p}</option>
                  ))}
                  {newDMS.poste_n && !availablePostesForNewDMS.includes(newDMS.poste_n) && (
                    <option value={newDMS.poste_n}>Poste {newDMS.poste_n} (Actual)</option>
                  )}
                </select>
                {availablePostesForNewDMS.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    No se encontraron postes en la plantilla para la línea {newDMS.cod_linea}.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CÓDIGO DE DMS (OSINERGMIN)</label>
                <input
                  type="text"
                  value={newDMS.codigo_dms || ''}
                  onChange={(e) => setNewDMS({ ...newDMS, codigo_dms: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono"
                  placeholder="OSINERGMIN-PIU-0199"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">PRIORIDAD</label>
                <select
                  value={newDMS.prioridad || 'PRIORITARIO'}
                  onChange={(e) => setNewDMS({ ...newDMS, prioridad: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                >
                  <option value="PRIORITARIO">PRIORITARIO</option>
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MEDIO</option>
                  <option value="BAJO">BAJO</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">DESCRIPCIÓN DE LA INFRACCIÓN DMS <span className="text-red-400">*</span></label>
                <textarea
                  value={newDMS.descripcion || ''}
                  onChange={(e) => setNewDMS({ ...newDMS, descripcion: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Predio o cartel no cumple con distancia de seguridad según CNE..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">FUENTE</label>
                <input
                  type="text"
                  value={newDMS.fuente || 'OSINERGMIN'}
                  onChange={(e) => setNewDMS({ ...newDMS, fuente: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ORDEN DE SERVICIO ASOCIADA</label>
                <input
                  type="text"
                  value={newDMS.orden_servicio || ''}
                  onChange={(e) => setNewDMS({ ...newDMS, orden_servicio: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  placeholder="OS-88491-2026"
                />
              </div>
            </div>

            <AuditFieldsBlock currentUser={currentUser} isNew={true} className="mt-4" />

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsNewDMSModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewDMS}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30"
              >
                Guardar Caso DMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Registrar Levantamiento (Contratista) */}
      {isLevantamientoModalOpen && selectedDMSForLev && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-cyan-400" />
                Registrar Levantamiento de DMS ({selectedDMSForLev.codigo_dms})
              </h3>
              <button onClick={() => setIsLevantamientoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="font-semibold text-amber-300">Infracción original:</div>
                <div className="text-slate-300 mt-1">{selectedDMSForLev.descripcion}</div>
                <div className="text-[10px] text-slate-500 mt-1">Línea: {selectedDMSForLev.cod_linea} | Poste: {selectedDMSForLev.poste_n}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  DESCRIPCIÓN DEL TRABAJO DE LEVANTAMIENTO REALIZADO <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={levForm.descripcion_trabajo || ''}
                  onChange={(e) => setLevForm({ ...levForm, descripcion_trabajo: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Detalle de demolición de saliente, retiro de cartel, cambio de traza..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">ORDEN DE SERVICIO</label>
                  <input
                    type="text"
                    value={levForm.orden_servicio || ''}
                    onChange={(e) => setLevForm({ ...levForm, orden_servicio: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">FECHA DE EJECUCIÓN</label>
                  <input
                    type="date"
                    value={levForm.fecha_ejecucion || ''}
                    onChange={(e) => setLevForm({ ...levForm, fecha_ejecucion: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">FOTOGRAFÍAS DE EVIDENCIA (Posteriores)</label>
                <input
                  type="text"
                  value={levForm.fotografias?.[0] || ''}
                  onChange={(e) => setLevForm({ ...levForm, fotografias: [e.target.value] })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  placeholder="https://drive.google.com/... o enlace de evidencia"
                />
              </div>
            </div>

            <AuditFieldsBlock currentUser={currentUser} isNew={true} className="mt-4" />

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsLevantamientoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLevantamiento}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
              >
                Guardar Levantamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Inspección y Cierre Técnico (Supervisor/Admin Only) */}
      {isInspecModalOpen && selectedDMSForInsp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Inspección de Verificación y Cierre Definitivo
              </h3>
              <button onClick={() => setIsInspecModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-amber-300 font-semibold">{selectedDMSForInsp.codigo_dms} - {selectedDMSForInsp.cod_linea}</div>
                <div className="text-slate-300 mt-1">{selectedDMSForInsp.descripcion}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">RESULTADO DE INSPECCIÓN EN CAMPO <span className="text-red-400">*</span></label>
                <select
                  value={inspForm.resultado || 'Levantamiento conforme'}
                  onChange={(e) => setInspForm({ ...inspForm, resultado: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                >
                  <option value="Levantamiento conforme">✓ Levantamiento Conforme (Permite Cerrar DMS)</option>
                  <option value="Levantamiento no conforme">✗ Levantamiento No Conforme</option>
                  <option value="Requiere nueva intervención">⚠ Requiere Nueva Intervención</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">INSPECTOR SUPERVISOR RESPONSABLE</label>
                <input
                  type="text"
                  value={inspForm.inspector || ''}
                  onChange={(e) => setInspForm({ ...inspForm, inspector: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES TÉCNICAS Y MEDICIONES DE DISTANCIA</label>
                <textarea
                  value={inspForm.observaciones || ''}
                  onChange={(e) => setInspForm({ ...inspForm, observaciones: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Distancia medida con telémetro láser: 6.20 metros. Cumple con código nacional de electricidad..."
                />
              </div>
            </div>

            <AuditFieldsBlock currentUser={currentUser} isNew={true} className="mt-4" />

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsInspecModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveInspeccion}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
              >
                Guardar y Cerrar DMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistente de Importación 12 Pasos OSINERGMIN */}
      {isImportWizardOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-amber-400" />
                  Asistente de Importación de DMS (OSINERGMIN)
                </h3>
                <span className="text-xs text-slate-400">Paso {wizardStep} de 3 • Mapeo flexible de columnas</span>
              </div>
              <button onClick={() => setIsImportWizardOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: Upload File */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-4 text-center">
                <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-10 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    id="wizardFileInput"
                    onChange={handleWizardFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="wizardFileInput" className="cursor-pointer block">
                    <FileSpreadsheet className="h-14 w-14 text-emerald-400 mx-auto mb-3" />
                    <span className="text-sm font-bold text-amber-300 hover:underline block">
                      Selecciona o arrastra el archivo de DMS de OSINERGMIN (.xlsx)
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      El asistente detectará automáticamente los encabezados para relacionar las columnas.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-2 text-xs">
                <p className="text-slate-300">
                  Relaciona las columnas del archivo Excel importado con los campos oficiales de DMS:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {Object.keys(columnMapping).map((targetField) => (
                    <div key={targetField} className="flex items-center justify-between gap-2 p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="font-mono text-cyan-300 font-semibold uppercase text-[11px] truncate max-w-[150px]">
                        {targetField}
                      </span>
                      <select
                        value={columnMapping[targetField]}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [targetField]: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs max-w-[180px]"
                      >
                        <option value="">(No asignado)</option>
                        {detectedHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleConfirmMappingAndPreview}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                  >
                    Continuar a Previsualización &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Confirm */}
            {wizardStep === 3 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Registros válidos para importar: <strong className="text-emerald-400">{previewItems.length}</strong>
                  </span>
                  {wizardErrors.length > 0 && (
                    <span className="text-red-400 font-bold">{wizardErrors.length} advertencias</span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 font-bold text-slate-400 text-[10px]">
                      <tr>
                        <th className="px-3 py-2">CÓDIGO</th>
                        <th className="px-3 py-2">LÍNEA</th>
                        <th className="px-3 py-2">POSTE</th>
                        <th className="px-3 py-2">DESCRIPCIÓN</th>
                        <th className="px-3 py-2">FUENTE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewItems.slice(0, 10).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-mono text-amber-300">{item.codigo_dms}</td>
                          <td className="px-3 py-1.5 font-mono">{item.cod_linea}</td>
                          <td className="px-3 py-1.5 font-mono">{item.poste_n}</td>
                          <td className="px-3 py-1.5 truncate max-w-xs">{item.descripcion}</td>
                          <td className="px-3 py-1.5">{item.fuente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleFinishImport}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                  >
                    Confirmar e Importar al Sistema Oficial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Confirmación Soft Delete DMS */}
      {dmsToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Confirmar Eliminación Lógica de DMS</h3>
                <p className="text-xs text-slate-400 mt-1">
                  El registro se marcará como <strong className="text-rose-300">Eliminado</strong> en auditoría y se sincronizará con Google Drive.
                </p>
              </div>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="text-amber-300 font-mono font-bold">{dmsToDelete.codigo_dms}</div>
              <div className="text-slate-300">Línea {dmsToDelete.cod_linea} • Poste {dmsToDelete.poste_n}</div>
              <div className="text-slate-400 line-clamp-2">{dmsToDelete.descripcion}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDmsToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteDMS}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Sí, eliminar caso DMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
