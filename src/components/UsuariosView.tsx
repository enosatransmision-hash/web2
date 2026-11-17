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
  Lock,
  Briefcase,
  Building2,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { Usuario, LineaSubtransmision, RolUsuario, Contratista } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import { ExcelService } from '../services/excelService';
import { AuditFieldsBlock } from './AuditFieldsBlock';
import { DriveModuleToolbar } from './DriveModuleToolbar';

interface UsuariosViewProps {
  usuarios: Usuario[];
  contratistas?: Contratista[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  onRefresh: () => void;
  onSwitchUser: (username: string) => void;
}

const ACTIVIDADES_CATALOGO = [
  { key: 'deficiencias', label: 'Deficiencias Técnicas', color: 'text-amber-300 bg-amber-950/70 border-amber-800' },
  { key: 'puesta_tierra', label: 'Puesta a Tierra (PAT)', color: 'text-emerald-300 bg-emerald-950/70 border-emerald-800' },
  { key: 'termografia', label: 'Termografía Infrarroja', color: 'text-rose-300 bg-rose-950/70 border-rose-800' },
  { key: 'corona', label: 'Efecto Corona (UV)', color: 'text-purple-300 bg-purple-950/70 border-purple-800' },
  { key: 'podas', label: 'Control de Vegetación y Podas', color: 'text-lime-300 bg-lime-950/70 border-lime-800' },
  { key: 'mantenimiento', label: 'Mantenimiento de Postes', color: 'text-blue-300 bg-blue-950/70 border-blue-800' },
  { key: 'hidrolavado', label: 'Hidrolavado de Aisladores', color: 'text-sky-300 bg-sky-950/70 border-sky-800' },
  { key: 'ordenes_om', label: 'Órdenes de Mantenimiento', color: 'text-cyan-300 bg-cyan-950/70 border-cyan-800' },
  { key: 'dms', label: 'Gestión de DMS', color: 'text-teal-300 bg-teal-950/70 border-teal-800' },
];

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  contratistas: propContratistas,
  lineas,
  currentUser,
  onRefresh,
  onSwitchUser
}) => {
  const [activeSection, setActiveSection] = useState<'usuarios' | 'contratistas'>('usuarios');

  // Contratistas state
  const contratistas = propContratistas || storageService.getContratistas();
  const activeContratistas = contratistas.filter(c => c.estado === 'Activo');

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('TODOS');
  const [ctrSearch, setCtrSearch] = useState('');
  const [ctrStatusFilter, setCtrStatusFilter] = useState<string>('TODOS');

  // User modal
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Usuario> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<Usuario | null>(null);

  // Contractor modal
  const [isEditingCtr, setIsEditingCtr] = useState(false);
  const [isNewCtr, setIsNewCtr] = useState(false);
  const [editingCtr, setEditingCtr] = useState<Partial<Contratista> | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // Sync with Google Drive / Sheets
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
    showNotification('success', `Exportados ${usuarios.length} usuarios a Excel en formato binario compatible con USUARIOS.XLSX.`);
  };

  const handleExportContratistas = () => {
    ExcelService.exportContratistas(contratistas);
    showNotification('success', `Exportado directorio de ${contratistas.length} contratistas a Excel (.xlsx).`);
  };

  // --- USER HANDLERS ---
  const handleStartNewUser = () => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede registrar usuarios en el sistema.');
      return;
    }
    const defaultCtr = activeContratistas[0];
    setEditingUser({
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      telefono: '',
      username: '',
      password: '',
      rol: 'Contratista',
      estado: 'Activo',
      id_contratista: defaultCtr?.id_contratista || '',
      contratista_nombre: defaultCtr?.razon_social || '',
      supervisor_responsable: 'Carlos Alberto Mendoza Silva',
      lineas_asignadas: ['*']
    });
    setShowPassword(false);
    setIsNewUser(true);
    setIsEditingUser(true);
  };

  const handleStartEditUser = (u: Usuario) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede editar usuarios o cambiar permisos.');
      return;
    }
    setEditingUser({ ...u, password: '' });
    setShowPassword(false);
    setIsNewUser(false);
    setIsEditingUser(true);
  };

  const handleUserRoleChange = (rol: RolUsuario) => {
    if (!editingUser) return;
    if (rol === 'Contratista') {
      const defaultCtr = activeContratistas.find(c => c.id_contratista === editingUser.id_contratista) || activeContratistas[0];
      setEditingUser({
        ...editingUser,
        rol,
        id_contratista: defaultCtr?.id_contratista || '',
        contratista_nombre: defaultCtr?.razon_social || ''
      });
    } else {
      setEditingUser({
        ...editingUser,
        rol,
        id_contratista: undefined,
        contratista_nombre: undefined
      });
    }
  };

  const handleContractorSelectForUser = (ctrId: string) => {
    if (!editingUser) return;
    const selected = activeContratistas.find(c => c.id_contratista === ctrId);
    setEditingUser({
      ...editingUser,
      id_contratista: ctrId,
      contratista_nombre: selected?.razon_social || ''
    });
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

  const handleSaveUser = async () => {
    if (!editingUser) return;

    // 1. Validar Nombres y Usuario
    if (!editingUser.nombres?.trim() || !editingUser.username?.trim()) {
      showNotification('error', 'El nombre completo y nombre de usuario son obligatorios.');
      return;
    }

    // 2. Validar Email
    if (!editingUser.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email.trim())) {
      showNotification('error', 'Ingrese un correo electrónico válido (ejemplo: usuario@enosa.com.pe).');
      return;
    }

    // 3. Validar DNI (8 dígitos exactos)
    const dniLimpio = (editingUser.dni || '').trim();
    if (!/^\d{8}$/.test(dniLimpio)) {
      showNotification('error', 'El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }

    // 4. Validar Contraseña (Obligatoria para usuario nuevo)
    if (isNewUser && (!editingUser.password || editingUser.password.trim().length < 4)) {
      showNotification('error', 'La contraseña es un campo obligatorio al registrar un nuevo usuario (mínimo 4 caracteres).');
      return;
    }

    // 5. Validar Contratista cuando el rol es 'Contratista'
    if (editingUser.rol === 'Contratista') {
      if (!editingUser.id_contratista) {
        showNotification('error', 'Debe seleccionar una empresa contratista activa previamente registrada.');
        return;
      }
      const matchedCtr = activeContratistas.find(c => c.id_contratista === editingUser.id_contratista);
      if (!matchedCtr) {
        showNotification('error', 'La contratista seleccionada no se encuentra activa en el directorio.');
        return;
      }
    }

    try {
      let savedUser: Usuario;
      const cleanUsername = editingUser.username.trim().toLowerCase();

      if (isNewUser) {
        savedUser = storageService.addUsuario({
          nombres: editingUser.nombres.trim(),
          apellidos: (editingUser.apellidos || '').trim(),
          dni: dniLimpio,
          email: editingUser.email.trim(),
          telefono: (editingUser.telefono || '').trim(),
          username: cleanUsername,
          rol: (editingUser.rol as RolUsuario) || 'Contratista',
          estado: editingUser.estado || 'Activo',
          id_contratista: editingUser.rol === 'Contratista' ? editingUser.id_contratista : undefined,
          contratista_nombre: editingUser.rol === 'Contratista' ? editingUser.contratista_nombre : undefined,
          supervisor_responsable: editingUser.supervisor_responsable || '',
          lineas_asignadas: editingUser.lineas_asignadas || ['*'],
          password: editingUser.password?.trim() || 'password123'
        });
      } else {
        const updatePayload: Partial<Usuario> = {
          ...editingUser,
          dni: dniLimpio,
          username: cleanUsername
        };
        if (!editingUser.password || !editingUser.password.trim()) {
          delete updatePayload.password;
        } else {
          updatePayload.password = editingUser.password.trim();
        }
        storageService.updateUsuario(editingUser.id_usuario!, updatePayload);
        savedUser = { ...editingUser, ...updatePayload } as Usuario;
      }

      // Sync with Google Drive service (USUARIOS.XLSX en Drive con contraseña protegida)
      const driveRes = await GoogleDriveService.pushUsuarioToDrive(savedUser);
      showNotification(
        'success',
        driveRes.message || `Usuario @${cleanUsername} guardado y sincronizado con USUARIOS.XLSX.`
      );

      setIsEditingUser(false);
      setEditingUser(null);
      setShowPassword(false);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteUserTarget) return;
    storageService.deleteUsuario(deleteUserTarget.id_usuario);
    showNotification('success', `Usuario @${deleteUserTarget.username} marcado como Eliminado (Soft Delete) y sincronizado.`);
    setDeleteUserTarget(null);
    onRefresh();
  };

  // --- CONTRACTOR HANDLERS ---
  const handleStartNewCtr = () => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede registrar contratistas.');
      return;
    }
    setEditingCtr({
      razon_social: '',
      ruc: '',
      representante_legal: '',
      telefono: '',
      email: '',
      especialidad: '',
      estado: 'Activo',
      actividades_asignadas: ['deficiencias', 'mantenimiento', 'ordenes_om'],
      lineas_asignadas: ['*']
    });
    setIsNewCtr(true);
    setIsEditingCtr(true);
  };

  const handleStartEditCtr = (c: Contratista) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede editar contratistas.');
      return;
    }
    setEditingCtr({ ...c });
    setIsNewCtr(false);
    setIsEditingCtr(true);
  };

  const handleToggleActivityForCtr = (actKey: string) => {
    if (!editingCtr) return;
    const current = editingCtr.actividades_asignadas || [];
    const exists = current.includes(actKey);
    const updated = exists ? current.filter(a => a !== actKey) : [...current, actKey];
    setEditingCtr({ ...editingCtr, actividades_asignadas: updated });
  };

  const handleSaveCtr = () => {
    if (!editingCtr) return;

    // 1. Razón Social
    if (!editingCtr.razon_social?.trim()) {
      showNotification('error', 'La Razón Social de la empresa contratista es obligatoria.');
      return;
    }

    // 2. RUC (11 dígitos numéricos exactos)
    const rucLimpio = (editingCtr.ruc || '').trim();
    if (!/^\d{11}$/.test(rucLimpio)) {
      showNotification('error', 'El RUC debe contener exactamente 11 dígitos numéricos (ejemplo: 20541234567).');
      return;
    }

    // 3. Representante Legal
    if (!editingCtr.representante_legal?.trim()) {
      showNotification('error', 'El nombre del Representante Legal es obligatorio.');
      return;
    }

    // 4. Teléfono
    if (!editingCtr.telefono?.trim()) {
      showNotification('error', 'El teléfono de contacto de la contratista es obligatorio.');
      return;
    }

    // 5. Correo Electrónico
    if (!editingCtr.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingCtr.email.trim())) {
      showNotification('error', 'Ingrese un correo electrónico corporativo válido para la contratista.');
      return;
    }

    // 6. Especialidad
    if (!editingCtr.especialidad?.trim()) {
      showNotification('error', 'La especialidad técnica de la empresa contratista es obligatoria.');
      return;
    }

    // 7. Actividades asignadas
    if (!editingCtr.actividades_asignadas || editingCtr.actividades_asignadas.length === 0) {
      showNotification('error', 'Debe asignar al menos una actividad o formulario a la contratista.');
      return;
    }

    try {
      if (isNewCtr) {
        storageService.addContratista({
          razon_social: editingCtr.razon_social.trim(),
          ruc: rucLimpio,
          representante_legal: editingCtr.representante_legal.trim(),
          telefono: editingCtr.telefono.trim(),
          email: editingCtr.email.trim(),
          especialidad: editingCtr.especialidad.trim(),
          estado: editingCtr.estado || 'Activo',
          actividades_asignadas: editingCtr.actividades_asignadas,
          lineas_asignadas: editingCtr.lineas_asignadas || ['*']
        });
        showNotification('success', `Contratista «${editingCtr.razon_social}» registrada exitosamente. Ya está disponible en el selector de usuarios.`);
      } else {
        storageService.updateContratista(editingCtr.id_contratista!, {
          ...editingCtr,
          ruc: rucLimpio
        });
        showNotification('success', `Contratista «${editingCtr.razon_social}» actualizada. Permisos y formularios sincronizados.`);
      }

      setIsEditingCtr(false);
      setEditingCtr(null);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleToggleCtrStatus = (ctr: Contratista) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede cambiar el estado de una contratista.');
      return;
    }
    const nuevoEstado = ctr.estado === 'Activo' ? 'Inactivo' : 'Activo';
    storageService.updateContratista(ctr.id_contratista, { estado: nuevoEstado });
    showNotification('success', `Contratista «${ctr.razon_social}» marcada como ${nuevoEstado}.`);
    onRefresh();
  };

  // Filtered lists
  const filteredUsers = usuarios.filter(u => {
    const matchSearch =
      u.nombres.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.apellidos.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.dni && u.dni.includes(userSearch)) ||
      (u.contratista_nombre && u.contratista_nombre.toLowerCase().includes(userSearch.toLowerCase()));
    const matchRole = userRoleFilter === 'TODOS' || u.rol === userRoleFilter;
    return matchSearch && matchRole;
  });

  const filteredContratistas = contratistas.filter(c => {
    const matchSearch =
      c.razon_social.toLowerCase().includes(ctrSearch.toLowerCase()) ||
      c.ruc.includes(ctrSearch) ||
      c.representante_legal.toLowerCase().includes(ctrSearch.toLowerCase()) ||
      c.especialidad.toLowerCase().includes(ctrSearch.toLowerCase());
    const matchStatus = ctrStatusFilter === 'TODOS' || c.estado === ctrStatusFilter;
    return matchSearch && matchStatus;
  });

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
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xl transition animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-red-950/90 border-red-700 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Header with Sub-tabs */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Control de Accesos, Usuarios y Contratistas (RBAC)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administre usuarios, asigne contratistas y configure los formularios autorizados por empresa.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveSection('usuarios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSection === 'usuarios'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios y Permisos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-cyan-300 font-mono">
              {usuarios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('contratistas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSection === 'contratistas'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Directorio de Contratistas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-amber-300 font-mono">
              {contratistas.length}
            </span>
          </button>
        </div>
      </div>

      {/* Google Sheets Live Sync Banner for USUARIOS.XLSX */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-700/50 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-600/70 text-emerald-400 mt-0.5">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm">Sincronización Oficial: Usuario.xlsx</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                Drive ID: 1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Sincronización Bidireccional Automática
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Toda alta o modificación de usuarios con contraseña obligatoria y asignación de contratista se almacena y sincroniza tanto en la base web como en el archivo Usuario.xlsx de Google Drive.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncDriveUsers}
            disabled={isSyncingDrive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
            title="Importar y sincronizar usuarios desde el archivo oficial de Google Sheets"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'Sincronizando...' : 'Sincronizar desde Sheets'}</span>
          </button>

          {activeSection === 'usuarios' ? (
            <button
              onClick={handleExportUsuarios}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
              title="Descargar libro Excel binario de usuarios"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Descargar Usuario.xlsx</span>
            </button>
          ) : (
            <button
              onClick={handleExportContratistas}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900/60 text-amber-300 border border-amber-700/80 text-xs font-semibold transition cursor-pointer"
              title="Descargar libro Excel binario de contratistas"
            >
              <FileSpreadsheet className="h-4 w-4 text-amber-400" />
              <span>Descargar CONTRATISTAS.xlsx</span>
            </button>
          )}

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

      {/* Drive Sync & Bulk Excel Upload Toolbar */}
      <DriveModuleToolbar
        moduleKey={activeSection === 'usuarios' ? 'USUARIOS' : 'CONTRATISTAS'}
        onDataImported={onRefresh}
      />

      {/* ======================================================== */}
      {/* SECTION 1: GESTIÓN DE USUARIOS */}
      {/* ======================================================== */}
      {activeSection === 'usuarios' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 w-full">
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, DNI, contratista..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Contratista">Contratista</option>
                </select>
              </div>
            </div>

            {currentUser.rol === 'Administrador' && (
              <button
                onClick={handleStartNewUser}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition cursor-pointer w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Nuevo Usuario</span>
              </button>
            )}
          </div>

          {/* User Create / Edit Modal Form */}
          {isEditingUser && editingUser && (
            <div className="bg-slate-800/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-cyan-400" />
                    {isNewUser ? 'Registrar Nuevo Usuario' : `Editar Usuario: ${editingUser.nombres} (@${editingUser.username})`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure DNI (8 dígitos), credenciales y asignación estricta de empresa contratista.
                  </p>
                </div>
                <button onClick={() => setIsEditingUser(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* NOMBRES */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NOMBRES <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingUser.nombres || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, nombres: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500"
                    placeholder="Juan Carlos"
                  />
                </div>

                {/* APELLIDOS */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">APELLIDOS</label>
                  <input
                    type="text"
                    value={editingUser.apellidos || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, apellidos: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500"
                    placeholder="Pérez Vargas"
                  />
                </div>

                {/* DNI CON VALIDACIÓN DE 8 DÍGITOS */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    DNI (8 DÍGITOS) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={editingUser.dni || ''}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setEditingUser({ ...editingUser, dni: onlyNums });
                    }}
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white font-mono font-bold tracking-widest ${
                      editingUser.dni && editingUser.dni.length === 8 ? 'border-emerald-600' : 'border-slate-700 focus:border-cyan-500'
                    }`}
                    placeholder="42891045"
                  />
                  <span className="text-[10px] text-slate-400">
                    {editingUser.dni?.length || 0}/8 dígitos numéricos
                  </span>
                </div>

                {/* EMAIL */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    CORREO ELECTRÓNICO <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500"
                    placeholder="usuario@enosa.com.pe"
                  />
                </div>

                {/* TELÉFONO */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">TELÉFONO</label>
                  <input
                    type="text"
                    value={editingUser.telefono || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="+51 969 123 456"
                  />
                </div>

                {/* NOMBRE DE USUARIO */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NOMBRE DE USUARIO <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    disabled={!isNewUser}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                    placeholder="jperez"
                  />
                </div>

                {/* CONTRASEÑA (OCULTA EN WEB, SINCRONIZADA SOLO A DRIVE USUARIOS.XLSX) */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    CONTRASEÑA {isNewUser && <span className="text-red-400">* (Obligatorio)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full bg-slate-900 border border-amber-600/70 rounded-lg pl-3 pr-10 py-2 text-white font-mono"
                      placeholder={isNewUser ? 'Ingrese contraseña obligatoria' : 'Dejar en blanco para conservar la actual'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-amber-300 cursor-pointer"
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar temporalmente'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-300/80 flex items-center gap-1 mt-1">
                    <Lock className="h-3 w-3 shrink-0" />
                    <span>Se guarda únicamente en USUARIOS.XLSX de Google Drive (oculta en web).</span>
                  </span>
                </div>

                {/* ROL DEL SISTEMA */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TIPO DE USUARIO (ROL) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editingUser.rol || 'Contratista'}
                    onChange={(e) => handleUserRoleChange(e.target.value as RolUsuario)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="Administrador">Administrador (Acceso Total)</option>
                    <option value="Supervisor">Supervisor (Inspección & Cierre)</option>
                    <option value="Contratista">Contratista (Acceso Restringido a Actividades)</option>
                  </select>
                </div>

                {/* ESTADO */}
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

                {/* SELECTOR CONDICIONAL DE CONTRATISTA ASIGNADA (REGLA IMPORTANTE) */}
                <div className="lg:col-span-3 p-4 rounded-xl border transition-all bg-slate-900/90 border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-200 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-amber-400" />
                      <span>CONTRATISTA ASIGNADA</span>
                      {editingUser.rol === 'Contratista' ? (
                        <span className="text-red-400 text-xs font-semibold">* (Obligatorio para Contratista)</span>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-normal">(Opcional / No aplicable para {editingUser.rol})</span>
                      )}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Muestra exclusivamente contratistas activas registradas en el directorio
                    </span>
                  </div>

                  {editingUser.rol === 'Contratista' ? (
                    <div className="space-y-3">
                      <select
                        value={editingUser.id_contratista || ''}
                        onChange={(e) => handleContractorSelectForUser(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-amber-500/80 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs"
                      >
                        <option value="">-- Seleccione Contratista Activa --</option>
                        {activeContratistas.map((c) => (
                          <option key={c.id_contratista} value={c.id_contratista}>
                            {c.razon_social} (RUC: {c.ruc}) - {c.especialidad}
                          </option>
                        ))}
                      </select>

                      {/* Preview of assigned contractor activities */}
                      {editingUser.id_contratista && (() => {
                        const selectedCtr = activeContratistas.find(c => c.id_contratista === editingUser.id_contratista);
                        if (!selectedCtr) return null;
                        return (
                          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs">
                            <div className="flex items-center gap-2 text-amber-300 font-bold mb-1.5">
                              <Building2 className="h-4 w-4" />
                              <span>{selectedCtr.razon_social}</span>
                              <span className="font-mono text-[10px] text-amber-400">RUC: {selectedCtr.ruc}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mb-2">
                              Especialidad: <strong>{selectedCtr.especialidad}</strong>
                            </p>
                            <div className="text-[11px] text-slate-400 mb-1">
                              Formularios y actividades que visualizará este usuario al iniciar sesión:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedCtr.actividades_asignadas.map((act) => {
                                const meta = ACTIVIDADES_CATALOGO.find(a => a.key === act);
                                return (
                                  <span key={act} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta?.color || 'bg-slate-800 text-slate-300'}`}>
                                    ✓ {meta?.label || act}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      Como <strong>{editingUser.rol}</strong>, este usuario tiene acceso de {editingUser.rol === 'Administrador' ? 'control total sobre todas las contratistas' : 'supervisión general sobre líneas asignadas'}. No requiere vinculación restrictiva a una contratista específica.
                    </div>
                  )}
                </div>

                {/* LÍNEAS ASIGNADAS */}
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
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
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

                {/* Auditoría y Trazabilidad */}
                <div className="lg:col-span-3">
                  <AuditFieldsBlock
                    currentUser={currentUser}
                    usuarioRegistro={editingUser.usuario_registro || editingUser.Usuario_Registro}
                    fechaHoraMovimiento={editingUser.fecha_hora_movimiento || editingUser.Fecha_Hora_Movimiento}
                    estadoRegistro={editingUser.estado_registro || editingUser.Estado_Registro || 'Activo'}
                    isNew={isNewUser}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setIsEditingUser(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">USUARIO / NOMBRE</th>
                    <th className="px-3 py-3">DNI (8 DÍGITOS)</th>
                    <th className="px-3 py-3">ROL</th>
                    <th className="px-3 py-3">CONTRATISTA ASIGNADA</th>
                    <th className="px-3 py-3">CONTACTO</th>
                    <th className="px-3 py-3">LÍNEAS</th>
                    <th className="px-3 py-3">ESTADO</th>
                    <th className="px-4 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredUsers.map((u, uIdx) => (
                    <tr
                      key={u.id_usuario ? `${u.id_usuario}-${u.username}-${uIdx}` : `usr-${uIdx}`}
                      className="hover:bg-slate-750/70 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-sm">
                          {u.nombres} {u.apellidos}
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono font-medium">@{u.username}</div>
                      </td>

                      <td className="px-3 py-3 font-mono font-bold text-slate-200">
                        {u.dni || '-'}
                      </td>

                      <td className="px-3 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getRoleBadge(u.rol)}`}>
                          {u.rol}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {u.contratista_nombre ? (
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                            <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={u.contratista_nombre}>
                              {u.contratista_nombre}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">No aplica (ENOSA)</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        <div className="text-slate-200">{u.email}</div>
                        <div className="text-[10px] font-mono">{u.telefono}</div>
                      </td>

                      <td className="px-3 py-3 max-w-xs">
                        {u.lineas_asignadas.includes('*') ? (
                          <span className="text-[10px] font-semibold text-emerald-400">Todas las líneas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.lineas_asignadas.map((l, lIdx) => (
                              <span
                                key={`${l}-${lIdx}`}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-700"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.estado === 'Activo'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {u.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSwitchUser(u.username)}
                            className="px-2 py-1 rounded bg-slate-750 hover:bg-cyan-900 text-[10px] text-cyan-300 font-semibold border border-slate-600 transition cursor-pointer"
                            title="Iniciar sesión como este usuario para verificar sus permisos"
                          >
                            Iniciar como
                          </button>
                          {currentUser.rol === 'Administrador' && (
                            <>
                              <button
                                onClick={() => handleStartEditUser(u)}
                                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer"
                                title="Editar usuario y contratista asignada"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {u.username !== currentUser.username && (
                                <button
                                  onClick={() => setDeleteUserTarget(u)}
                                  className="p-1.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 cursor-pointer"
                                  title="Eliminar usuario (Soft Delete)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
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
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DIRECTORIO Y ASIGNACIÓN DE CONTRATISTAS */}
      {/* ======================================================== */}
      {activeSection === 'contratistas' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 w-full">
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Razón Social, RUC, Especialidad..."
                  value={ctrSearch}
                  onChange={(e) => setCtrSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={ctrStatusFilter}
                  onChange={(e) => setCtrStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                </select>
              </div>
            </div>

            {currentUser.rol === 'Administrador' && (
              <button
                onClick={handleStartNewCtr}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition cursor-pointer w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Nueva Contratista</span>
              </button>
            )}
          </div>

          {/* Contractor Create / Edit Modal Form */}
          {isEditingCtr && editingCtr && (
            <div className="bg-slate-800/95 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-amber-400" />
                    {isNewCtr ? 'Registrar Nueva Empresa Contratista' : `Editar Contratista: ${editingCtr.razon_social}`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina los datos corporativos, RUC (11 dígitos) y las actividades/formularios asignados a esta empresa.
                  </p>
                </div>
                <button onClick={() => setIsEditingCtr(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* RAZÓN SOCIAL */}
                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    RAZÓN SOCIAL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCtr.razon_social || ''}
                    onChange={(e) => setEditingCtr({ ...editingCtr, razon_social: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-amber-500"
                    placeholder="Consorcio Eléctrico del Norte S.A.C."
                  />
                </div>

                {/* RUC (11 DÍGITOS) */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    RUC (11 DÍGITOS) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={editingCtr.ruc || ''}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setEditingCtr({ ...editingCtr, ruc: onlyNums });
                    }}
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white font-mono font-bold tracking-wider ${
                      editingCtr.ruc && editingCtr.ruc.length === 11 ? 'border-emerald-600' : 'border-slate-700 focus:border-amber-500'
                    }`}
                    placeholder="20541234567"
                  />
                  <span className="text-[10px] text-slate-400">
                    {editingCtr.ruc?.length || 0}/11 dígitos numéricos
                  </span>
                </div>

                {/* REPRESENTANTE LEGAL */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    REPRESENTANTE LEGAL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCtr.representante_legal || ''}
                    onChange={(e) => setEditingCtr({ ...editingCtr, representante_legal: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500"
                    placeholder="Ing. Marcos Peña Ramos"
                  />
                </div>

                {/* TELÉFONO */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TELÉFONO DE CONTACTO <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCtr.telefono || ''}
                    onChange={(e) => setEditingCtr({ ...editingCtr, telefono: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-500"
                    placeholder="+51 980 456 789"
                  />
                </div>

                {/* CORREO ELECTRÓNICO */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    CORREO ELECTRÓNICO <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingCtr.email || ''}
                    onChange={(e) => setEditingCtr({ ...editingCtr, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500"
                    placeholder="contacto@cenorte.com.pe"
                  />
                </div>

                {/* ESPECIALIDAD */}
                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    ESPECIALIDAD TÉCNICA <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCtr.especialidad || ''}
                    onChange={(e) => setEditingCtr({ ...editingCtr, especialidad: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500"
                    placeholder="Mantenimiento Integral de Líneas de Subtransmisión y Postes"
                  />
                </div>

                {/* ESTADO */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    ESTADO <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editingCtr.estado || 'Activo'}
                    onChange={(e) => setEditingCtr({ ...editingCtr, estado: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="Activo">Activo (Disponible en selector de usuarios)</option>
                    <option value="Inactivo">Inactivo (Deshabilitado)</option>
                  </select>
                </div>

                {/* ASIGNACIÓN DE ACTIVIDADES / FORMULARIOS */}
                <div className="lg:col-span-3 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-white text-xs">ACTIVIDADES Y FORMULARIOS ASIGNADOS:</span>
                      <p className="text-[11px] text-slate-400">
                        Los usuarios vinculados a esta contratista únicamente podrán visualizar y registrar en los formularios marcados.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      {editingCtr.actividades_asignadas?.length || 0} de {ACTIVIDADES_CATALOGO.length} seleccionadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
                    {ACTIVIDADES_CATALOGO.map((act) => {
                      const isSelected = (editingCtr.actividades_asignadas || []).includes(act.key);
                      return (
                        <button
                          type="button"
                          key={act.key}
                          onClick={() => handleToggleActivityForCtr(act.key)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-950/60 border-amber-600 text-white shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600 shrink-0" />
                          )}
                          <span className="text-xs font-semibold">{act.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auditoría y Trazabilidad Contratista */}
                <div className="lg:col-span-3">
                  <AuditFieldsBlock
                    currentUser={currentUser}
                    usuarioRegistro={editingCtr.usuario_registro || editingCtr.Usuario_Registro}
                    fechaHoraMovimiento={editingCtr.fecha_hora_movimiento || editingCtr.Fecha_Hora_Movimiento}
                    estadoRegistro={editingCtr.estado_registro || editingCtr.Estado_Registro || 'Activo'}
                    isNew={isNewCtr}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setIsEditingCtr(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCtr}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Contratista</span>
                </button>
              </div>
            </div>
          )}

          {/* Contractors Directory Table */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">EMPRESA CONTRATISTA</th>
                    <th className="px-3 py-3">RUC (11 DÍGITOS)</th>
                    <th className="px-3 py-3">REPRESENTANTE LEGAL</th>
                    <th className="px-3 py-3">CONTACTO</th>
                    <th className="px-4 py-3">ACTIVIDADES ASIGNADAS</th>
                    <th className="px-3 py-3">ESTADO</th>
                    <th className="px-4 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredContratistas.map((c, cIdx) => (
                    <tr
                      key={c.id_contratista ? `${c.id_contratista}-${cIdx}` : `ctr-${cIdx}`}
                      className="hover:bg-slate-750/70 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>{c.razon_social}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.especialidad}</div>
                      </td>

                      <td className="px-3 py-3 font-mono font-bold text-slate-200">
                        {c.ruc}
                      </td>

                      <td className="px-3 py-3 text-slate-200 font-medium">
                        {c.representante_legal}
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        <div className="text-slate-200">{c.email}</div>
                        <div className="text-[10px] font-mono">{c.telefono}</div>
                      </td>

                      <td className="px-4 py-3 max-w-sm">
                        <div className="flex flex-wrap gap-1">
                          {c.actividades_asignadas.map((act) => {
                            const meta = ACTIVIDADES_CATALOGO.find(a => a.key === act);
                            return (
                              <span
                                key={act}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  meta?.color || 'bg-slate-900 text-slate-300 border-slate-700'
                                }`}
                              >
                                {meta?.label || act}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleCtrStatus(c)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            c.estado === 'Activo'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                          }`}
                          title="Haga clic para alternar estado"
                        >
                          {c.estado}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {currentUser.rol === 'Administrador' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditCtr(c)}
                              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer"
                              title="Editar contratista y actividades"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Soft Delete User Confirmation Modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-700/70 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-300 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Confirmar Eliminación de Usuario</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              ¿Deseas desactivar y marcar como eliminado al usuario <strong className="text-white">@{deleteUserTarget.username}</strong> ({deleteUserTarget.nombres} {deleteUserTarget.apellidos})? El cambio quedará auditado y se sincronizará con <code className="text-emerald-300">USUARIOS.XLSX</code>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteUserTarget(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Sí, eliminar usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
