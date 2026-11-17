import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Shield,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Key,
  Layers,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Usuario, LineaSubtransmision, RolUsuario } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import { ExcelService } from '../services/excelService';

interface UsuariosViewProps {
  usuarios: Usuario[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  onRefresh: () => void;
  onSwitchUser: (username: string) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  lineas,
  currentUser,
  onRefresh,
  onSwitchUser
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Usuario> | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSyncDriveUsers = async () => {
    setIsSyncingDrive(true);
    try {
      const res = await GoogleDriveService.syncUsuariosFromDrive();
      if (res.success) {
        showNotification('success', res.message);
        onRefresh();
      } else {
        showNotification('error', res.message);
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleExportUsuarios = () => {
    ExcelService.exportUsuarios(usuarios);
    showNotification('success', `Exportados ${usuarios.length} usuarios en formato compatible con USUARIOS.XLSX.`);
  };

  const handleStartNew = () => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede crear usuarios.');
      return;
    }
    setEditingUser({
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      telefono: '',
      username: '',
      rol: 'Contratista',
      estado: 'Activo',
      supervisor_responsable: 'Carlos Alberto Mendoza Silva',
      lineas_asignadas: ['L-6657C']
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (u: Usuario) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede editar usuarios o cambiar roles.');
      return;
    }
    setEditingUser({ ...u });
    setIsNew(false);
    setIsEditing(true);
  };

  const handleToggleLine = (codLinea: string) => {
    if (!editingUser) return;
    const current = editingUser.lineas_asignadas || [];
    if (codLinea === '*') {
      setEditingUser({ ...editingUser, lineas_asignadas: current.includes('*') ? [] : ['*'] });
      return;
    }
    const filtered = current.filter(l => l !== '*');
    const exists = filtered.includes(codLinea);
    const updated = exists ? filtered.filter(l => l !== codLinea) : [...filtered, codLinea];
    setEditingUser({ ...editingUser, lineas_asignadas: updated });
  };

  const handleSave = async () => {
    if (!editingUser || !editingUser.nombres || !editingUser.username || !editingUser.email) {
      showNotification('error', 'Nombres, email y nombre de usuario son obligatorios.');
      return;
    }

    try {
      let savedUser: Usuario;
      if (isNew) {
        savedUser = storageService.addUsuario({
          nombres: editingUser.nombres,
          apellidos: editingUser.apellidos || '',
          dni: editingUser.dni || '',
          email: editingUser.email,
          telefono: editingUser.telefono || '',
          username: editingUser.username.trim().toLowerCase(),
          rol: (editingUser.rol as RolUsuario) || 'Contratista',
          estado: editingUser.estado || 'Activo',
          supervisor_responsable: editingUser.supervisor_responsable,
          lineas_asignadas: editingUser.lineas_asignadas || ['*'],
          password: editingUser.password || 'password123'
        });
        showNotification('success', `Usuario @${editingUser.username} añadido y registrado para sincronización con USUARIOS.XLSX.`);
      } else {
        storageService.updateUsuario(editingUser.id_usuario!, editingUser);
        savedUser = { ...editingUser } as Usuario;
        showNotification('success', `Usuario @${editingUser.username} actualizado y sincronizado en el sistema.`);
      }

      // Sync with Google Drive service
      GoogleDriveService.pushUsuarioToDrive(savedUser);

      setIsEditing(false);
      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'Administrador':
        return 'bg-purple-950 text-purple-300 border-purple-800 font-bold';
      case 'Supervisor':
        return 'bg-blue-950 text-blue-300 border-blue-800 font-bold';
      case 'Contratista':
        return 'bg-amber-950 text-amber-300 border-amber-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
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
            <Users className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Administración de Usuarios y Roles (RBAC)</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {usuarios.length} usuarios
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de permisos: Administrador (Control Total), Supervisor (Líneas Asignadas), Contratista (Registro de Actividades).
          </p>
        </div>

        {currentUser.rol === 'Administrador' && (
          <button
            onClick={handleStartNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      {/* Google Sheets USUARIOS.XLSX Live Sync Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-700/50 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-600/70 text-emerald-400 mt-0.5">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm">Hoja Oficial Google Sheets: USUARIOS.XLSX</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                ID: 1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Sincronización Bidireccional
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Los usuarios se añaden y actualizan directamente desde la hoja de cálculo de Google Drive. Los cambios hechos por supervisores y contratistas se reflejan instantáneamente en toda la red.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncDriveUsers}
            disabled={isSyncingDrive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
            title="Importar y actualizar usuarios desde el archivo oficial de Google Sheets"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'Sincronizando...' : 'Sincronizar desde Sheets'}</span>
          </button>

          <button
            onClick={handleExportUsuarios}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            title="Descargar libro Excel con estructura idéntica a Google Drive"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Descargar USUARIOS.xlsx</span>
          </button>

          <a
            href="https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
            title="Abrir hoja de cálculo oficial en Google Docs"
          >
            <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            <span>Abrir en Google Drive</span>
          </a>
        </div>
      </div>

      {/* Edit / New Modal */}
      {isEditing && editingUser && (
        <div className="bg-slate-800/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                {isNew ? 'Registrar Nuevo Usuario' : `Editar Usuario: ${editingUser.nombres} (@${editingUser.username})`}
              </h2>
              <p className="text-xs text-slate-400">
                Configure el rol y las líneas de subtransmisión autorizadas.
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">NOMBRES <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingUser.nombres || ''}
                onChange={(e) => setEditingUser({ ...editingUser, nombres: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Carlos Alberto"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">APELLIDOS</label>
              <input
                type="text"
                value={editingUser.apellidos || ''}
                onChange={(e) => setEditingUser({ ...editingUser, apellidos: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Mendoza Silva"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">DOCUMENTO (DNI / RUC)</label>
              <input
                type="text"
                value={editingUser.dni || ''}
                onChange={(e) => setEditingUser({ ...editingUser, dni: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                placeholder="09876543"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CORREO ELECTRÓNICO <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="cmendoza@enosa.com.pe"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TELÉFONO</label>
              <input
                type="text"
                value={editingUser.telefono || ''}
                onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                placeholder="+51 968 234 567"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NOMBRE DE USUARIO <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingUser.username || ''}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                disabled={!isNew}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                placeholder="cmendoza"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ROL DEL SISTEMA <span className="text-red-400">*</span></label>
              <select
                value={editingUser.rol || 'Contratista'}
                onChange={(e) => setEditingUser({ ...editingUser, rol: e.target.value as RolUsuario })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Administrador">Administrador (Acceso Total)</option>
                <option value="Supervisor">Supervisor (Líneas Asignadas & Cierre DMS)</option>
                <option value="Contratista">Contratista (Registro de Actividades)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingUser.estado || 'Activo'}
                onChange={(e) => setEditingUser({ ...editingUser, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">SUPERVISOR RESPONSABLE</label>
              <input
                type="text"
                value={editingUser.supervisor_responsable || ''}
                onChange={(e) => setEditingUser({ ...editingUser, supervisor_responsable: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ing. Carlos Mendoza Silva"
              />
            </div>

            {/* Line Selection */}
            <div className="lg:col-span-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">LÍNEAS DE SUBTRANSMISIÓN ASIGNADAS:</span>
                <button
                  type="button"
                  onClick={() => handleToggleLine('*')}
                  className={`px-3 py-1 rounded text-xs font-bold border transition ${
                    (editingUser.lineas_asignadas || []).includes('*')
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {(editingUser.lineas_asignadas || []).includes('*') ? '✓ Todas las líneas autorizadas' : 'Autorizar Todas'}
                </button>
              </div>

              {!(editingUser.lineas_asignadas || []).includes('*') && (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {Array.from(new Set(lineas.map(l => l.cod_linea))).map(lineCode => {
                    const isChecked = (editingUser.lineas_asignadas || []).includes(lineCode);
                    return (
                      <button
                        type="button"
                        key={lineCode}
                        onClick={() => handleToggleLine(lineCode)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition ${
                          isChecked
                            ? 'bg-blue-950 text-cyan-300 border-cyan-600'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '} {lineCode}
                      </button>
                    );
                  })}
                </div>
              )}
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
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
            >
              Guardar Usuario
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
                <th className="px-4 py-3">USUARIO / NOMBRE</th>
                <th className="px-3 py-3">ROL</th>
                <th className="px-3 py-3">CONTACTO</th>
                <th className="px-3 py-3">SUPERVISOR</th>
                <th className="px-4 py-3">LÍNEAS ASIGNADAS</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {usuarios.map((u, uIdx) => (
                <tr key={u.id_usuario ? `${u.id_usuario}-${u.username}-${uIdx}` : `usr-${uIdx}`} className="hover:bg-slate-750/70 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white text-sm">{u.nombres} {u.apellidos}</div>
                    <div className="text-[11px] text-cyan-400 font-mono">@{u.username} • DNI: {u.dni || '-'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getRoleBadge(u.rol)}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    <div className="text-slate-200">{u.email}</div>
                    <div className="text-[10px]">{u.telefono}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {u.supervisor_responsable || '-'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {u.lineas_asignadas.includes('*') ? (
                      <span className="text-[10px] font-semibold text-emerald-400">Todas las líneas (Acceso General)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.lineas_asignadas.map((l, lIdx) => (
                          <span key={`${l}-${lIdx}`} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.estado === 'Activo'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {u.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSwitchUser(u.username)}
                        className="px-2 py-1 rounded bg-slate-700 hover:bg-cyan-900 text-[10px] text-cyan-300 font-semibold border border-slate-600 transition"
                        title="Simular sesión como este usuario"
                      >
                        Iniciar como
                      </button>
                      {currentUser.rol === 'Administrador' && (
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                          title="Editar usuario"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
