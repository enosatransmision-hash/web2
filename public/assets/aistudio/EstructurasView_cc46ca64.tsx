import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  FileSpreadsheet,
  Upload,
  TowerControl as Tower,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  History,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Estructura, LineaSubtransmision, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';

interface EstructurasViewProps {
  estructuras: Estructura[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefresh: () => void;
  onViewActivityHistory?: (codLinea: string, posteN: string) => void;
}

export const EstructurasView: React.FC<EstructurasViewProps> = ({
  estructuras,
  lineas,
  currentUser,
  selectedLine,
  onSelectLine,
  onRefresh,
  onViewActivityHistory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('TODOS');
  const [filterArmado, setFilterArmado] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Edit / Insert Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [shiftSubsequent, setShiftSubsequent] = useState(true);
  const [editingStruct, setEditingStruct] = useState<Partial<Estructura> | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Distinct Armados & Materials for filter
  const distinctArmados = useMemo(() => {
    const set = new Set<string>();
    estructuras.forEach(e => { if (e.tipo_armado) set.add(e.tipo_armado.trim()); });
    return Array.from(set).sort();
  }, [estructuras]);

  const distinctMaterials = useMemo(() => {
    const set = new Set<string>();
    estructuras.forEach(e => { if (e.poste_material) set.add(e.poste_material.trim().toLowerCase()); });
    return Array.from(set).sort();
  }, [estructuras]);

  // Filtered List
  const filteredList = useMemo(() => {
    return estructuras.filter(st => {
      const matchLine = selectedLine === 'TODAS' || st.cod_linea === selectedLine;
      const matchSearch =
        st.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.tipo_armado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.poste_material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cruceta_material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.aislador_material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.conductor_calibre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMat = filterMaterial === 'TODOS' || st.poste_material.toLowerCase() === filterMaterial.toLowerCase();
      const matchArm = filterArmado === 'TODOS' || st.tipo_armado.trim() === filterArmado;

      return matchLine && matchSearch && matchMat && matchArm;
    });
  }, [estructuras, selectedLine, searchTerm, filterMaterial, filterArmado]);

  // Paginated List
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Handlers
  const handleStartNew = () => {
    if (currentUser.rol === 'Contratista') {
      showNotification('error', 'Permiso denegado: El contratista no puede registrar estructuras directamente.');
      return;
    }
    const targetLine = selectedLine === 'TODAS' ? (lineas[0]?.cod_linea || 'L-6657C') : selectedLine;
    const existingInLine = estructuras.filter(e => e.cod_linea === targetLine);
    const nextNumber = existingInLine.length + 1;

    setEditingStruct({
      cod_linea: targetLine,
      poste_n: String(nextNumber),
      tipo_armado: 'A',
      poste_cantidad: '1',
      poste_material: 'madera',
      cruceta_material: 'madera',
      mensula_material: '',
      riostra_o_amarre_material: '',
      aislador_material: 'polimérico',
      aislador_cant: '6',
      aislador_tipo: '',
      conductor_material: 'AAAC',
      conductor_calibre: '240',
      conductor_n_fases: '3',
      estado: 'Operativo',
      observaciones: ''
    });
    setIsNew(true);
    setShiftSubsequent(true);
    setIsEditing(true);
  };

  const handleStartEdit = (st: Estructura) => {
    setEditingStruct({ ...st });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleSaveStruct = () => {
    if (!editingStruct || !editingStruct.cod_linea || !editingStruct.poste_n) {
      showNotification('error', 'Código de Línea y POSTE_N son obligatorios.');
      return;
    }

    if (isNew) {
      const res = storageService.insertStructureWithShift(
        editingStruct.cod_linea,
        editingStruct.poste_n,
        {
          tipo_armado: editingStruct.tipo_armado || 'A',
          poste_cantidad: editingStruct.poste_cantidad || '1',
          poste_material: editingStruct.poste_material || '',
          cruceta_material: editingStruct.cruceta_material || '',
          mensula_material: editingStruct.mensula_material || '',
          riostra_o_amarre_material: editingStruct.riostra_o_amarre_material || '',
          aislador_material: editingStruct.aislador_material || '',
          aislador_cant: editingStruct.aislador_cant || '',
          aislador_tipo: editingStruct.aislador_tipo || '',
          conductor_material: editingStruct.conductor_material || 'AAAC',
          conductor_calibre: editingStruct.conductor_calibre || '240',
          conductor_n_fases: editingStruct.conductor_n_fases || '3',
          estado: editingStruct.estado || 'Operativo',
          observaciones: editingStruct.observaciones || ''
        },
        shiftSubsequent
      );
      if (res.success) {
        showNotification('success', res.message);
        setIsEditing(false);
        setEditingStruct(null);
        onRefresh();
      } else {
        showNotification('error', res.message);
      }
    } else {
      const res = storageService.updateEstructura(editingStruct.id_poste!, editingStruct);
      if (res.success) {
        showNotification('success', res.message);
        setIsEditing(false);
        setEditingStruct(null);
        onRefresh();
      } else {
        showNotification('error', res.message);
      }
    }
  };

  const handleDeleteStruct = (st: Estructura) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador tiene permiso para eliminar estructuras.');
      return;
    }
    const confirm = window.confirm(
      `¿Desea eliminar la estructura ${st.poste_n} de la línea ${st.cod_linea}?\n` +
      `Se aplicará el REORDENAMIENTO AUTOMÁTICO desplazando -1 los postes posteriores.`
    );
    if (confirm) {
      const res = storageService.deleteStructureWithShift(st.cod_linea, st.poste_n, true);
      if (res.success) {
        showNotification('success', res.message);
        onRefresh();
      } else {
        showNotification('error', res.message);
      }
    }
  };

  const handleExportExcel = () => {
    ExcelService.exportEstructuras(filteredList);
    showNotification('success', `Exportadas ${filteredList.length} estructuras a Registro_Estructuras.xlsx.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Leyendo archivo Excel...');
      const { sheetNames, data } = await ExcelService.readExcelFile(file);
      const firstSheet = sheetNames[0];
      const rows = data[firstSheet];

      if (!rows || rows.length === 0) {
        setImportStatus('Error: La hoja seleccionada no contiene filas.');
        return;
      }

      setImportStatus(`Procesando ${rows.length} filas...`);
      const newStructures: Estructura[] = rows.map((r, i) => ({
        id_poste: String(r.ID_POSTE || ('IMP-' + (i + 1))),
        cod_linea: String(r.COD_LINEA || r.Cod_Linea || selectedLine || 'L-6657C'),
        poste_n: String(r.POSTE_N || r.Poste_N || r['POSTE N°'] || i + 1),
        tipo_armado: String(r.TIPO_ARMADO || r.Tipo_Armado || 'A'),
        poste_cantidad: String(r.POSTE_CANTIDAD || '1'),
        poste_material: String(r.POSTE_MATERIAL || r['POSTE _MATERIAL'] || ''),
        cruceta_material: String(r.CRUCETA_MATERIAL || ''),
        mensula_material: String(r.MENSULA_MATERIAL || ''),
        riostra_o_amarre_material: String(r.RIOSTRA_O_AMARRE_MATERIAL || ''),
        aislador_material: String(r.AISLADOR_MATERIAL || 'polimérico'),
        aislador_cant: String(r.AISLADOR_CANT || ''),
        aislador_tipo: String(r.AISLADOR_TIPO || ''),
        conductor_material: String(r.CONDUCTOR_MATERIAL || 'AAAC'),
        conductor_calibre: String(r.CONDUCTOR_CALIBRE || '240'),
        conductor_n_fases: String(r.CONDUCTOR_N_FASES || '3'),
        estado: 'Operativo',
        observaciones: 'Importado de archivo ' + file.name
      }));

      const res = storageService.importEstructurasBatch(newStructures, 'merge');
      showNotification('success', res.message);
      setIsImportModalOpen(false);
      setImportStatus(null);
      onRefresh();
    } catch (err: any) {
      setImportStatus(`Error al importar: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
          notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : 'bg-red-950/80 border-red-700 text-red-200'
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

      {/* Top Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tower className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Planilla de Estructuras (Postes)</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              {filteredList.length.toLocaleString()} estructuras
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión técnica, armados, conductores, aisladores y reordenamiento automático de POSTE_N.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.rol !== 'Contratista' && (
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Estructura (con Desplazamiento)</span>
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-cyan-400" />
            <span>Importar XLSX</span>
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

      {/* Insert / Edit Form Modal */}
      {isEditing && editingStruct && (
        <div className="bg-slate-800/95 border-2 border-blue-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tower className="h-5 w-5 text-blue-400" />
                {isNew ? 'Registrar Nueva Estructura con Reordenamiento' : `Editar Estructura: ${editingStruct.cod_linea} - Poste ${editingStruct.poste_n}`}
              </h2>
              <p className="text-xs text-slate-400">
                {isNew
                  ? 'Al elegir un POSTE_N existente, el sistema correrá automáticamente los números posteriores de la línea.'
                  : 'Modificación de características estructurales y aislamiento.'}
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                LÍNEA DE SUBTRANSMISIÓN <span className="text-red-400">*</span>
              </label>
              <select
                value={editingStruct.cod_linea || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, cod_linea: e.target.value })}
                disabled={!isNew}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:ring-2 focus:ring-blue-500"
              >
                {lineas.map(l => (
                  <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                POSTE_N <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingStruct.poste_n || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, poste_n: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 1, 15, 24D"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TIPO_ARMADO</label>
              <input
                type="text"
                value={editingStruct.tipo_armado || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, tipo_armado: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: A, AD, CD, A1, A2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">POSTE_CANTIDAD</label>
              <input
                type="text"
                value={editingStruct.poste_cantidad || '1'}
                onChange={(e) => setEditingStruct({ ...editingStruct, poste_cantidad: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="1, 2, 3"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">POSTE_MATERIAL</label>
              <input
                type="text"
                value={editingStruct.poste_material || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, poste_material: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="madera, CAC, celosía, FV"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CRUCETA_MATERIAL</label>
              <input
                type="text"
                value={editingStruct.cruceta_material || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, cruceta_material: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="madera, metálica, Concreto"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">RIOSTRA / AMARRE</label>
              <input
                type="text"
                value={editingStruct.riostra_o_amarre_material || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, riostra_o_amarre_material: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="madera, metálica, F° G°"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">AISLADOR_MATERIAL</label>
              <input
                type="text"
                value={editingStruct.aislador_material || ''}
                onChange={(e) => setEditingStruct({ ...editingStruct, aislador_material: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="polimérico, porcelana, mixto"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CONDUCTOR_MATERIAL</label>
              <input
                type="text"
                value={editingStruct.conductor_material || 'AAAC'}
                onChange={(e) => setEditingStruct({ ...editingStruct, conductor_material: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CONDUCTOR_CALIBRE</label>
              <input
                type="text"
                value={editingStruct.conductor_calibre || '240'}
                onChange={(e) => setEditingStruct({ ...editingStruct, conductor_calibre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="240, 120, 95"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingStruct.estado || 'Operativo'}
                onChange={(e) => setEditingStruct({ ...editingStruct, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Operativo">Operativo</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Desactivado">Desactivado</option>
              </select>
            </div>

            {isNew && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="shiftChk"
                  checked={shiftSubsequent}
                  onChange={(e) => setShiftSubsequent(e.target.checked)}
                  className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="shiftChk" className="text-xs text-cyan-300 font-semibold cursor-pointer">
                  Desplazar orden de postes subsiguientes (+1)
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveStruct}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Estructura</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Line Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => {
                onSelectLine(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas las Líneas ({estructuras.length} postes)</option>
              {lineas.map(l => {
                const count = estructuras.filter(e => e.cod_linea === l.cod_linea).length;
                return (
                  <option key={l.id_linea} value={l.cod_linea}>
                    {l.cod_linea} - {l.nodo_salida} a {l.nodo_llegada} ({count} postes)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Material Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Material:</span>
            <select
              value={filterMaterial}
              onChange={(e) => { setFilterMaterial(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5"
            >
              <option value="TODOS">Todos</option>
              {distinctMaterials.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Armado Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Armado:</span>
            <select
              value={filterArmado}
              onChange={(e) => { setFilterArmado(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5"
            >
              <option value="TODOS">Todos</option>
              {distinctArmados.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por poste N°, material, aislador..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Table of Structures */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3">LÍNEA</th>
                <th className="px-3 py-3">POSTE N°</th>
                <th className="px-3 py-3">ARMADO</th>
                <th className="px-2 py-3">CANT</th>
                <th className="px-3 py-3">MATERIAL POSTE</th>
                <th className="px-3 py-3">CRUCETA</th>
                <th className="px-3 py-3">RIOSTRA/AMARRE</th>
                <th className="px-3 py-3">AISLADOR</th>
                <th className="px-3 py-3">CONDUCTOR</th>
                <th className="px-2 py-3">ESTADO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se encontraron estructuras con los filtros especificados.
                  </td>
                </tr>
              ) : (
                paginatedList.map((st) => (
                  <tr key={st.id_poste} className="hover:bg-slate-750/70 transition">
                    <td className="px-3 py-2.5 font-mono font-bold text-cyan-300">
                      {st.cod_linea}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-extrabold text-white bg-slate-900/40 px-2 rounded">
                      {st.poste_n}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-200 border border-slate-700 font-mono">
                        {st.tipo_armado}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold text-slate-300">{st.poste_cantidad}</td>
                    <td className="px-3 py-2.5 capitalize">{st.poste_material}</td>
                    <td className="px-3 py-2.5 capitalize text-slate-400">{st.cruceta_material || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-400">{st.riostra_o_amarre_material || '-'}</td>
                    <td className="px-3 py-2.5 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        st.aislador_material.toLowerCase().includes('polim')
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {st.aislador_material} {st.aislador_cant ? `(${st.aislador_cant})` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-sky-300">
                      {st.conductor_material} {st.conductor_calibre} ({st.conductor_n_fases}F)
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        st.estado === 'Operativo'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {st.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onViewActivityHistory && (
                          <button
                            onClick={() => onViewActivityHistory(st.cod_linea, st.poste_n)}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300"
                            title="Historial de actividades del poste"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {currentUser.rol !== 'Contratista' && (
                          <button
                            onClick={() => handleStartEdit(st)}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                            title="Editar estructura"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {currentUser.rol === 'Administrador' && (
                          <button
                            onClick={() => handleDeleteStruct(st)}
                            className="p-1 rounded bg-slate-700 hover:bg-red-950 text-red-400"
                            title="Eliminar estructura (reordenando postes)"
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

        {/* Pagination Controls */}
        <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            Mostrando página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({filteredList.length} estructuras)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-cyan-300">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-cyan-400" />
                Importar Planilla de Estructuras (Excel XLSX)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Selecciona un archivo XLSX con columnas: <code className="text-cyan-300">ID_POSTE, COD_LINEA, POSTE_N, TIPO_ARMADO, POSTE_MATERIAL, CRUCETA_MATERIAL, AISLADOR_MATERIAL, CONDUCTOR_CALIBRE</code>.
            </p>

            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500 transition cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excelUploadInput"
              />
              <label htmlFor="excelUploadInput" className="cursor-pointer block">
                <FileSpreadsheet className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-cyan-400 hover:underline">
                  Haz clic para seleccionar archivo Excel
                </span>
                <span className="block text-[11px] text-slate-400 mt-1">Soporta formatos XLSX, XLS</span>
              </label>
            </div>

            {importStatus && (
              <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-mono">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
