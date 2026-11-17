import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Download,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  TowerControl as Tower,
  Layers,
  PowerOff
} from 'lucide-react';
import { LineaSubtransmision, Usuario, ConfiguracionDrive } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import { ExcelService } from '../services/excelService';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface LineasViewProps {
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  configDrive: ConfiguracionDrive;
  onRefresh: () => void;
  onSelectLineDetail?: (codLinea: string) => void;
}

export const LineasView: React.FC<LineasViewProps> = ({
  lineas,
  currentUser,
  configDrive,
  onRefresh,
  onSelectLineDetail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTension, setFilterTension] = useState('TODAS');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [isEditing, setIsEditing] = useState(false);
  const [editingLinea, setEditingLinea] = useState<Partial<LineaSubtransmision> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lineaToDelete, setLineaToDelete] = useState<{ linea: LineaSubtransmision; structsCount: number } | null>(null);

  // Search & Filter
  const filteredLineas = useMemo(() => {
    return lineas.filter(linea => {
      const matchSearch =
        linea.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linea.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linea.nodo_salida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linea.nodo_llegada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linea.celda_salida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linea.celda_llegada.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTension = filterTension === 'TODAS' || String(linea.tension_nom) === filterTension;
      const matchEstado = filterEstado === 'TODOS' || linea.estado === filterEstado;

      return matchSearch && matchTension && matchEstado;
    });
  }, [lineas, searchTerm, filterTension, filterEstado]);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleStartNew = () => {
    if (currentUser.rol === 'Contratista') {
      showNotification('error', 'Permiso denegado: El contratista no puede crear nuevas líneas.');
      return;
    }
    setEditingLinea({
      cod_linea: 'L-',
      nombre: 'LST - S.E. Salida - S.E. Llegada',
      tipo_sistema: 'I',
      tension_nom: '60',
      nodo_salida: '',
      nodo_llegada: '',
      celda_salida: '',
      celda_llegada: '',
      estado: 'Activo'
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (linea: LineaSubtransmision) => {
    if (currentUser.rol === 'Contratista') {
      showNotification('error', 'Permiso denegado: Los contratistas no tienen autorización para modificar líneas.');
      return;
    }
    setEditingLinea({ ...linea });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingLinea(null);
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editingLinea || !editingLinea.cod_linea || !editingLinea.nombre) {
      showNotification('error', 'Por favor complete el Código de Línea y el Nombre.');
      return;
    }

    if (isNew) {
      const res = storageService.addLinea({
        cod_linea: editingLinea.cod_linea.trim(),
        nombre: editingLinea.nombre.trim(),
        tipo_sistema: editingLinea.tipo_sistema || 'I',
        tension_nom: editingLinea.tension_nom || '60',
        nodo_salida: editingLinea.nodo_salida || '',
        nodo_llegada: editingLinea.nodo_llegada || '',
        celda_salida: editingLinea.celda_salida || '',
        celda_llegada: editingLinea.celda_llegada || '',
        estado: editingLinea.estado || 'Activo'
      });
      if (res.success) {
        showNotification('success', res.message);
        handleCancel();
        onRefresh();
        // Also trigger async sync to drive
        await GoogleDriveService.pushLineasToDrive();
      } else {
        showNotification('error', res.message);
      }
    } else {
      const res = storageService.updateLinea(editingLinea.cod_linea!, {
        nombre: editingLinea.nombre,
        tipo_sistema: editingLinea.tipo_sistema,
        tension_nom: editingLinea.tension_nom,
        nodo_salida: editingLinea.nodo_salida,
        nodo_llegada: editingLinea.nodo_llegada,
        celda_salida: editingLinea.celda_salida,
        celda_llegada: editingLinea.celda_llegada,
        estado: editingLinea.estado
      });
      if (res.success) {
        showNotification('success', res.message);
        handleCancel();
        onRefresh();
        await GoogleDriveService.pushLineasToDrive();
      } else {
        showNotification('error', res.message);
      }
    }
  };

  const handleDeleteOrDeactivate = (linea: LineaSubtransmision) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede desactivar o eliminar líneas.');
      return;
    }

    const structsCount = storageService.getEstructuras(linea.cod_linea).length;
    setLineaToDelete({ linea, structsCount });
  };

  const handleConfirmDeleteOrDeactivate = () => {
    if (!lineaToDelete) return;
    const res = storageService.deactivateOrDeleteLinea(lineaToDelete.linea.cod_linea, false);
    if (res.success) {
      showNotification(res.actionTaken === 'DESACTIVADA' ? 'warning' : 'success', res.message);
      onRefresh();
    } else {
      showNotification('error', res.message);
    }
    setLineaToDelete(null);
  };

  const handleSyncDrive = async () => {
    setIsSyncing(true);
    try {
      const res = await GoogleDriveService.pullLineasFromDrive();
      showNotification('success', res.message);
      onRefresh();
    } catch (err: any) {
      showNotification('error', `Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    ExcelService.exportLineas(filteredLineas);
    showNotification('success', `Descargado archivo Registro_Lineas.xlsx con ${filteredLineas.length} registros.`);
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
          notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : notification.type === 'warning'
            ? 'bg-amber-950/80 border-amber-700 text-amber-200'
            : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
            {notification.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-400" />}
            {notification.type === 'error' && <ShieldAlert className="h-5 w-5 text-red-400" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Líneas de Subtransmisión</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                {filteredLineas.length} de {lineas.length} líneas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Archivo oficial vinculado: <span className="font-mono text-cyan-300">1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y</span>
            </p>
          </div>

          {/* Buttons Action Group */}
          <div className="flex flex-wrap items-center gap-2">
            {currentUser.rol !== 'Contratista' && (
              <button
                onClick={handleStartNew}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Línea</span>
              </button>
            )}

            <button
              onClick={handleSyncDrive}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Actualizar desde Drive</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>

            <a
              href={configDrive.sheet_lineas_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              title="Abrir en Google Sheets"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Google Sheets</span>
            </a>
          </div>
        </div>

        <DriveModuleToolbar moduleKey="LINEAS" onDataImported={onRefresh} />
      </div>

      {/* Edit / New Modal or Inline Form */}
      {isEditing && editingLinea && (
        <div className="bg-slate-800/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isNew ? <Plus className="h-5 w-5 text-cyan-400" /> : <Edit2 className="h-5 w-5 text-amber-400" />}
                {isNew ? 'Registrar Nueva Línea de Subtransmisión' : `Editar Línea: ${editingLinea.cod_linea}`}
              </h2>
              <p className="text-xs text-slate-400">
                Los cambios se registrarán en la hoja oficial de Google Drive y en el archivo Historial_Modificaciones.xlsx.
              </p>
            </div>
            <button onClick={handleCancel} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                COD_LINEA <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingLinea.cod_linea || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, cod_linea: e.target.value.toUpperCase() })}
                disabled={!isNew}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-cyan-300 focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
                placeholder="Ej: L-6650"
              />
              <span className="text-[10px] text-slate-500">Tratado como texto alfanumérico estricto.</span>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                NOMBRE <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingLinea.nombre || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, nombre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: LST - S.E. Piura Oeste - S.E. Piura Centro"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">TENSION_NOM (kV)</label>
              <select
                value={editingLinea.tension_nom || '60'}
                onChange={(e) => setEditingLinea({ ...editingLinea, tension_nom: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="60">60 kV</option>
                <option value="33">33 kV</option>
                <option value="10">10 kV</option>
                <option value="138">138 kV</option>
                <option value="220">220 kV</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">TIPO_SISTEMA</label>
              <input
                type="text"
                value={editingLinea.tipo_sistema || 'I'}
                onChange={(e) => setEditingLinea({ ...editingLinea, tipo_sistema: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: I"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">NODO_SALIDA</label>
              <input
                type="text"
                value={editingLinea.nodo_salida || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, nodo_salida: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: S.E. Piura Oeste"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">NODO_LLEGADA</label>
              <input
                type="text"
                value={editingLinea.nodo_llegada || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, nodo_llegada: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: S.E. Piura Centro"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CELDA_SALIDA</label>
              <input
                type="text"
                value={editingLinea.celda_salida || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, celda_salida: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: P100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CELDA_LLEGADA</label>
              <input
                type="text"
                value={editingLinea.celda_llegada || ''}
                onChange={(e) => setEditingLinea({ ...editingLinea, celda_llegada: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: P101"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingLinea.estado || 'Activo'}
                onChange={(e) => setEditingLinea({ ...editingLinea, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Activo">Activo</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <AuditFieldsBlock
            currentUser={currentUser}
            usuarioRegistro={editingLinea.usuario_registro || editingLinea.Usuario_Registro}
            fechaHoraMovimiento={editingLinea.fecha_hora_movimiento || editingLinea.Fecha_Hora_Movimiento}
            estadoRegistro={editingLinea.estado_registro || editingLinea.Estado_Registro || 'Activo'}
            isNew={isNew}
            className="mt-4"
          />

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar en Drive y Sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre, nodo, celda..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Tensión:</span>
            <select
              value={filterTension}
              onChange={(e) => setFilterTension(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">Todas</option>
              <option value="60">60 kV</option>
              <option value="33">33 kV</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Estado:</span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODOS">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Lines */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">COD_LINEA</th>
                <th className="px-4 py-3">NOMBRE DE LA LÍNEA</th>
                <th className="px-3 py-3">TENSION_NOM</th>
                <th className="px-3 py-3">TIPO</th>
                <th className="px-3 py-3">NODO SALIDA</th>
                <th className="px-3 py-3">NODO LLEGADA</th>
                <th className="px-3 py-3">CELDA SALIDA</th>
                <th className="px-3 py-3">CELDA LLEGADA</th>
                <th className="px-3 py-3">ESTRUCTURAS</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredLineas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    No se encontraron líneas que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredLineas.map((linea) => {
                  const structCount = storageService.getEstructuras(linea.cod_linea).length;
                  return (
                    <tr key={linea.id_linea} className="hover:bg-slate-750/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                        {linea.cod_linea}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {linea.nombre}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          linea.tension_nom === '60' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}>
                          {linea.tension_nom} kV
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400 font-mono">
                        {linea.tipo_sistema}
                      </td>
                      <td className="px-3 py-3">{linea.nodo_salida}</td>
                      <td className="px-3 py-3">{linea.nodo_llegada}</td>
                      <td className="px-3 py-3 font-mono text-cyan-400">{linea.celda_salida}</td>
                      <td className="px-3 py-3 font-mono text-cyan-400">{linea.celda_llegada}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => onSelectLineDetail && onSelectLineDetail(linea.cod_linea)}
                          className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          <Tower className="h-3.5 w-3.5" />
                          <span>{structCount} postes</span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          linea.estado === 'Activo'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {linea.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {currentUser.rol !== 'Contratista' && (
                            <button
                              onClick={() => handleStartEdit(linea)}
                              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                              title="Editar línea"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-amber-400" />
                            </button>
                          )}

                          {currentUser.rol === 'Administrador' && (
                            <button
                              onClick={() => handleDeleteOrDeactivate(linea)}
                              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-red-950 text-slate-200 hover:text-red-300 transition cursor-pointer"
                              title="Desactivar o eliminar"
                            >
                              <PowerOff className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          )}
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

      {/* Modal Confirmación Soft Delete / Desactivación de Línea */}
      {lineaToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-400">
                <PowerOff className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {lineaToDelete.structsCount > 0 ? 'Desactivar Línea de Subtransmisión' : 'Eliminar Línea de Subtransmisión'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lineaToDelete.structsCount > 0
                    ? `ADVERTENCIA: La línea ${lineaToDelete.linea.cod_linea} posee ${lineaToDelete.structsCount} estructuras en la planilla de postes. Se aplicará desactivación lógica para preservar el historial.`
                    : `La línea ${lineaToDelete.linea.cod_linea} se marcará como Eliminado (borrado lógico) en auditoría.`}
                </p>
              </div>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="font-mono font-bold text-cyan-300">{lineaToDelete.linea.cod_linea}</div>
              <div className="text-slate-200 font-semibold">{lineaToDelete.linea.nombre}</div>
              <div className="text-slate-400">{lineaToDelete.linea.nodo_salida} &rarr; {lineaToDelete.linea.nodo_llegada}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLineaToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteOrDeactivate}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                {lineaToDelete.structsCount > 0 ? 'Sí, desactivar línea' : 'Sí, eliminar línea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
