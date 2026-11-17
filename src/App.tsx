/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Zap,
  TowerControl as Tower,
  Activity,
  AlertTriangle,
  Flame,
  Scissors,
  Wrench,
  ShieldCheck,
  Camera,
  FileText,
  History,
  Users,
  Settings,
  ChevronRight,
  Menu,
  X,
  Radio,
  Bell,
  ClipboardList,
  Droplets
} from 'lucide-react';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { LineasView } from './components/LineasView';
import { EstructurasView } from './components/EstructurasView';
import { CoronaView } from './components/CoronaView';
import { DeficienciasView } from './components/DeficienciasView';
import { TermografiaView } from './components/TermografiaView';
import { PodasView } from './components/PodasView';
import { MantenimientoView } from './components/MantenimientoView';
import { HidrolavadoView } from './components/HidrolavadoView';
import { DMSView } from './components/DMSView';
import { OrdenesMantenimientoView } from './components/OrdenesMantenimientoView';
import { PuestaTierraView } from './components/PuestaTierraView';
import { EvidenciasView } from './components/EvidenciasView';
import { ReportesView } from './components/ReportesView';
import { AuditoriaView } from './components/AuditoriaView';
import { UsuariosView } from './components/UsuariosView';
import { ConfiguracionDriveModal } from './components/ConfiguracionDriveModal';
import { ConflictosModal } from './components/ConflictosModal';
import { DocsGuiaModal } from './components/DocsGuiaModal';
import { PhotoModal } from './components/PhotoModal';
import { storageService } from './services/storageService';
import { GoogleDriveService } from './services/googleDriveService';
import { initGoogleAuth } from './services/googleAuthService';
import { realtimeService, LiveNotification } from './services/realtimeService';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Termografia,
  Poda,
  Mantenimiento,
  Hidrolavado,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  AuditoriaRegistro,
  Usuario,
  Contratista,
  ConfiguracionDrive,
  ConflictoRegistro,
  PuestaTierra,
  OrdenMantenimiento
} from './types';


export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('st_auth_user');
  });
  const [currentUser, setCurrentUser] = useState<Usuario>(() => {
    const saved = localStorage.getItem('st_auth_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return storageService.getCurrentUser();
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('TODAS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App State from storageService
  const [lineas, setLineas] = useState<LineaSubtransmision[]>([]);
  const [estructuras, setEstructuras] = useState<Estructura[]>([]);
  const [corona, setCorona] = useState<EfectoCorona[]>([]);
  const [deficiencias, setDeficiencias] = useState<Deficiencia[]>([]);
  const [puestaTierra, setPuestaTierra] = useState<PuestaTierra[]>([]);
  const [termografia, setTermografia] = useState<Termografia[]>([]);
  const [podas, setPodas] = useState<Poda[]>([]);
  const [mantenimiento, setMantenimiento] = useState<Mantenimiento[]>([]);
  const [hidrolavado, setHidrolavado] = useState<Hidrolavado[]>([]);
  const [ordenesMantenimiento, setOrdenesMantenimiento] = useState<OrdenMantenimiento[]>([]);
  const [dms, setDMS] = useState<DMSItem[]>([]);
  const [levantamientos, setLevantamientos] = useState<LevantamientoDMS[]>([]);
  const [inspecciones, setInspecciones] = useState<InspeccionCierreDMS[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>(() => storageService.getContratistas());
  const [auditoria, setAuditoria] = useState<AuditoriaRegistro[]>([]);
  const [configDrive, setConfigDrive] = useState<ConfiguracionDrive>(storageService.getConfigDrive());
  const [conflictos, setConflictos] = useState<ConflictoRegistro[]>([]);

  // Real-time live toasts
  const [liveToasts, setLiveToasts] = useState<LiveNotification[]>([]);

  // Modals state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConflictosOpen, setIsConflictosOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [photoModalData, setPhotoModalData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const refreshState = useCallback(() => {
    setLineas([...storageService.getLineas()]);
    setEstructuras([...storageService.getEstructuras()]);
    setCorona([...storageService.getCorona()]);
    setDeficiencias([...storageService.getDeficiencias()]);
    setPuestaTierra([...storageService.getPuestaTierra()]);
    setTermografia([...storageService.getTermografia()]);
    setPodas([...storageService.getPodas()]);
    setMantenimiento([...storageService.getMantenimiento()]);
    setHidrolavado([...storageService.getHidrolavado()]);
    setOrdenesMantenimiento([...storageService.getOrdenesMantenimiento()]);
    setDMS([...storageService.getDMS()]);
    setLevantamientos([...storageService.getLevantamientos()]);
    setInspecciones([...storageService.getInspecciones()]);
    setUsuarios([...storageService.getUsuarios()]);
    setContratistas([...storageService.getContratistas()]);
    setAuditoria([...storageService.getAuditoria()]);
    setConfigDrive({ ...storageService.getConfigDrive() });
    setConflictos([...storageService.getConflictos()]);
  }, []);

  useEffect(() => {
    initGoogleAuth();
  }, []);

  // Connect to Realtime WebSocket and listen for remote updates
  useEffect(() => {
    refreshState();

    if (isAuthenticated && currentUser) {
      realtimeService.connect(currentUser);
      realtimeService.identify(currentUser, activeTab, selectedLineFilter);
    }

    // Subscribe to storageService async updates (IndexedDB hydration & server reconciliation)
    const unsubStorage = storageService.onChange(() => {
      refreshState();
    });

    // Subscribe to state updates from server / other users
    const unsubState = realtimeService.onStateUpdate(() => {
      refreshState();
    });

    // Subscribe to live notifications from other users
    const unsubNotif = realtimeService.onNotification((notif) => {
      setLiveToasts(prev => [notif, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setLiveToasts(prev => prev.filter(n => n.id !== notif.id));
      }, 7000);
    });

    return () => {
      unsubStorage();
      unsubState();
      unsubNotif();
    };
  }, [isAuthenticated, refreshState]);

  // Update presence whenever user switches module or line filter
  useEffect(() => {
    if (isAuthenticated) {
      realtimeService.updatePresence(activeTab, selectedLineFilter);
    }
  }, [activeTab, selectedLineFilter, isAuthenticated]);

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    storageService.setCurrentUser(user);
    realtimeService.connect(user);
    refreshState();
    void storageService.syncWithServer().then(() => {
      refreshState();
    });
  };

  const handleLogout = () => {
    storageService.logout();
    setIsAuthenticated(false);
  };

  const handleSwitchUser = (username: string) => {
    storageService.setCurrentUser(username);
    const updated = storageService.getCurrentUser();
    setCurrentUser(updated);
    realtimeService.identify(updated, activeTab, selectedLineFilter);
    refreshState();
  };

  const handleOpenPhoto = (url: string, title: string) => {
    setPhotoModalData({ isOpen: true, url, title });
  };

  const handleClosePhoto = () => {
    setPhotoModalData({ isOpen: false, url: '', title: '' });
  };

  // Available lines based on current user permissions (deduplicated by code)
  const availableLines = useMemo(() => {
    const list = storageService.getAccessibleLines().map(l => l.cod_linea);
    return Array.from(new Set(list));
  }, [lineas, currentUser]);

  // Sidebar navigation menu items (must be declared before any conditional return to obey Rules of Hooks)
  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard, badge: null },
    { id: 'lineas', label: 'Líneas Subtransmisión', icon: Zap, badge: lineas.length },
    { id: 'estructuras', label: 'Planilla de Estructuras', icon: Tower, badge: estructuras.length },
    { id: 'corona', label: 'Efecto Corona (UV)', icon: Activity, badge: corona.length },
    { id: 'deficiencias', label: 'Deficiencias Técnicas', icon: AlertTriangle, badge: deficiencias.length },
    { id: 'puesta_tierra', label: 'Puesta a Tierra (PAT)', icon: ShieldCheck, badge: puestaTierra.length },
    { id: 'termografia', label: 'Termografía Infrarroja', icon: Flame, badge: termografia.length },
    { id: 'podas', label: 'Control de Podas', icon: Scissors, badge: podas.length },
    { id: 'mantenimiento', label: 'Mantenimiento / Postes', icon: Wrench, badge: mantenimiento.length },
    { id: 'hidrolavado', label: 'Hidrolavado Aisladores', icon: Droplets, badge: hidrolavado.length },
    { id: 'ordenes_om', label: 'Órdenes de Mantenimiento', icon: ClipboardList, badge: ordenesMantenimiento.length },
    { id: 'dms', label: 'Gestión de DMS', icon: ShieldCheck, badge: dms.length },
    { id: 'evidencias', label: 'Evidencias Fotográficas', icon: Camera, badge: null },
    { id: 'reportes', label: 'Centro de Reportes', icon: FileText, badge: '16' },
    { id: 'auditoria', label: 'Auditoría Oficial', icon: History, badge: null },
    { id: 'usuarios', label: 'Usuarios y Contratistas', icon: Users, badge: usuarios.length }
  ], [lineas.length, estructuras.length, corona.length, deficiencias.length, puestaTierra.length, termografia.length, podas.length, mantenimiento.length, hidrolavado.length, ordenesMantenimiento.length, dms.length, usuarios.length]);

  const accessibleNavItems = useMemo(() => {
    if (currentUser.rol === 'Administrador') {
      return navItems;
    }
    if (currentUser.rol === 'Supervisor') {
      // Supervisor has access to all activities and inspection modules, but not user administration
      return navItems.filter(item => item.id !== 'usuarios');
    }
    // Contratista:
    // Restrict access strictly: only dashboard, evidencias, and the activities assigned to their contractor
    return navItems.filter(item => {
      if (item.id === 'dashboard' || item.id === 'evidencias') return true;
      if (item.id === 'usuarios' || item.id === 'auditoria' || item.id === 'lineas' || item.id === 'estructuras' || item.id === 'reportes') return false;
      return storageService.canUserAccessActivity(item.id);
    });
  }, [currentUser, navItems, contratistas]);

  // Auto-redirect if active tab is unauthorized
  useEffect(() => {
    if (!isAuthenticated) return;
    const isAllowed = accessibleNavItems.some(i => i.id === activeTab);
    if (!isAllowed) {
      setActiveTab('dashboard');
    }
  }, [accessibleNavItems, activeTab, isAuthenticated]);

  // If not logged in, show the Login View
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} allUsuarios={usuarios} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        usuarios={usuarios}
        onSwitchUser={handleSwitchUser}
        config={configDrive}
        conflictos={conflictos}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConflictos={() => setIsConflictosOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onSyncComplete={refreshState}
        selectedLineFilter={selectedLineFilter}
        onSelectLineFilter={setSelectedLineFilter}
        availableLines={availableLines}
        onLogout={handleLogout}
      />

      {/* Floating Real-Time Notifications Toast Container */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        {liveToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>{toast.title}</span>
              </div>
              <button
                onClick={() => setLiveToasts(prev => prev.filter(n => n.id !== toast.id))}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-200 mt-1 font-medium">{toast.message}</p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Por: <strong className="text-slate-300">{toast.user}</strong></span>
              <span className="font-mono">{toast.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex-shrink-0 hidden lg:flex flex-col justify-between p-3 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Módulos Operativos
            </div>
            {accessibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Card in Sidebar with Live multi-user status */}
          <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase">Google Drive & Sheets</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[11px] font-mono text-cyan-300 truncate" title="1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y">
              Hoja: 1QSIdzdBvH...
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Radio className="h-3 w-3" />
              <span>Multi-usuario activo</span>
            </div>
          </div>
        </aside>

        {/* Mobile Nav Drawer toggle */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-3.5 bg-cyan-600 text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/80 z-30 p-4 pt-16 flex flex-col justify-end">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-h-[80vh] overflow-y-auto space-y-1">
              {accessibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardView
              lineas={lineas}
              estructuras={estructuras}
              corona={corona}
              deficiencias={deficiencias}
              puestaTierra={puestaTierra}
              termografia={termografia}
              podas={podas}
              mantenimiento={mantenimiento}
              hidrolavado={hidrolavado}
              ordenesMantenimiento={ordenesMantenimiento}
              dms={dms}
              configDrive={configDrive}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'lineas' && (
            <LineasView
              lineas={lineas}
              currentUser={currentUser}
              configDrive={configDrive}
              onRefresh={refreshState}
              onSelectLineDetail={(cod) => {
                setSelectedLineFilter(cod);
                setActiveTab('estructuras');
              }}
            />
          )}

          {activeTab === 'estructuras' && (
            <EstructurasView
              estructuras={estructuras}
              lineas={lineas}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onViewActivityHistory={(cod, pos) => {
                setSelectedLineFilter(cod);
                setActiveTab('reportes');
              }}
            />
          )}

          {activeTab === 'corona' && (
            <CoronaView
              corona={corona}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'deficiencias' && (
            <DeficienciasView
              deficiencias={deficiencias}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'puesta_tierra' && (
            <PuestaTierraView
              puestaTierraList={puestaTierra}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
              onGoToDeficiencias={() => setActiveTab('deficiencias')}
            />
          )}


          {activeTab === 'termografia' && (
            <TermografiaView
              termografia={termografia}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'podas' && (
            <PodasView
              podas={podas}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'mantenimiento' && (
            <MantenimientoView
              mantenimiento={mantenimiento}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'hidrolavado' && (
            <HidrolavadoView
              hidrolavado={hidrolavado}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'ordenes_om' && (
            <OrdenesMantenimientoView
              ordenes={ordenesMantenimiento}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'dms' && (
            <DMSView
              dmsList={dms}
              levantamientos={levantamientos}
              inspecciones={inspecciones}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'evidencias' && (
            <EvidenciasView
              lineas={lineas}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              lineas={lineas}
              estructuras={estructuras}
              corona={corona}
              deficiencias={deficiencias}
              termografia={termografia}
              podas={podas}
              mantenimiento={mantenimiento}
              hidrolavado={hidrolavado}
              dms={dms}
              levantamientos={levantamientos}
              inspecciones={inspecciones}
              auditoria={auditoria}
              puestaTierra={puestaTierra}
              currentUser={currentUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
            />

          )}

          {activeTab === 'auditoria' && (
            <AuditoriaView
              auditoria={auditoria}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'usuarios' && (
            <UsuariosView
              usuarios={usuarios}
              contratistas={contratistas}
              lineas={lineas}
              currentUser={currentUser}
              onRefresh={refreshState}
              onSwitchUser={handleSwitchUser}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ConfiguracionDriveModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={configDrive}
        onRefresh={refreshState}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      <ConflictosModal
        isOpen={isConflictosOpen}
        onClose={() => setIsConflictosOpen(false)}
        conflictos={conflictos}
        onRefresh={refreshState}
      />

      <DocsGuiaModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <PhotoModal
        isOpen={photoModalData.isOpen}
        onClose={handleClosePhoto}
        photoUrl={photoModalData.url}
        title={photoModalData.title}
      />
    </div>
  );
}
