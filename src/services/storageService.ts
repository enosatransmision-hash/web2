import seedData from '../data/seedData.json';
import {
  CATALOGO_DEFICIENCIAS,
  CATALOGO_DEFICIENCIAS_MADERA,
  CATALOGO_DEFICIENCIAS_CONCRETO,
  CATALOGO_DEFICIENCIAS_CELOSIA,
  CATALOGO_DEFICIENCIAS_POR_TIPO,
  CATALOGO_SITUACIONES_CORONA,
  INITIAL_USUARIOS,
  INITIAL_DEFICIENCIAS,
  INITIAL_TERMOGRAFIA,
  INITIAL_PODAS,
  INITIAL_MANTENIMIENTO,
  INITIAL_ORDENES_MANTENIMIENTO,
  INITIAL_DMS,
  INITIAL_LEVANTAMIENTOS,
  INITIAL_INSPECCIONES_CIERRE,
  INITIAL_PUESTA_TIERRA,
  INITIAL_HIDROLAVADO,
  INITIAL_CONTRATISTAS
} from '../data/catalogs';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Termografia,
  Poda,
  Mantenimiento,
  Hidrolavado,
  OrdenMantenimiento,
  ItemRegistroOM,
  TipoActividadOM,
  TipoPosteDeficiencia,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  Usuario,
  Contratista,
  AuditoriaRegistro,
  ConfiguracionDrive,
  EvidenciaFotografica,
  ConflictoRegistro,
  PuestaTierra,
  Prioridad,
  DriveModuleKey
} from '../types';
import { realtimeService } from './realtimeService';
import { ExcelService, DRIVE_MODULE_META } from './excelService';
import {
  applyAuditOnCreate,
  applyAuditOnUpdate,
  applyAuditOnDelete,
  getLimaAuditTimestamp,
  getUserAuditIdentifier
} from '../utils/auditUtils';

const STORAGE_KEYS = {
  CONTRATISTAS: 'st_contratistas_v1',
  LINEAS: 'st_lineas_v1',
  ESTRUCTURAS: 'st_estructuras_v1',
  CORONA: 'st_corona_v1',
  DEFICIENCIAS: 'st_deficiencias_v1',
  PUESTA_TIERRA: 'st_puesta_tierra_v1',
  TERMOGRAFIA: 'st_termografia_v1',
  PODAS: 'st_podas_v1',
  MANTENIMIENTO: 'st_mantenimiento_v1',
  HIDROLAVADO: 'st_hidrolavado_v1',
  ORDENES_MANTENIMIENTO: 'st_ordenes_mantenimiento_v1',
  DMS: 'st_dms_v1',
  LEVANTAMIENTOS: 'st_levantamientos_v1',
  INSPECCIONES: 'st_inspecciones_v1',
  USUARIOS: 'st_usuarios_v1',
  AUDITORIA: 'st_auditoria_v1',
  EVIDENCIAS: 'st_evidencias_v1',
  CONFIG: 'st_config_drive_v1',
  CONFLICTOS: 'st_conflictos_v1',
  CURRENT_USER: 'st_current_user_v1',
  SITUACIONES_CORONA: 'st_situaciones_corona_v1',
  LAST_SERVER_VERSION: 'st_last_server_version_v1',
  USER_TOUCHED_KEYS: 'st_user_touched_keys_v1'
};

// Lightweight IndexedDB mirror so large records (e.g. multiple photos) never fail localStorage 5MB quota
const IDB_NAME = 'SubtransmisionDB';
const IDB_STORE = 'kv';
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openLocalDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

async function idbGet(key: string): Promise<any | null> {
  try {
    const db = await openLocalDB();
    if (!db) return null;
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openLocalDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // ignore IndexedDB failures
  }
}

function safeSetStorageItem(key: string, data: any) {
  // Always persist full payload to IndexedDB (virtually unlimited quota)
  void idbSet(key, data);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[StorageService] localStorage quota fallback for ${key}; stored in IndexedDB.`, err);
  }
}


function getLimaDateTime(): { fecha: string; hora: string } {
  try {
    const now = new Date();
    const formatterFecha = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const formatterHora = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatterFecha.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '29';
    const month = parts.find(p => p.type === 'month')?.value || '10';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    return {
      fecha: `${year}-${month}-${day}`,
      hora: formatterHora.format(now)
    };
  } catch {
    const d = new Date();
    return {
      fecha: d.toISOString().split('T')[0],
      hora: d.toTimeString().split(' ')[0]
    };
  }
}

class StorageService {
  private lineas: LineaSubtransmision[] = [];
  private estructuras: Estructura[] = [];
  private corona: EfectoCorona[] = [];
  private deficiencias: Deficiencia[] = [];
  private puestaTierra: PuestaTierra[] = [];
  private termografia: Termografia[] = [];
  private podas: Poda[] = [];
  private mantenimiento: Mantenimiento[] = [];
  private hidrolavado: Hidrolavado[] = [];
  private ordenesMantenimiento: OrdenMantenimiento[] = [];
  private dms: DMSItem[] = [];
  private levantamientos: LevantamientoDMS[] = [];
  private inspecciones: InspeccionCierreDMS[] = [];
  private usuarios: Usuario[] = [];
  private contratistas: Contratista[] = [];
  private auditoria: AuditoriaRegistro[] = [];
  private evidencias: EvidenciaFotografica[] = [];
  private conflictos: ConflictoRegistro[] = [];
  private situacionesCorona: string[] = [];
  private driveAutoSyncHandler: ((moduleKey: DriveModuleKey) => void) | null = null;
  private config: ConfiguracionDrive = {
    sheet_lineas_id: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
    sheet_lineas_url: 'https://docs.google.com/spreadsheets/d/1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y/edit?gid=0#gid=0',
    sheet_usuarios_id: '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX',
    sheet_usuarios_url: 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true',
    drive_folder_id: '1A9x_DRIVE_FOLDER_SUBTRANSMISION',
    apps_script_url: '',
    auto_sync_interval: 15,
    last_sync_time: '2026-10-29 09:30:00',
    sync_status: 'Conectado',
    module_file_ids: {},
    module_file_urls: {},
    pending_sync_modules: []
  };
  private currentUser: Usuario = INITIAL_USUARIOS[0];
  private changeListeners: Set<() => void> = new Set();
  private userTouchedKeys: Record<string, string[]> = {};
  private lastServerVersion = 0;
  private isReconciling = false;

  constructor() {
    this.loadTrackingMetadata();
    this.init();
    this.setupRealtimeSync();
    void this.initAsync();
  }

  public onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  private notifyChange() {
    for (const fn of this.changeListeners) {
      try {
        fn();
      } catch {
        // ignore listener errors
      }
    }
  }

  private loadTrackingMetadata() {
    try {
      const rawVer = localStorage.getItem(STORAGE_KEYS.LAST_SERVER_VERSION);
      this.lastServerVersion = rawVer ? parseInt(rawVer, 10) || 0 : 0;
    } catch {
      this.lastServerVersion = 0;
    }
    try {
      const rawTouched = localStorage.getItem(STORAGE_KEYS.USER_TOUCHED_KEYS);
      this.userTouchedKeys = rawTouched ? JSON.parse(rawTouched) || {} : {};
    } catch {
      this.userTouchedKeys = {};
    }
  }

  private saveLastServerVersion(version: number) {
    if (!version || typeof version !== 'number') return;
    this.lastServerVersion = version;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SERVER_VERSION, String(version));
    } catch {
      // ignore
    }
  }

  private markEntityKeyTouched(entity: string, key: string) {
    if (!key) return;
    const list = this.userTouchedKeys[entity] || [];
    if (!list.includes(key)) {
      list.push(key);
      // Keep bounded to last 1000 keys per entity
      this.userTouchedKeys[entity] = list.slice(-1000);
      try {
        localStorage.setItem(STORAGE_KEYS.USER_TOUCHED_KEYS, JSON.stringify(this.userTouchedKeys));
      } catch {
        // ignore
      }
    }
  }

  private isKeyTouched(entity: string, key: string): boolean {
    if (!key) return false;
    return (this.userTouchedKeys[entity] || []).includes(key);
  }

  private generateNextId<T extends Record<string, any>>(
    prefix: string,
    list: T[],
    idKey: keyof T,
    padLen = 4
  ): string {
    let maxNum = 0;
    const existingSet = new Set<string>();
    for (const item of list) {
      const val = String(item[idKey] || '');
      if (val) existingSet.add(val);
      const match = val.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    let candidate = `${prefix}${String(maxNum + 1).padStart(padLen, '0')}`;
    while (existingSet.has(candidate)) {
      maxNum += 1;
      candidate = `${prefix}${String(maxNum + 1).padStart(padLen, '0')}`;
    }
    return candidate;
  }

  public registerDriveAutoSyncHandler(handler: (moduleKey: DriveModuleKey) => void) {
    this.driveAutoSyncHandler = handler;
  }

  private notifyDriveAutoSync(moduleKey: DriveModuleKey) {
    if (this.driveAutoSyncHandler) {
      try {
        this.driveAutoSyncHandler(moduleKey);
      } catch (e) {
        console.warn('[StorageService] Auto-sync dispatch notice:', e);
      }
    }
  }

  private init() {
    // 1. Lineas
    const cachedLineas = localStorage.getItem(STORAGE_KEYS.LINEAS);
    if (cachedLineas) {
      try { this.lineas = JSON.parse(cachedLineas); } catch { this.lineas = seedData.lineas as LineaSubtransmision[]; }
    } else {
      this.lineas = seedData.lineas as LineaSubtransmision[];
      this.saveLineas();
    }

    // 2. Estructuras (Postes)
    const cachedEstructuras = localStorage.getItem(STORAGE_KEYS.ESTRUCTURAS);
    if (cachedEstructuras) {
      try { this.estructuras = JSON.parse(cachedEstructuras); } catch { this.estructuras = seedData.estructuras as Estructura[]; }
    } else {
      this.estructuras = seedData.estructuras as Estructura[];
      this.saveEstructuras();
    }

    // 3. Efecto Corona
    const cachedCorona = localStorage.getItem(STORAGE_KEYS.CORONA);
    if (cachedCorona) {
      try {
        const parsed = JSON.parse(cachedCorona);
        this.corona = parsed.map((c: any) => ({
          ...c,
          prioridad: c.prioridad || (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
        }));
      } catch {
        this.corona = (seedData.corona as any[]).map(c => ({
          ...c,
          prioridad: (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
        }));
      }
    } else {
      this.corona = (seedData.corona as any[]).map(c => ({
        ...c,
        prioridad: (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
      }));
      this.saveCorona();
    }

    // 4. Deficiencias
    const cachedDef = localStorage.getItem(STORAGE_KEYS.DEFICIENCIAS);
    if (cachedDef) {
      try { this.deficiencias = JSON.parse(cachedDef); } catch { this.deficiencias = INITIAL_DEFICIENCIAS; }
    } else {
      this.deficiencias = INITIAL_DEFICIENCIAS;
    }
    // Normalizar prioridades: Solo PRIORITARIO y NO PRIORITARIO
    this.deficiencias = this.deficiencias.map(d => ({
      ...d,
      prioridad: (d.prioridad === 'PRIORITARIO' || (d.prioridad as string) === 'ALTO' || (d.prioridad as string) === 'Alta' || (d.prioridad as string) === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
    }));
    this.saveDeficiencias();

    // 4b. Toma de Medición de Puesta a Tierra (PAT)
    const cachedPat = localStorage.getItem(STORAGE_KEYS.PUESTA_TIERRA);
    if (cachedPat) {
      try { this.puestaTierra = JSON.parse(cachedPat); } catch { this.puestaTierra = INITIAL_PUESTA_TIERRA; }
    } else {
      this.puestaTierra = INITIAL_PUESTA_TIERRA;
    }
    this.puestaTierra = this.puestaTierra.map(p => ({
      ...p,
      prioridad: (p.valor_resistencia_pat >= 5.0 || p.prioridad === 'PRIORITARIO' || (p.prioridad as string) === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO',
      alerta_deficiencia: p.valor_resistencia_pat >= 5.0
    }));
    this.savePuestaTierra();


    // 5. Termografia
    const cachedTerm = localStorage.getItem(STORAGE_KEYS.TERMOGRAFIA);
    if (cachedTerm) {
      try { this.termografia = JSON.parse(cachedTerm); } catch { this.termografia = INITIAL_TERMOGRAFIA; }
    } else {
      this.termografia = INITIAL_TERMOGRAFIA;
      this.saveTermografia();
    }

    // 6. Podas
    const cachedPodas = localStorage.getItem(STORAGE_KEYS.PODAS);
    if (cachedPodas) {
      try { this.podas = JSON.parse(cachedPodas); } catch { this.podas = INITIAL_PODAS; }
    } else {
      this.podas = INITIAL_PODAS;
      this.savePodas();
    }

    // 7. Mantenimiento
    const cachedMant = localStorage.getItem(STORAGE_KEYS.MANTENIMIENTO);
    if (cachedMant) {
      try {
        const parsed = JSON.parse(cachedMant);
        this.mantenimiento = parsed.length > 0 ? parsed : INITIAL_MANTENIMIENTO;
      } catch {
        this.mantenimiento = INITIAL_MANTENIMIENTO;
      }
    } else {
      this.mantenimiento = INITIAL_MANTENIMIENTO;
      this.saveMantenimiento();
    }

    // 7b. Hidrolavado
    const cachedHidro = localStorage.getItem(STORAGE_KEYS.HIDROLAVADO);
    if (cachedHidro) {
      try {
        const parsedH = JSON.parse(cachedHidro);
        this.hidrolavado = parsedH.length > 0 ? parsedH : INITIAL_HIDROLAVADO;
      } catch {
        this.hidrolavado = INITIAL_HIDROLAVADO;
      }
    } else {
      this.hidrolavado = INITIAL_HIDROLAVADO;
      this.saveHidrolavado();
    }

    // 7.1 Órdenes de Mantenimiento
    const cachedOM = localStorage.getItem(STORAGE_KEYS.ORDENES_MANTENIMIENTO);
    if (cachedOM) {
      try {
        const parsedOM = JSON.parse(cachedOM);
        this.ordenesMantenimiento = parsedOM.length > 0 ? parsedOM : INITIAL_ORDENES_MANTENIMIENTO;
      } catch {
        this.ordenesMantenimiento = INITIAL_ORDENES_MANTENIMIENTO;
      }
    } else {
      this.ordenesMantenimiento = INITIAL_ORDENES_MANTENIMIENTO;
      this.saveOrdenesMantenimiento();
    }

    // 8. DMS
    const cachedDms = localStorage.getItem(STORAGE_KEYS.DMS);
    if (cachedDms) {
      try { this.dms = JSON.parse(cachedDms); } catch { this.dms = INITIAL_DMS; }
    } else {
      this.dms = INITIAL_DMS;
      this.saveDMS();
    }

    // 9. Levantamientos
    const cachedLev = localStorage.getItem(STORAGE_KEYS.LEVANTAMIENTOS);
    if (cachedLev) {
      try { this.levantamientos = JSON.parse(cachedLev); } catch { this.levantamientos = INITIAL_LEVANTAMIENTOS; }
    } else {
      this.levantamientos = INITIAL_LEVANTAMIENTOS;
      this.saveLevantamientos();
    }

    // 10. Inspecciones Cierre
    const cachedInsp = localStorage.getItem(STORAGE_KEYS.INSPECCIONES);
    if (cachedInsp) {
      try { this.inspecciones = JSON.parse(cachedInsp); } catch { this.inspecciones = INITIAL_INSPECCIONES_CIERRE; }
    } else {
      this.inspecciones = INITIAL_INSPECCIONES_CIERRE;
      this.saveInspecciones();
    }

    // 11. Usuarios
    const cachedUsers = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    if (cachedUsers) {
      try { this.usuarios = JSON.parse(cachedUsers); } catch { this.usuarios = INITIAL_USUARIOS; }
    } else {
      this.usuarios = INITIAL_USUARIOS;
      this.saveUsuarios();
    }

    // 11.1 Contratistas
    const cachedContratistas = localStorage.getItem(STORAGE_KEYS.CONTRATISTAS);
    if (cachedContratistas) {
      try { this.contratistas = JSON.parse(cachedContratistas); } catch { this.contratistas = INITIAL_CONTRATISTAS; }
    } else {
      this.contratistas = INITIAL_CONTRATISTAS;
      this.saveContratistas();
    }

    // 12. Current User
    const cachedCurrUser = localStorage.getItem('st_auth_user');
    if (cachedCurrUser) {
      try {
        this.currentUser = JSON.parse(cachedCurrUser);
      } catch {
        this.currentUser = this.usuarios[0] || INITIAL_USUARIOS[0];
      }
    }

    // 13. Auditoria
    const cachedAudit = localStorage.getItem(STORAGE_KEYS.AUDITORIA);
    if (cachedAudit) {
      try { this.auditoria = JSON.parse(cachedAudit); } catch { this.auditoria = []; }
    } else {
      const { fecha, hora } = getLimaDateTime();
      this.auditoria = [
        {
          id_auditoria: 'AUD-INIT-001',
          usuario: 'Sistema',
          rol: 'Administrador',
          fecha,
          hora,
          accion: 'IMPORTACION',
          modulo: 'INICIALIZACION',
          id_registro: 'DATASETS',
          cod_linea: 'TODAS',
          estructura: '-',
          valores_anteriores: 'Base vacía',
          valores_nuevos: `Cargadas 27 líneas, 1087 estructuras y 222 mediciones efecto corona`,
          origen: 'Importación Excel',
          resultado: 'Exitoso',
          sync_id: 'SYNC-001'
        }
      ];
      this.saveAuditoria();
    }

    // 14. Situaciones Corona
    const cachedSit = localStorage.getItem(STORAGE_KEYS.SITUACIONES_CORONA);
    if (cachedSit) {
      try { this.situacionesCorona = JSON.parse(cachedSit); } catch { this.situacionesCorona = CATALOGO_SITUACIONES_CORONA; }
    } else {
      this.situacionesCorona = CATALOGO_SITUACIONES_CORONA;
    }

    // 15. Config Drive
    const cachedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (cachedConfig) {
      try { this.config = { ...this.config, ...JSON.parse(cachedConfig) }; } catch { /* ignore */ }
    }

    // Normalizar campos de auditoría para todos los registros existentes
    this.lineas = this.normalizeListAudit(this.lineas);
    this.estructuras = this.normalizeListAudit(this.estructuras);
    this.corona = this.normalizeListAudit(this.corona);
    this.deficiencias = this.normalizeListAudit(this.deficiencias);
    this.puestaTierra = this.normalizeListAudit(this.puestaTierra);
    this.termografia = this.normalizeListAudit(this.termografia);
    this.podas = this.normalizeListAudit(this.podas);
    this.mantenimiento = this.normalizeListAudit(this.mantenimiento);
    this.hidrolavado = this.normalizeListAudit(this.hidrolavado);
    this.ordenesMantenimiento = this.normalizeListAudit(this.ordenesMantenimiento);
    this.dms = this.normalizeListAudit(this.dms);
    this.levantamientos = this.normalizeListAudit(this.levantamientos);
    this.inspecciones = this.normalizeListAudit(this.inspecciones);
    this.usuarios = this.normalizeListAudit(this.usuarios);
    this.contratistas = this.normalizeListAudit(this.contratistas);
  }

  private async initAsync() {
    await this.hydrateFromIndexedDB();
    await realtimeService.flushPendingMutations();
    await this.syncWithServer();
  }

  private async hydrateFromIndexedDB() {
    const mergeIDB = async <T extends Record<string, any>>(
      storageKey: string,
      currentList: T[],
      idProp: keyof T,
      altProp?: keyof T
    ): Promise<{ list: T[]; changed: boolean }> => {
      const cached = await idbGet(storageKey);
      if (!Array.isArray(cached) || cached.length === 0) {
        return { list: currentList, changed: false };
      }
      const next = [...currentList];
      let changed = false;
      for (const item of cached) {
        if (!item || typeof item !== 'object') continue;
        const primary = item[idProp];
        const alt = altProp ? item[altProp] : undefined;
        const idx = next.findIndex(x =>
          (primary && x[idProp] === primary) ||
          (alt && altProp && x[altProp] === alt)
        );
        if (idx === -1) {
          next.unshift(item);
          changed = true;
        }
      }
      return { list: changed ? this.normalizeListAudit(next) : currentList, changed };
    };

    let anyChanged = false;
    const apply = async <T extends Record<string, any>>(key: string, list: T[], idProp: keyof T, altProp?: keyof T) => {
      const res = await mergeIDB(key, list, idProp, altProp);
      if (res.changed) anyChanged = true;
      return res.list;
    };

    this.lineas = await apply(STORAGE_KEYS.LINEAS, this.lineas, 'cod_linea', 'id_linea');
    this.estructuras = await apply(STORAGE_KEYS.ESTRUCTURAS, this.estructuras, 'id_poste');
    this.corona = await apply(STORAGE_KEYS.CORONA, this.corona, 'id_corona');
    this.deficiencias = await apply(STORAGE_KEYS.DEFICIENCIAS, this.deficiencias, 'id_deficiencia');
    this.puestaTierra = await apply(STORAGE_KEYS.PUESTA_TIERRA, this.puestaTierra, 'id_pat');
    this.termografia = await apply(STORAGE_KEYS.TERMOGRAFIA, this.termografia, 'id_termografia');
    this.podas = await apply(STORAGE_KEYS.PODAS, this.podas, 'id_poda');
    this.mantenimiento = await apply(STORAGE_KEYS.MANTENIMIENTO, this.mantenimiento, 'id_mantenimiento');
    this.hidrolavado = await apply(STORAGE_KEYS.HIDROLAVADO, this.hidrolavado, 'id_hidrolavado');
    this.ordenesMantenimiento = await apply(STORAGE_KEYS.ORDENES_MANTENIMIENTO, this.ordenesMantenimiento, 'id_om', 'numero_om');
    this.dms = await apply(STORAGE_KEYS.DMS, this.dms, 'id_dms', 'codigo_dms');
    this.levantamientos = await apply(STORAGE_KEYS.LEVANTAMIENTOS, this.levantamientos, 'id_levantamiento');
    this.inspecciones = await apply(STORAGE_KEYS.INSPECCIONES, this.inspecciones, 'id_inspeccion_cierre');
    this.usuarios = await apply(STORAGE_KEYS.USUARIOS, this.usuarios, 'id_usuario', 'username');
    this.contratistas = await apply(STORAGE_KEYS.CONTRATISTAS, this.contratistas, 'id_contratista', 'ruc');

    if (anyChanged) {
      this.notifyChange();
    }
  }

  private normalizeListAudit<T>(list: T[]): T[] {
    if (!Array.isArray(list)) return [];
    const defaultUser = getUserAuditIdentifier(this.currentUser);
    const now = getLimaAuditTimestamp();
    return list.map(item => {
      if (!item || typeof item !== 'object') return item;
      const anyItem = item as any;
      const user = anyItem.usuario_registro || anyItem.Usuario_Registro || defaultUser;
      const fecha = anyItem.fecha_hora_movimiento || anyItem.Fecha_Hora_Movimiento || now;
      const estado = anyItem.estado_registro || anyItem.Estado_Registro || 'Activo';
      return {
        ...anyItem,
        usuario_registro: user,
        Usuario_Registro: user,
        fecha_hora_movimiento: fecha,
        Fecha_Hora_Movimiento: fecha,
        estado_registro: estado,
        Estado_Registro: estado
      };
    });
  }

  public async syncWithServer(): Promise<void> {
    try {
      await realtimeService.flushPendingMutations();
      const res = await fetch('/api/state');
      if (res.ok) {
        const serverState = await res.json();
        this.applyFullServerState(serverState);
        this.notifyChange();
      }
    } catch {
      // Offline mode: local cache & IndexedDB remain intact
    }
  }

  private setupRealtimeSync() {
    realtimeService.onStateUpdate((entity, action, data, fullState) => {
      if (action === 'init' && fullState) {
        this.applyFullServerState(fullState);
      } else {
        this.applyRemotePatch(entity, action, data);
      }
      this.notifyChange();
    });
  }

  private mergeServerAndLocalList<T extends Record<string, any>>(
    entityKey: string,
    localList: T[],
    serverList: T[],
    idProp: keyof T,
    altIdProp?: keyof T,
    isServerReset = false
  ): { merged: T[]; localOnly: T[] } {
    const normalizedServer = this.normalizeListAudit(Array.isArray(serverList) ? serverList : []);
    const result: T[] = [...normalizedServer];
    const localOnly: T[] = [];

    for (const localItem of localList) {
      if (!localItem || typeof localItem !== 'object') continue;
      const primaryId = String(localItem[idProp] || '');
      const altId = altIdProp ? String(localItem[altIdProp] || '') : '';
      const existsInServer = normalizedServer.some(srv =>
        (primaryId && String(srv[idProp] || '') === primaryId) ||
        (altId && altIdProp && String(srv[altIdProp] || '') === altId)
      );

      if (!existsInServer) {
        const touched =
          (primaryId && this.isKeyTouched(entityKey, primaryId)) ||
          (altId && this.isKeyTouched(entityKey, altId));
        if (touched || isServerReset) {
          result.unshift(localItem);
          localOnly.push(localItem);
        }
      }
    }

    return { merged: result, localOnly };
  }

  private async reconcileMissingWithServer(localOnlyByEntity: Record<string, any[]>) {
    if (this.isReconciling) return;
    const totalToPush = Object.values(localOnlyByEntity).reduce((sum, arr) => sum + arr.length, 0);
    if (totalToPush === 0) return;

    this.isReconciling = true;
    try {
      const res = await fetch('/api/state/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entities: localOnlyByEntity,
          user: this.currentUser
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state?.version) {
          this.saveLastServerVersion(data.state.version);
        }
      }
    } catch {
      // Will retry on next sync
    } finally {
      this.isReconciling = false;
    }
  }

  public applyFullServerState(s: any) {
    if (!s || typeof s !== 'object') return;

    const incomingVersion = typeof s.version === 'number' ? s.version : 0;
    const isServerReset = this.lastServerVersion > 0 && incomingVersion > 0 && incomingVersion < this.lastServerVersion;
    const localOnlyPayload: Record<string, any[]> = {};

    if (s.lineas) {
      const res = this.mergeServerAndLocalList('lineas', this.lineas, s.lineas, 'cod_linea', 'id_linea', isServerReset);
      this.lineas = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.lineas = res.localOnly;
      this.saveLineas();
    }
    if (s.estructuras) {
      const res = this.mergeServerAndLocalList('estructuras', this.estructuras, s.estructuras, 'id_poste', undefined, isServerReset);
      this.estructuras = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.estructuras = res.localOnly;
      this.saveEstructuras();
    }
    if (s.corona) {
      const res = this.mergeServerAndLocalList('corona', this.corona, s.corona, 'id_corona', undefined, isServerReset);
      this.corona = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.corona = res.localOnly;
      this.saveCorona();
    }
    if (s.deficiencias) {
      const srvDef = s.deficiencias.map((d: any) => ({
        ...d,
        prioridad: (d.prioridad === 'PRIORITARIO' || d.prioridad === 'ALTO' || d.prioridad === 'Alta' || d.prioridad === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
      }));
      const res = this.mergeServerAndLocalList('deficiencias', this.deficiencias, srvDef, 'id_deficiencia', undefined, isServerReset);
      this.deficiencias = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.deficiencias = res.localOnly;
      this.saveDeficiencias();
    }
    if (s.puestaTierra) {
      const srvPat = s.puestaTierra.map((p: any) => ({
        ...p,
        prioridad: (p.valor_resistencia_pat >= 5.0 || p.prioridad === 'PRIORITARIO' || p.prioridad === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO',
        alerta_deficiencia: p.valor_resistencia_pat >= 5.0
      }));
      const res = this.mergeServerAndLocalList('puesta_tierra', this.puestaTierra, srvPat, 'id_pat', undefined, isServerReset);
      this.puestaTierra = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.puestaTierra = res.localOnly;
      this.savePuestaTierra();
    }
    if (s.termografia) {
      const res = this.mergeServerAndLocalList('termografia', this.termografia, s.termografia, 'id_termografia', undefined, isServerReset);
      this.termografia = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.termografia = res.localOnly;
      this.saveTermografia();
    }
    if (s.podas) {
      const res = this.mergeServerAndLocalList('podas', this.podas, s.podas, 'id_poda', undefined, isServerReset);
      this.podas = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.podas = res.localOnly;
      this.savePodas();
    }
    if (s.mantenimiento) {
      const res = this.mergeServerAndLocalList('mantenimiento', this.mantenimiento, s.mantenimiento, 'id_mantenimiento', undefined, isServerReset);
      this.mantenimiento = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.mantenimiento = res.localOnly;
      this.saveMantenimiento();
    }
    if (s.hidrolavado) {
      const res = this.mergeServerAndLocalList('hidrolavado', this.hidrolavado, s.hidrolavado, 'id_hidrolavado', undefined, isServerReset);
      this.hidrolavado = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.hidrolavado = res.localOnly;
      this.saveHidrolavado();
    }
    if (s.ordenes_om) {
      const res = this.mergeServerAndLocalList('ordenes_om', this.ordenesMantenimiento, s.ordenes_om, 'id_om', 'numero_om', isServerReset);
      this.ordenesMantenimiento = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.ordenes_om = res.localOnly;
      this.saveOrdenesMantenimiento();
    }
    if (s.dms) {
      const res = this.mergeServerAndLocalList('dms', this.dms, s.dms, 'id_dms', 'codigo_dms', isServerReset);
      this.dms = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.dms = res.localOnly;
      this.saveDMS();
    }
    if (s.levantamientos) {
      const res = this.mergeServerAndLocalList('levantamientos', this.levantamientos, s.levantamientos, 'id_levantamiento', undefined, isServerReset);
      this.levantamientos = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.levantamientos = res.localOnly;
      this.saveLevantamientos();
    }
    if (s.inspecciones) {
      const res = this.mergeServerAndLocalList('inspecciones', this.inspecciones, s.inspecciones, 'id_inspeccion_cierre', undefined, isServerReset);
      this.inspecciones = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.inspecciones = res.localOnly;
      this.saveInspecciones();
    }
    if (s.usuarios) {
      const res = this.mergeServerAndLocalList('usuarios', this.usuarios, s.usuarios, 'id_usuario', 'username', isServerReset);
      this.usuarios = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.usuarios = res.localOnly;
      this.saveUsuarios();
    }
    if (s.contratistas) {
      const res = this.mergeServerAndLocalList('contratistas', this.contratistas, s.contratistas, 'id_contratista', 'ruc', isServerReset);
      this.contratistas = res.merged;
      if (res.localOnly.length > 0) localOnlyPayload.contratistas = res.localOnly;
      this.saveContratistas();
    }
    if (s.auditoria) {
      this.auditoria = s.auditoria;
      this.saveAuditoria();
    }
    if (s.config) {
      this.config = { ...this.config, ...s.config };
      safeSetStorageItem(STORAGE_KEYS.CONFIG, this.config);
    }

    // Re-apply any queued offline mutations not yet acknowledged by server
    const pending = realtimeService.getPendingMutations();
    if (pending.length > 0) {
      for (const mut of pending) {
        this.applyRemotePatch(mut.entity, mut.action, mut.data);
      }
    }

    if (incomingVersion > 0) {
      this.saveLastServerVersion(incomingVersion);
    }

    if (Object.keys(localOnlyPayload).length > 0) {
      void this.reconcileMissingWithServer(localOnlyPayload);
    }
  }

  public applyRemotePatch(entity: string, action: string, data: any) {
    const auditUser = data?.usuario_registro || data?.Usuario_Registro || getUserAuditIdentifier(this.currentUser);
    const auditTime = data?.fecha_hora_movimiento || data?.Fecha_Hora_Movimiento || getLimaAuditTimestamp();

    switch (entity) {
      case 'lineas':
        if (action === 'create') {
          if (!this.lineas.some(l => l.cod_linea === data.cod_linea)) this.lineas.push(data);
        } else if (action === 'update' || action === 'deactivate') {
          const idx = this.lineas.findIndex(l => l.cod_linea === data.cod_linea);
          if (idx >= 0) this.lineas[idx] = { ...this.lineas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.lineas.findIndex(l => l.cod_linea === data.cod_linea || l.id_linea === data.id_linea);
          if (idx >= 0) {
            this.lineas[idx] = {
              ...this.lineas[idx],
              estado: 'Inactivo',
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.lineas.findIndex(l => l.cod_linea === data.cod_linea || l.id_linea === data.id_linea);
          if (idx >= 0) {
            this.lineas[idx] = {
              ...this.lineas[idx],
              estado: 'Activo',
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.lineas = this.normalizeListAudit(data);
        }
        this.saveLineas();
        break;

      case 'estructuras':
        if (action === 'create') {
          const exists = this.estructuras.some(e => e.id_poste === data.id_poste);
          if (!exists) this.estructuras.push(data);
        } else if (action === 'update') {
          const idx = this.estructuras.findIndex(e => e.id_poste === data.id_poste);
          if (idx >= 0) this.estructuras[idx] = { ...this.estructuras[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.estructuras.findIndex(e => (data.id_poste && e.id_poste === data.id_poste) || (e.cod_linea === data.cod_linea && e.poste_n === data.poste_n));
          if (idx >= 0) {
            this.estructuras[idx] = {
              ...this.estructuras[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.estructuras.findIndex(e => (data.id_poste && e.id_poste === data.id_poste) || (e.cod_linea === data.cod_linea && e.poste_n === data.poste_n));
          if (idx >= 0) {
            this.estructuras[idx] = {
              ...this.estructuras[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch') {
          this.estructuras = data;
        }
        this.saveEstructuras();
        break;

      case 'corona':
        if (action === 'create') {
          if (!this.corona.some(c => c.id_corona === data.id_corona)) this.corona.unshift(data);
        } else if (action === 'update') {
          const idx = this.corona.findIndex(c => c.id_corona === data.id_corona);
          if (idx >= 0) this.corona[idx] = { ...this.corona[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.corona.findIndex(c => c.id_corona === data.id_corona);
          if (idx >= 0) {
            this.corona[idx] = {
              ...this.corona[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.corona.findIndex(c => c.id_corona === data.id_corona);
          if (idx >= 0) {
            this.corona[idx] = {
              ...this.corona[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.corona = this.normalizeListAudit(data);
        }
        this.saveCorona();
        break;

      case 'deficiencias':
        if (action === 'create') {
          const normalized = {
            ...data,
            prioridad: (data.prioridad === 'PRIORITARIO' || data.prioridad === 'ALTO' || data.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
          };
          if (!this.deficiencias.some(d => d.id_deficiencia === data.id_deficiencia)) this.deficiencias.unshift(normalized);
        } else if (action === 'update') {
          const idx = this.deficiencias.findIndex(d => d.id_deficiencia === data.id_deficiencia);
          if (idx >= 0) {
            this.deficiencias[idx] = {
              ...this.deficiencias[idx],
              ...data,
              prioridad: (data.prioridad === 'PRIORITARIO' || data.prioridad === 'ALTO' || data.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
            };
          }
        } else if (action === 'delete') {
          const idx = this.deficiencias.findIndex(d => d.id_deficiencia === data.id_deficiencia);
          if (idx >= 0) {
            this.deficiencias[idx] = {
              ...this.deficiencias[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.deficiencias.findIndex(d => d.id_deficiencia === data.id_deficiencia);
          if (idx >= 0) {
            this.deficiencias[idx] = {
              ...this.deficiencias[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.deficiencias = this.normalizeListAudit(data);
        }
        this.saveDeficiencias();
        break;

      case 'puesta_tierra':
        if (action === 'create') {
          const isCritico = data.valor_resistencia_pat >= 5.0;
          const normalized = {
            ...data,
            prioridad: isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO',
            alerta_deficiencia: isCritico
          };
          if (!this.puestaTierra.some(p => p.id_pat === data.id_pat)) this.puestaTierra.unshift(normalized);
        } else if (action === 'update') {
          const idx = this.puestaTierra.findIndex(p => p.id_pat === data.id_pat);
          if (idx >= 0) {
            const val = data.valor_resistencia_pat !== undefined ? data.valor_resistencia_pat : this.puestaTierra[idx].valor_resistencia_pat;
            const isCritico = val >= 5.0;
            this.puestaTierra[idx] = {
              ...this.puestaTierra[idx],
              ...data,
              prioridad: isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO',
              alerta_deficiencia: isCritico
            };
          }
        } else if (action === 'delete') {
          const idx = this.puestaTierra.findIndex(p => p.id_pat === data.id_pat || (data.cod_linea && data.poste_n && p.cod_linea === data.cod_linea && String(p.poste_n).trim() === String(data.poste_n).trim()));
          if (idx >= 0) {
            this.puestaTierra[idx] = {
              ...this.puestaTierra[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.puestaTierra.findIndex(p => p.id_pat === data.id_pat);
          if (idx >= 0) {
            this.puestaTierra[idx] = {
              ...this.puestaTierra[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.puestaTierra = this.normalizeListAudit(data);
        }
        this.savePuestaTierra();
        break;

      case 'termografia':
        if (action === 'create') {
          if (!this.termografia.some(t => t.id_termografia === data.id_termografia)) this.termografia.unshift(data);
        } else if (action === 'update') {
          const idx = this.termografia.findIndex(t => t.id_termografia === data.id_termografia);
          if (idx >= 0) this.termografia[idx] = { ...this.termografia[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.termografia.findIndex(t => t.id_termografia === data.id_termografia);
          if (idx >= 0) {
            this.termografia[idx] = {
              ...this.termografia[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.termografia.findIndex(t => t.id_termografia === data.id_termografia);
          if (idx >= 0) {
            this.termografia[idx] = {
              ...this.termografia[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.termografia = this.normalizeListAudit(data);
        }
        this.saveTermografia();
        break;

      case 'podas':
        if (action === 'create') {
          if (!this.podas.some(p => p.id_poda === data.id_poda)) this.podas.unshift(data);
        } else if (action === 'update') {
          const idx = this.podas.findIndex(p => p.id_poda === data.id_poda);
          if (idx >= 0) this.podas[idx] = { ...this.podas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.podas.findIndex(p => p.id_poda === data.id_poda);
          if (idx >= 0) {
            this.podas[idx] = {
              ...this.podas[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.podas.findIndex(p => p.id_poda === data.id_poda);
          if (idx >= 0) {
            this.podas[idx] = {
              ...this.podas[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.podas = this.normalizeListAudit(data);
        }
        this.savePodas();
        break;

      case 'mantenimiento':
        if (action === 'create') {
          if (!this.mantenimiento.some(m => m.id_mantenimiento === data.id_mantenimiento)) this.mantenimiento.unshift(data);
        } else if (action === 'update') {
          const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === data.id_mantenimiento);
          if (idx >= 0) this.mantenimiento[idx] = { ...this.mantenimiento[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === data.id_mantenimiento);
          if (idx >= 0) {
            this.mantenimiento[idx] = {
              ...this.mantenimiento[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === data.id_mantenimiento);
          if (idx >= 0) {
            this.mantenimiento[idx] = {
              ...this.mantenimiento[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.mantenimiento = this.normalizeListAudit(data);
        }
        this.saveMantenimiento();
        break;

      case 'hidrolavado':
        if (action === 'create') {
          if (!this.hidrolavado.some(h => h.id_hidrolavado === data.id_hidrolavado)) this.hidrolavado.unshift(data);
        } else if (action === 'update') {
          const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === data.id_hidrolavado);
          if (idx >= 0) this.hidrolavado[idx] = { ...this.hidrolavado[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === data.id_hidrolavado);
          if (idx >= 0) {
            this.hidrolavado[idx] = {
              ...this.hidrolavado[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === data.id_hidrolavado);
          if (idx >= 0) {
            this.hidrolavado[idx] = {
              ...this.hidrolavado[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.hidrolavado = this.normalizeListAudit(data);
        }
        this.saveHidrolavado();
        break;

      case 'ordenes_om':
        if (action === 'create') {
          if (!this.ordenesMantenimiento.some(o => o.id_om === data.id_om)) this.ordenesMantenimiento.unshift(data);
        } else if (action === 'update') {
          const idx = this.ordenesMantenimiento.findIndex(o => o.id_om === data.id_om);
          if (idx >= 0) this.ordenesMantenimiento[idx] = { ...this.ordenesMantenimiento[idx], ...data };
        } else if (action === 'delete') {
          const targetId = data.id_om;
          const targetNum = data.numero_om;
          const idx = this.ordenesMantenimiento.findIndex(o => (targetId && o.id_om === targetId) || (targetNum && o.numero_om === targetNum));
          const numToClean = idx >= 0 ? this.ordenesMantenimiento[idx].numero_om : targetNum;
          if (idx >= 0) {
            this.ordenesMantenimiento[idx] = {
              ...this.ordenesMantenimiento[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
          if (numToClean) {
            let defCleaned = false;
            this.deficiencias.forEach(d => {
              if (d.numero_om === numToClean || d.numero_om === targetId) {
                d.numero_om = '';
                defCleaned = true;
              }
            });
            if (defCleaned) this.saveDeficiencias();

            let mantCleaned = false;
            this.mantenimiento.forEach(m => {
              if (m.orden_mantenimiento === numToClean || m.orden_mantenimiento === targetId) {
                m.orden_mantenimiento = '';
                mantCleaned = true;
              }
            });
            if (mantCleaned) this.saveMantenimiento();
          }
        } else if (action === 'restore') {
          const targetId = data.id_om;
          const targetNum = data.numero_om;
          const idx = this.ordenesMantenimiento.findIndex(o => (targetId && o.id_om === targetId) || (targetNum && o.numero_om === targetNum));
          if (idx >= 0) {
            this.ordenesMantenimiento[idx] = {
              ...this.ordenesMantenimiento[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.ordenesMantenimiento = this.normalizeListAudit(data);
        }
        this.saveOrdenesMantenimiento();
        break;

      case 'dms':
        if (action === 'create') {
          if (!this.dms.some(d => d.id_dms === data.id_dms)) this.dms.unshift(data);
        } else if (action === 'update') {
          const idx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (idx >= 0) this.dms[idx] = { ...this.dms[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.dms.findIndex(d => d.id_dms === data.id_dms || (data.codigo_dms && d.codigo_dms === data.codigo_dms));
          if (idx >= 0) {
            this.dms[idx] = {
              ...this.dms[idx],
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.dms.findIndex(d => d.id_dms === data.id_dms || (data.codigo_dms && d.codigo_dms === data.codigo_dms));
          if (idx >= 0) {
            this.dms[idx] = {
              ...this.dms[idx],
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch') {
          this.importDMSBatch(data, false);
        }
        this.saveDMS();
        break;

      case 'levantamientos':
        if (action === 'create') {
          if (!this.levantamientos.some(l => l.id_levantamiento === data.id_levantamiento)) this.levantamientos.unshift(data);
          const dmsIdx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (dmsIdx >= 0) this.dms[dmsIdx].estado = 'Levantada';
          this.saveDMS();
        } else if (action === 'batch' && Array.isArray(data)) {
          this.levantamientos = this.normalizeListAudit(data);
        }
        this.saveLevantamientos();
        break;

      case 'inspecciones':
        if (action === 'create') {
          if (!this.inspecciones.some(i => i.id_inspeccion_cierre === data.id_inspeccion_cierre)) this.inspecciones.unshift(data);
          const dmsIdx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (dmsIdx >= 0) {
            this.dms[dmsIdx].estado = data.resultado === 'Levantamiento conforme' ? 'Cerrada' : 'En Levantamiento';
            this.saveDMS();
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.inspecciones = this.normalizeListAudit(data);
        }
        this.saveInspecciones();
        break;

      case 'usuarios':
        if (action === 'create') {
          if (!this.usuarios.some(u => u.id_usuario === data.id_usuario)) this.usuarios.push(data);
        } else if (action === 'update') {
          const idx = this.usuarios.findIndex(u => u.id_usuario === data.id_usuario);
          if (idx >= 0) this.usuarios[idx] = { ...this.usuarios[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.usuarios.findIndex(u => u.id_usuario === data.id_usuario);
          if (idx >= 0) {
            this.usuarios[idx] = {
              ...this.usuarios[idx],
              estado: 'Inactivo',
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.usuarios.findIndex(u => u.id_usuario === data.id_usuario);
          if (idx >= 0) {
            this.usuarios[idx] = {
              ...this.usuarios[idx],
              estado: 'Activo',
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.usuarios = this.normalizeListAudit(data);
        }
        this.saveUsuarios();
        break;

      case 'contratistas':
        if (action === 'create') {
          if (!this.contratistas.some(c => c.id_contratista === data.id_contratista)) this.contratistas.push(data);
        } else if (action === 'update') {
          const idx = this.contratistas.findIndex(c => c.id_contratista === data.id_contratista);
          if (idx >= 0) this.contratistas[idx] = { ...this.contratistas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.contratistas.findIndex(c => c.id_contratista === data.id_contratista);
          if (idx >= 0) {
            this.contratistas[idx] = {
              ...this.contratistas[idx],
              estado: 'Inactivo',
              estado_registro: 'Eliminado',
              Estado_Registro: 'Eliminado',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'restore') {
          const idx = this.contratistas.findIndex(c => c.id_contratista === data.id_contratista);
          if (idx >= 0) {
            this.contratistas[idx] = {
              ...this.contratistas[idx],
              estado: 'Activo',
              estado_registro: 'Activo',
              Estado_Registro: 'Activo',
              usuario_registro: auditUser,
              Usuario_Registro: auditUser,
              fecha_hora_movimiento: auditTime,
              Fecha_Hora_Movimiento: auditTime
            };
          }
        } else if (action === 'batch' && Array.isArray(data)) {
          this.contratistas = this.normalizeListAudit(data);
        }
        this.saveContratistas();
        break;

      case 'auditoria':
        if (action === 'batch' && Array.isArray(data)) {
          this.auditoria = [...data, ...this.auditoria].slice(0, 1000);
          this.saveAuditoria();
        }
        break;

      case 'config':
        if (data && typeof data === 'object') {
          this.config = { ...this.config, ...data };
          safeSetStorageItem(STORAGE_KEYS.CONFIG, this.config);
        }
        break;
    }
  }

  // --- CURRENT USER & AUTH ---
  getCurrentUser(): Usuario {
    return this.currentUser;
  }

  setCurrentUser(userOrUsername: string | Usuario): boolean {
    if (typeof userOrUsername === 'string') {
      const found = this.usuarios.find(u => u.username === userOrUsername);
      if (found) {
        const { password: _pw, ...safeUser } = found;
        this.currentUser = safeUser as Usuario;
        localStorage.setItem('st_auth_user', JSON.stringify(safeUser));
        realtimeService.identify(safeUser);
        return true;
      }
      return false;
    } else {
      const { password: _pw, ...safeUser } = userOrUsername;
      this.currentUser = safeUser as Usuario;
      localStorage.setItem('st_auth_user', JSON.stringify(safeUser));
      realtimeService.identify(safeUser);
      return true;
    }
  }

  logout() {
    localStorage.removeItem('st_auth_token');
    localStorage.removeItem('st_auth_user');
    realtimeService.disconnectUser();
  }

  canAccessLine(codLinea: string): boolean {
    if (this.currentUser.rol === 'Administrador') return true;
    if (this.currentUser.lineas_asignadas.includes('*')) return true;
    return this.currentUser.lineas_asignadas.includes(codLinea);
  }

  getAccessibleLines(): LineaSubtransmision[] {
    if (this.currentUser.rol === 'Administrador' || this.currentUser.lineas_asignadas.includes('*')) {
      return this.lineas;
    }
    return this.lineas.filter(l => this.currentUser.lineas_asignadas.includes(l.cod_linea));
  }

  canManageStructures(): boolean {
    return this.currentUser.rol === 'Administrador';
  }

  canCloseDMS(): boolean {
    return this.currentUser.rol === 'Administrador' || this.currentUser.rol === 'Supervisor';
  }

  canManageUsers(): boolean {
    return this.currentUser.rol === 'Administrador';
  }

  canManageContractors(): boolean {
    return this.currentUser.rol === 'Administrador';
  }

  getUserContractor(): Contratista | undefined {
    if (this.currentUser.rol !== 'Contratista') return undefined;
    if (this.currentUser.id_contratista) {
      const found = this.contratistas.find(c => c.id_contratista === this.currentUser.id_contratista);
      if (found) return found;
    }
    if (this.currentUser.contratista_nombre) {
      const found = this.contratistas.find(c => c.razon_social.toLowerCase() === this.currentUser.contratista_nombre?.toLowerCase());
      if (found) return found;
    }
    return this.contratistas.find(c =>
      c.email.toLowerCase() === this.currentUser.email.toLowerCase() ||
      this.currentUser.username.toLowerCase().includes(c.id_contratista.toLowerCase())
    );
  }

  canUserAccessActivity(activityKey: string): boolean {
    if (this.currentUser.rol === 'Administrador') return true;
    if (this.currentUser.rol === 'Supervisor') {
      // Supervisor can monitor and review all field activities
      return true;
    }
    if (this.currentUser.rol === 'Contratista') {
      const userCtr = this.getUserContractor();
      if (!userCtr) return false;
      return userCtr.actividades_asignadas.includes(activityKey);
    }
    return false;
  }

  // --- AUDITORIA ---
  getAuditoria(): AuditoriaRegistro[] {
    return this.auditoria;
  }

  recordAudit(params: Omit<AuditoriaRegistro, 'id_auditoria' | 'usuario' | 'rol' | 'fecha' | 'hora' | 'sync_id'> & { sync_id?: string }): AuditoriaRegistro {
    const { fecha, hora } = getLimaDateTime();
    const entry: AuditoriaRegistro = {
      id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      usuario: `${this.currentUser.nombres} ${this.currentUser.apellidos}`,
      rol: this.currentUser.rol,
      fecha,
      hora,
      accion: params.accion,
      modulo: params.modulo,
      id_registro: params.id_registro,
      cod_linea: params.cod_linea,
      estructura: params.estructura,
      valores_anteriores: params.valores_anteriores,
      valores_nuevos: params.valores_nuevos,
      origen: params.origen,
      resultado: params.resultado,
      sync_id: params.sync_id || 'LOCAL-SYNC'
    };
    this.auditoria.unshift(entry);
    this.saveAuditoria();
    return entry;
  }

  private saveAuditoria() {
    safeSetStorageItem(STORAGE_KEYS.AUDITORIA, this.auditoria.slice(0, 1000));
  }

  // --- LÍNEAS DE SUBTRANSMISIÓN ---
  getLineas(includeDeleted = false): LineaSubtransmision[] {
    if (includeDeleted) return this.lineas;
    return this.lineas.filter(l => l.estado_registro !== 'Eliminado');
  }

  getLineaByCode(codLinea: string): LineaSubtransmision | undefined {
    return this.lineas.find(l => l.cod_linea === codLinea);
  }

  addLinea(linea: Omit<LineaSubtransmision, 'id_linea' | 'fecha_registro' | 'ultima_sincronizacion'>): { success: boolean; message: string; data?: LineaSubtransmision } {
    if (this.currentUser.rol === 'Contratista') {
      return { success: false, message: 'Permiso denegado: El contratista no puede registrar líneas.' };
    }
    const cleanCode = linea.cod_linea.trim().toUpperCase();
    if (this.lineas.some(l => l.cod_linea.toUpperCase() === cleanCode)) {
      return { success: false, message: `Error: La línea con código "${cleanCode}" ya existe en el sistema.` };
    }
    const { fecha, hora } = getLimaDateTime();
    const newLine: LineaSubtransmision = {
      ...linea,
      cod_linea: cleanCode,
      id_linea: this.generateNextId('LIN-', this.lineas, 'id_linea', 3),
      estado: linea.estado || 'Activo',
      fecha_registro: fecha,
      ultima_sincronizacion: `${fecha} ${hora}`
    };
    applyAuditOnCreate(newLine, this.currentUser);
    this.lineas.push(newLine);
    this.markEntityKeyTouched('lineas', newLine.cod_linea);
    this.saveLineas();

    void realtimeService.mutate('lineas', 'create', newLine);
    this.notifyDriveAutoSync('LINEAS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'LÍNEAS',
      id_registro: newLine.id_linea,
      cod_linea: newLine.cod_linea,
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newLine),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Línea ${newLine.cod_linea} registrada exitosamente.`, data: newLine };
  }

  updateLinea(codLinea: string, updates: Partial<LineaSubtransmision>): { success: boolean; message: string; data?: LineaSubtransmision } {
    if (this.currentUser.rol === 'Contratista') {
      return { success: false, message: 'Permiso denegado: Los contratistas no tienen autorización para modificar líneas.' };
    }
    const index = this.lineas.findIndex(l => l.cod_linea === codLinea);
    if (index === -1) {
      return { success: false, message: `Línea ${codLinea} no encontrada.` };
    }
    const prev = { ...this.lineas[index] };
    const { fecha, hora } = getLimaDateTime();
    this.lineas[index] = {
      ...this.lineas[index],
      ...updates,
      cod_linea: codLinea,
      ultima_sincronizacion: `${fecha} ${hora}`
    };
    applyAuditOnUpdate(this.lineas[index], this.currentUser);
    this.saveLineas();

    realtimeService.mutate('lineas', 'update', this.lineas[index]);
    this.notifyDriveAutoSync('LINEAS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'LÍNEAS',
      id_registro: this.lineas[index].id_linea,
      cod_linea: codLinea,
      estructura: '-',
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.lineas[index]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Línea ${codLinea} actualizada correctamente.`, data: this.lineas[index] };
  }

  deactivateOrDeleteLinea(codLinea: string, forceDelete = false): { success: boolean; message: string; actionTaken: 'DESACTIVADA' | 'ELIMINADA' } {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede desactivar o eliminar líneas.');
    }
    const index = this.lineas.findIndex(l => l.cod_linea === codLinea);
    if (index === -1) return { success: false, message: `Línea ${codLinea} no existe.`, actionTaken: 'DESACTIVADA' };

    const countEstructuras = this.estructuras.filter(e => e.cod_linea === codLinea && e.estado_registro !== 'Eliminado').length;
    const countDeficiencias = this.deficiencias.filter(d => d.cod_linea === codLinea && d.estado_registro !== 'Eliminado').length;
    const countCorona = this.corona.filter(c => c.cod_linea === codLinea && c.estado_registro !== 'Eliminado').length;
    const countTotal = countEstructuras + countDeficiencias + countCorona;

    if (countTotal > 0 && !forceDelete) {
      this.lineas[index].estado = 'Inactivo';
      applyAuditOnUpdate(this.lineas[index], this.currentUser);
      this.saveLineas();

      realtimeService.mutate('lineas', 'deactivate', { cod_linea: codLinea, estado: 'Inactivo' });
      this.notifyDriveAutoSync('LINEAS');

      this.recordAudit({
        accion: 'DESACTIVACION',
        modulo: 'LÍNEAS',
        id_registro: this.lineas[index].id_linea,
        cod_linea: codLinea,
        estructura: '-',
        valores_anteriores: 'Activo',
        valores_nuevos: 'Inactivo (Desactivación lógica por ' + countTotal + ' registros dependientes)',
        origen: 'Web',
        resultado: 'Exitoso'
      });
      return {
        success: true,
        message: `La línea ${codLinea} tiene ${countEstructuras} estructuras asociadas. Ha sido DESACTIVADA lógicamente para preservar el historial.`,
        actionTaken: 'DESACTIVADA'
      };
    } else {
      // Soft Delete: Keep in storage marked as Eliminado
      applyAuditOnDelete(this.lineas[index], this.currentUser);
      this.lineas[index].estado = 'Inactivo';
      const softDeleted = this.lineas[index];
      this.saveLineas();

      realtimeService.mutate('lineas', 'delete', softDeleted);
      this.notifyDriveAutoSync('LINEAS');

      this.recordAudit({
        accion: 'ELIMINACION',
        modulo: 'LÍNEAS',
        id_registro: softDeleted.id_linea,
        cod_linea: codLinea,
        estructura: '-',
        valores_anteriores: JSON.stringify(softDeleted),
        valores_nuevos: 'ELIMINADO_LOGICO',
        origen: 'Web',
        resultado: 'Exitoso'
      });
      return {
        success: true,
        message: `Línea ${codLinea} eliminada lógicamente (Soft Delete). Se conserva para trazabilidad de auditoría.`,
        actionTaken: 'ELIMINADA'
      };
    }
  }

  private saveLineas() {
    safeSetStorageItem(STORAGE_KEYS.LINEAS, this.lineas);
  }

  // --- ESTRUCTURAS (POSTES) ---
  getEstructuras(codLinea?: string, includeDeleted = false): Estructura[] {
    let list = this.estructuras;
    if (!includeDeleted) {
      list = list.filter(e => e.estado_registro !== 'Eliminado');
    }
    if (codLinea) {
      return list.filter(e => e.cod_linea === codLinea);
    }
    return list;
  }

  private parsePosteNumber(posteN: string): { num: number; suffix: string } {
    const trimmed = (posteN || '').trim();
    const match = trimmed.match(/^(\d+)(.*)$/);
    if (match) {
      return { num: parseInt(match[1], 10), suffix: match[2] };
    }
    return { num: 999999, suffix: trimmed };
  }

  insertStructureWithShift(
    codLinea: string,
    targetPosteN: string,
    data: Omit<Estructura, 'id_poste' | 'cod_linea' | 'poste_n'>,
    shiftSubsequent = true
  ): { success: boolean; message: string; structure?: Estructura } {
    const targetParsed = this.parsePosteNumber(targetPosteN);
    let shiftedCount = 0;

    if (shiftSubsequent && targetParsed.num !== 999999) {
      const lineStructs = this.estructuras.filter(e => e.cod_linea === codLinea && e.estado_registro !== 'Eliminado');
      lineStructs.sort((a, b) => this.parsePosteNumber(b.poste_n).num - this.parsePosteNumber(a.poste_n).num);

      lineStructs.forEach(st => {
        const p = this.parsePosteNumber(st.poste_n);
        if (p.num >= targetParsed.num) {
          st.poste_n = String(p.num + 1) + p.suffix;
          applyAuditOnUpdate(st, this.currentUser);
          shiftedCount++;
        }
      });
    }

    const newStruct: Estructura = {
      ...data,
      id_poste: 'POS-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      cod_linea: codLinea,
      poste_n: targetPosteN,
      estado: data.estado || 'Operativo'
    };
    applyAuditOnCreate(newStruct, this.currentUser);

    this.estructuras.push(newStruct);
    this.markEntityKeyTouched('estructuras', newStruct.id_poste);
    this.saveEstructuras();

    void realtimeService.mutate('estructuras', 'create', newStruct, shiftSubsequent);
    this.notifyDriveAutoSync('ESTRUCTURAS');

    this.recordAudit({
      accion: 'REORDENAMIENTO',
      modulo: 'ESTRUCTURAS',
      id_registro: newStruct.id_poste,
      cod_linea: codLinea,
      estructura: targetPosteN,
      valores_anteriores: 'N/A',
      valores_nuevos: `Nueva estructura insertada en POSTE_N=${targetPosteN}. ${shiftedCount} estructuras subsiguientes desplazadas +1`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      message: `Estructura ${targetPosteN} insertada en ${codLinea}.${shiftedCount > 0 ? ` Se desplazaron ${shiftedCount} estructuras subsiguientes.` : ''}`,
      structure: newStruct
    };
  }

  deleteStructureWithShift(codLinea: string, targetPosteN: string, shiftSubsequent = true): { success: boolean; message: string } {
    const index = this.estructuras.findIndex(e => e.cod_linea === codLinea && e.poste_n === targetPosteN && e.estado_registro !== 'Eliminado');
    if (index === -1) return { success: false, message: `Estructura ${targetPosteN} no encontrada en línea ${codLinea}.` };

    applyAuditOnDelete(this.estructuras[index], this.currentUser);
    const deleted = this.estructuras[index];
    const targetParsed = this.parsePosteNumber(targetPosteN);
    let shiftedCount = 0;

    if (shiftSubsequent && targetParsed.num !== 999999) {
      this.estructuras.forEach(st => {
        if (st.cod_linea === codLinea && st.estado_registro !== 'Eliminado') {
          const p = this.parsePosteNumber(st.poste_n);
          if (p.num > targetParsed.num) {
            st.poste_n = String(p.num - 1) + p.suffix;
            applyAuditOnUpdate(st, this.currentUser);
            shiftedCount++;
          }
        }
      });
    }

    this.saveEstructuras();
    realtimeService.mutate('estructuras', 'delete', { cod_linea: codLinea, poste_n: targetPosteN, id_poste: deleted.id_poste }, shiftSubsequent);
    this.notifyDriveAutoSync('ESTRUCTURAS');

    this.recordAudit({
      accion: 'REORDENAMIENTO',
      modulo: 'ESTRUCTURAS',
      id_registro: deleted.id_poste,
      cod_linea: codLinea,
      estructura: targetPosteN,
      valores_anteriores: JSON.stringify(deleted),
      valores_nuevos: `Estructura marcada como Eliminada (Soft Delete). ${shiftedCount} estructuras subsiguientes desplazadas -1`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      message: `Estructura ${targetPosteN} eliminada lógicamente (Soft Delete).${shiftedCount > 0 ? ` Se reordenaron ${shiftedCount} estructuras posteriores.` : ''}`
    };
  }

  updateEstructura(idPoste: string, updates: Partial<Estructura>): { success: boolean; message: string } {
    const idx = this.estructuras.findIndex(e => e.id_poste === idPoste);
    if (idx === -1) return { success: false, message: 'Estructura no encontrada.' };
    const prev = { ...this.estructuras[idx] };
    this.estructuras[idx] = { ...this.estructuras[idx], ...updates };
    applyAuditOnUpdate(this.estructuras[idx], this.currentUser);
    this.saveEstructuras();

    realtimeService.mutate('estructuras', 'update', this.estructuras[idx]);
    this.notifyDriveAutoSync('ESTRUCTURAS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'ESTRUCTURAS',
      id_registro: idPoste,
      cod_linea: this.estructuras[idx].cod_linea,
      estructura: this.estructuras[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.estructuras[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return { success: true, message: 'Estructura actualizada correctamente.' };
  }

  importEstructurasBatch(newStructs: Estructura[], mode: 'merge' | 'replace'): { success: boolean; message: string; count: number } {
    if (mode === 'replace') {
      this.estructuras = newStructs.map(s => {
        applyAuditOnCreate(s, this.currentUser);
        return s;
      });
    } else {
      for (const ns of newStructs) {
        const existingIdx = this.estructuras.findIndex(
          e => e.cod_linea === ns.cod_linea && e.poste_n.trim().toLowerCase() === ns.poste_n.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          this.estructuras[existingIdx] = { ...this.estructuras[existingIdx], ...ns };
          applyAuditOnUpdate(this.estructuras[existingIdx], this.currentUser);
        } else {
          applyAuditOnCreate(ns, this.currentUser);
          this.estructuras.push(ns);
        }
      }
    }
    this.saveEstructuras();
    realtimeService.mutate('estructuras', 'batch', this.estructuras);
    this.notifyDriveAutoSync('ESTRUCTURAS');

    this.recordAudit({
      accion: 'IMPORTACION',
      modulo: 'ESTRUCTURAS',
      id_registro: 'BATCH',
      cod_linea: 'VARIAS',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Importadas ${newStructs.length} estructuras desde Excel (Modo: ${mode})`,
      origen: 'Importación Excel',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Se importaron ${newStructs.length} estructuras exitosamente.`, count: newStructs.length };
  }

  private saveEstructuras() {
    safeSetStorageItem(STORAGE_KEYS.ESTRUCTURAS, this.estructuras);
  }

  // --- EFECTO CORONA ---
  getCorona(codLinea?: string, includeDeleted = false): EfectoCorona[] {
    let list = this.corona;
    if (!includeDeleted) {
      list = list.filter(c => c.estado_registro !== 'Eliminado');
    }
    if (codLinea) {
      return list.filter(c => c.cod_linea === codLinea);
    }
    return list;
  }

  addCorona(item: Omit<EfectoCorona, 'id_corona'>): EfectoCorona {
    const maxPhotons = Math.max(Number(item.fase_r_conteo) || 0, Number(item.fase_s_conteo) || 0, Number(item.fase_t_conteo) || 0);
    const prioridad: Prioridad = item.prioridad || (maxPhotons > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO');
    const newItem: EfectoCorona = {
      ...item,
      prioridad,
      id_corona: 'COR-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.corona.unshift(newItem);
    this.markEntityKeyTouched('corona', newItem.id_corona);
    this.saveCorona();

    void realtimeService.mutate('corona', 'create', newItem);
    this.notifyDriveAutoSync('EFECTO_CORONA');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'EFECTO_CORONA',
      id_registro: newItem.id_corona,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateCorona(idCorona: string, updates: Partial<EfectoCorona>): boolean {
    const idx = this.corona.findIndex(c => c.id_corona === idCorona);
    if (idx === -1) return false;
    const prev = { ...this.corona[idx] };
    this.corona[idx] = { ...this.corona[idx], ...updates };
    applyAuditOnUpdate(this.corona[idx], this.currentUser);
    this.saveCorona();

    realtimeService.mutate('corona', 'update', this.corona[idx]);
    this.notifyDriveAutoSync('EFECTO_CORONA');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'EFECTO_CORONA',
      id_registro: idCorona,
      cod_linea: this.corona[idx].cod_linea,
      estructura: this.corona[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.corona[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteCorona(idCorona: string): boolean {
    const idx = this.corona.findIndex(c => c.id_corona === idCorona && c.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.corona[idx], this.currentUser);
    this.saveCorona();

    realtimeService.mutate('corona', 'delete', this.corona[idx]);
    this.notifyDriveAutoSync('EFECTO_CORONA');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'EFECTO_CORONA',
      id_registro: idCorona,
      cod_linea: this.corona[idx].cod_linea,
      estructura: this.corona[idx].poste_n,
      valores_anteriores: JSON.stringify(this.corona[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  getSituacionesCorona(): string[] {
    return this.situacionesCorona;
  }

  addSituacionCorona(sit: string) {
    if (!this.situacionesCorona.includes(sit.trim())) {
      this.situacionesCorona.push(sit.trim());
      safeSetStorageItem(STORAGE_KEYS.SITUACIONES_CORONA, this.situacionesCorona);
    }
  }

  private saveCorona() {
    safeSetStorageItem(STORAGE_KEYS.CORONA, this.corona);
  }

  // --- DEFICIENCIAS ---
  getDeficiencias(codLinea?: string, includeDeleted = false): Deficiencia[] {
    let list = this.deficiencias;
    if (!includeDeleted) {
      list = list.filter(d => d.estado_registro !== 'Eliminado');
    }
    if (codLinea) {
      return list.filter(d => d.cod_linea === codLinea);
    }
    return list;
  }

  addDeficiencia(def: Omit<Deficiencia, 'id_deficiencia'>): Deficiencia {
    const prio: Prioridad = (def.prioridad === 'PRIORITARIO' || (def.prioridad as string) === 'ALTO' || (def.prioridad as string) === 'Alta' || (def.prioridad as string) === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO';
    const newItem: Deficiencia = {
      ...def,
      prioridad: prio,
      id_deficiencia: this.generateNextId('DEF-', this.deficiencias, 'id_deficiencia', 4)
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.deficiencias.unshift(newItem);
    this.markEntityKeyTouched('deficiencias', newItem.id_deficiencia);
    this.saveDeficiencias();

    void realtimeService.mutate('deficiencias', 'create', newItem);
    this.notifyDriveAutoSync('DEFICIENCIAS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'DEFICIENCIAS',
      id_registro: newItem.id_deficiencia,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateDeficiencia(id: string, updates: Partial<Deficiencia>): boolean {
    const idx = this.deficiencias.findIndex(d => d.id_deficiencia === id);
    if (idx === -1) return false;
    const prev = { ...this.deficiencias[idx] };
    const normalizedUpdates = { ...updates };
    if (updates.prioridad) {
      normalizedUpdates.prioridad = (updates.prioridad === 'PRIORITARIO' || (updates.prioridad as string) === 'ALTO' || (updates.prioridad as string) === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO';
    }
    this.deficiencias[idx] = { ...this.deficiencias[idx], ...normalizedUpdates };
    applyAuditOnUpdate(this.deficiencias[idx], this.currentUser);
    this.saveDeficiencias();

    realtimeService.mutate('deficiencias', 'update', this.deficiencias[idx]);
    this.notifyDriveAutoSync('DEFICIENCIAS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'DEFICIENCIAS',
      id_registro: id,
      cod_linea: this.deficiencias[idx].cod_linea,
      estructura: this.deficiencias[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.deficiencias[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteDeficiencia(idDeficiencia: string): boolean {
    const idx = this.deficiencias.findIndex(d => d.id_deficiencia === idDeficiencia && d.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.deficiencias[idx], this.currentUser);
    this.saveDeficiencias();

    realtimeService.mutate('deficiencias', 'delete', this.deficiencias[idx]);
    this.notifyDriveAutoSync('DEFICIENCIAS');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'DEFICIENCIAS',
      id_registro: idDeficiencia,
      cod_linea: this.deficiencias[idx].cod_linea,
      estructura: this.deficiencias[idx].poste_n,
      valores_anteriores: JSON.stringify(this.deficiencias[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveDeficiencias() {
    safeSetStorageItem(STORAGE_KEYS.DEFICIENCIAS, this.deficiencias);
  }

  // --- TOMA DE MEDICIÓN DE PUESTA A TIERRA (PAT) ---
  getPuestaTierra(codLinea?: string, includeDeleted = false): PuestaTierra[] {
    let list = this.puestaTierra;
    if (!includeDeleted) {
      list = list.filter(p => p.estado_registro !== 'Eliminado');
    }
    if (codLinea && codLinea !== 'TODAS') {
      return list.filter(p => p.cod_linea === codLinea);
    }
    return list;
  }

  addPuestaTierra(item: Omit<PuestaTierra, 'id_pat' | 'prioridad' | 'alerta_deficiencia'>): { pat: PuestaTierra; deficienciaCreada?: Deficiencia } {
    const isCritico = item.valor_resistencia_pat >= 5.0;
    const prioridad: Prioridad = isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO';

    // DEDUPLICATION FIX: Check if a measurement already exists for this line and structure
    const existingIdx = this.puestaTierra.findIndex(p => 
      p.cod_linea === item.cod_linea && String(p.poste_n).trim() === String(item.poste_n).trim()
    );

    if (existingIdx !== -1) {
      const existing = this.puestaTierra[existingIdx];
      this.updatePuestaTierra(existing.id_pat, {
        ...item,
        valor_resistencia_pat: item.valor_resistencia_pat
      });
      return { pat: this.puestaTierra[existingIdx] };
    }

    const idPat = this.generateNextId('PAT-', this.puestaTierra, 'id_pat', 3);

    let deficienciaCreada: Deficiencia | undefined;

    if (isCritico) {
      // Notificación inmediata a la base con prioridad de atención para levantamiento de deficiencia (medición >= 5 Ohm)
      const defData: Omit<Deficiencia, 'id_deficiencia'> = {
        cod_linea: item.cod_linea,
        poste_n: String(item.poste_n).trim(),
        fecha_inspeccion: item.fecha_medicion || new Date().toISOString().split('T')[0],
        tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
        descripcion: `Alerta técnica PAT: Resistencia de puesta a tierra fuera de norma (${item.valor_resistencia_pat} Ω ≥ 5.0 Ω) en poste ${item.poste_n} de línea ${item.cod_linea}. Requiere atención prioritaria inmediata.`,
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: item.evidencia_url || 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link',
        observaciones: `Generado automáticamente por sistema tras medición de PAT (${item.valor_resistencia_pat} Ω). Coordenadas: Este ${item.utm_este || '-'}, Norte ${item.utm_norte || '-'}.`,
        usuario_responsable: item.responsable || `${this.currentUser.nombres} ${this.currentUser.apellidos}`,
        estado: 'Pendiente de revisión'
      };

      deficienciaCreada = this.addDeficiencia(defData);
    }

    const newPat: PuestaTierra = {
      ...item,
      id_pat: idPat,
      prioridad,
      alerta_deficiencia: isCritico,
      id_deficiencia_relacionada: deficienciaCreada?.id_deficiencia
    };
    applyAuditOnCreate(newPat, this.currentUser);

    this.puestaTierra.unshift(newPat);
    this.markEntityKeyTouched('puesta_tierra', newPat.id_pat);
    this.savePuestaTierra();

    void realtimeService.mutate('puesta_tierra', 'create', newPat);
    this.notifyDriveAutoSync('PUESTA_A_TIERRA');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'PUESTA_A_TIERRA',
      id_registro: newPat.id_pat,
      cod_linea: newPat.cod_linea,
      estructura: newPat.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Medición PAT: ${newPat.valor_resistencia_pat} Ω (${newPat.prioridad}) - Estructura ${newPat.tipo_estructura || '-'}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return { pat: newPat, deficienciaCreada };
  }

  updatePuestaTierra(id: string, updates: Partial<PuestaTierra>): boolean {
    let idx = this.puestaTierra.findIndex(p => p.id_pat === id);
    if (idx === -1 && updates.cod_linea && updates.poste_n) {
      idx = this.puestaTierra.findIndex(p => 
        p.cod_linea === updates.cod_linea && String(p.poste_n).trim() === String(updates.poste_n).trim()
      );
    }
    if (idx === -1) return false;

    const prev = { ...this.puestaTierra[idx] };
    const valor = updates.valor_resistencia_pat !== undefined ? updates.valor_resistencia_pat : this.puestaTierra[idx].valor_resistencia_pat;
    const isCritico = valor >= 5.0;

    this.puestaTierra[idx] = {
      ...this.puestaTierra[idx],
      ...updates,
      valor_resistencia_pat: valor,
      prioridad: isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO',
      alerta_deficiencia: isCritico
    };
    applyAuditOnUpdate(this.puestaTierra[idx], this.currentUser);

    this.savePuestaTierra();
    realtimeService.mutate('puesta_tierra', 'update', this.puestaTierra[idx]);
    this.notifyDriveAutoSync('PUESTA_A_TIERRA');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'PUESTA_A_TIERRA',
      id_registro: id,
      cod_linea: this.puestaTierra[idx].cod_linea,
      estructura: this.puestaTierra[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.puestaTierra[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return true;
  }

  deletePuestaTierra(id: string): boolean {
    let idx = this.puestaTierra.findIndex(p => p.id_pat === id && p.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.puestaTierra[idx], this.currentUser);
    this.savePuestaTierra();

    realtimeService.mutate('puesta_tierra', 'delete', this.puestaTierra[idx]);
    this.notifyDriveAutoSync('PUESTA_A_TIERRA');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'PUESTA_A_TIERRA',
      id_registro: id,
      cod_linea: this.puestaTierra[idx].cod_linea,
      estructura: this.puestaTierra[idx].poste_n,
      valores_anteriores: JSON.stringify(this.puestaTierra[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  crearDeficienciaDesdePAT(idPat: string): Deficiencia | null {
    const pat = this.puestaTierra.find(p => p.id_pat === idPat);
    if (!pat) return null;

    const defData: Omit<Deficiencia, 'id_deficiencia'> = {
      cod_linea: pat.cod_linea,
      poste_n: pat.poste_n,
      fecha_inspeccion: new Date().toISOString().split('T')[0],
      tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
      descripcion: `Levantamiento de deficiencia técnica por PAT crítica: ${pat.valor_resistencia_pat} Ω (Límite normativo 5.0 Ω).`,
      prioridad: 'PRIORITARIO',
      evidencia_fotografica: pat.evidencia_url || 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link',
      observaciones: `Estructura ${pat.tipo_estructura || '-'} (${pat.material_estructura || '-'}), Medición PAT: ${pat.valor_resistencia_pat} Ω.`,
      usuario_responsable: `${this.currentUser.nombres} ${this.currentUser.apellidos}`,
      estado: 'Pendiente de revisión'
    };

    const nuevaDef = this.addDeficiencia(defData);
    pat.id_deficiencia_relacionada = nuevaDef.id_deficiencia;
    this.savePuestaTierra();
    return nuevaDef;
  }

  private savePuestaTierra() {
    safeSetStorageItem(STORAGE_KEYS.PUESTA_TIERRA, this.puestaTierra);
  }


  // --- TERMOGRAFÍA ---
  getTermografia(codLinea?: string, includeDeleted = false): Termografia[] {
    let list = this.termografia;
    if (!includeDeleted) {
      list = list.filter(t => t.estado_registro !== 'Eliminado');
    }
    if (codLinea) return list.filter(t => t.cod_linea === codLinea);
    return list;
  }

  addTermografia(term: Omit<Termografia, 'id_termografia'>): Termografia {
    const newItem: Termografia = {
      ...term,
      id_termografia: this.generateNextId('TRM-', this.termografia, 'id_termografia', 4)
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.termografia.unshift(newItem);
    this.markEntityKeyTouched('termografia', newItem.id_termografia);
    this.saveTermografia();

    void realtimeService.mutate('termografia', 'create', newItem);
    this.notifyDriveAutoSync('TERMOGRAFIA');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'TERMOGRAFIA',
      id_registro: newItem.id_termografia,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateTermografia(id: string, updates: Partial<Termografia>): boolean {
    const idx = this.termografia.findIndex(t => t.id_termografia === id);
    if (idx === -1) return false;
    const prev = { ...this.termografia[idx] };
    this.termografia[idx] = { ...this.termografia[idx], ...updates };
    applyAuditOnUpdate(this.termografia[idx], this.currentUser);
    this.saveTermografia();

    realtimeService.mutate('termografia', 'update', this.termografia[idx]);
    this.notifyDriveAutoSync('TERMOGRAFIA');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'TERMOGRAFIA',
      id_registro: id,
      cod_linea: this.termografia[idx].cod_linea,
      estructura: this.termografia[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.termografia[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteTermografia(id: string): boolean {
    const idx = this.termografia.findIndex(t => t.id_termografia === id && t.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.termografia[idx], this.currentUser);
    this.saveTermografia();

    realtimeService.mutate('termografia', 'delete', this.termografia[idx]);
    this.notifyDriveAutoSync('TERMOGRAFIA');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'TERMOGRAFIA',
      id_registro: id,
      cod_linea: this.termografia[idx].cod_linea,
      estructura: this.termografia[idx].poste_n,
      valores_anteriores: JSON.stringify(this.termografia[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveTermografia() {
    safeSetStorageItem(STORAGE_KEYS.TERMOGRAFIA, this.termografia);
  }

  // --- PODAS ---
  getPodas(codLinea?: string, includeDeleted = false): Poda[] {
    let list = this.podas;
    if (!includeDeleted) {
      list = list.filter(p => p.estado_registro !== 'Eliminado');
    }
    if (codLinea) return list.filter(p => p.cod_linea === codLinea);
    return list;
  }

  addPoda(poda: Omit<Poda, 'id_poda' | 'total_arboles'>): Poda {
    const total = (poda.algarrobo || 0) + (poda.palmera || 0) + (poda.ornamental || 0) + (poda.tamarindo || 0) + (poda.ponceana || 0) + (poda.otros || 0);
    const newItem: Poda = {
      ...poda,
      total_arboles: total,
      id_poda: this.generateNextId('POD-', this.podas, 'id_poda', 4)
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.podas.unshift(newItem);
    this.markEntityKeyTouched('podas', newItem.id_poda);
    this.savePodas();

    void realtimeService.mutate('podas', 'create', newItem);
    this.notifyDriveAutoSync('CONTROL_PODAS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'PODAS',
      id_registro: newItem.id_poda,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updatePoda(id: string, updates: Partial<Poda>): boolean {
    const idx = this.podas.findIndex(p => p.id_poda === id);
    if (idx === -1) return false;
    const prev = { ...this.podas[idx] };
    const merged = { ...this.podas[idx], ...updates };
    merged.total_arboles = (merged.algarrobo || 0) + (merged.palmera || 0) + (merged.ornamental || 0) + (merged.tamarindo || 0) + (merged.ponceana || 0) + (merged.otros || 0);
    this.podas[idx] = merged;
    applyAuditOnUpdate(this.podas[idx], this.currentUser);
    this.savePodas();

    realtimeService.mutate('podas', 'update', this.podas[idx]);
    this.notifyDriveAutoSync('CONTROL_PODAS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'PODAS',
      id_registro: id,
      cod_linea: merged.cod_linea,
      estructura: merged.poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(merged),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deletePoda(id: string): boolean {
    const idx = this.podas.findIndex(p => p.id_poda === id && p.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.podas[idx], this.currentUser);
    this.savePodas();

    realtimeService.mutate('podas', 'delete', this.podas[idx]);
    this.notifyDriveAutoSync('CONTROL_PODAS');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'PODAS',
      id_registro: id,
      cod_linea: this.podas[idx].cod_linea,
      estructura: this.podas[idx].poste_n,
      valores_anteriores: JSON.stringify(this.podas[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private savePodas() {
    safeSetStorageItem(STORAGE_KEYS.PODAS, this.podas);
  }

  // --- MANTENIMIENTO ---
  getMantenimiento(codLinea?: string, includeDeleted = false): Mantenimiento[] {
    let list = this.mantenimiento;
    if (!includeDeleted) {
      list = list.filter(m => m.estado_registro !== 'Eliminado');
    }
    if (codLinea) return list.filter(m => m.cod_linea === codLinea);
    return list;
  }

  addMantenimiento(mant: Omit<Mantenimiento, 'id_mantenimiento'>): Mantenimiento {
    const newItem: Mantenimiento = {
      ...mant,
      id_mantenimiento: this.generateNextId('MNT-', this.mantenimiento, 'id_mantenimiento', 4)
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.mantenimiento.unshift(newItem);
    this.markEntityKeyTouched('mantenimiento', newItem.id_mantenimiento);
    this.saveMantenimiento();

    void realtimeService.mutate('mantenimiento', 'create', newItem);
    this.notifyDriveAutoSync('MANTENIMIENTO');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'MANTENIMIENTO',
      id_registro: newItem.id_mantenimiento,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateMantenimiento(id: string, updates: Partial<Mantenimiento>): boolean {
    const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === id);
    if (idx === -1) return false;
    const prev = { ...this.mantenimiento[idx] };
    const merged = { ...this.mantenimiento[idx], ...updates };
    this.mantenimiento[idx] = merged;
    applyAuditOnUpdate(this.mantenimiento[idx], this.currentUser);
    this.saveMantenimiento();

    realtimeService.mutate('mantenimiento', 'update', this.mantenimiento[idx]);
    this.notifyDriveAutoSync('MANTENIMIENTO');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'MANTENIMIENTO',
      id_registro: id,
      cod_linea: merged.cod_linea,
      estructura: merged.poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(merged),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteMantenimiento(id: string): boolean {
    const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === id && m.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.mantenimiento[idx], this.currentUser);
    this.saveMantenimiento();

    realtimeService.mutate('mantenimiento', 'delete', this.mantenimiento[idx]);
    this.notifyDriveAutoSync('MANTENIMIENTO');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'MANTENIMIENTO',
      id_registro: id,
      cod_linea: this.mantenimiento[idx].cod_linea,
      estructura: this.mantenimiento[idx].poste_n,
      valores_anteriores: JSON.stringify(this.mantenimiento[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveMantenimiento() {
    safeSetStorageItem(STORAGE_KEYS.MANTENIMIENTO, this.mantenimiento);
  }

  // --- HIDROLAVADO ---
  getHidrolavado(codLinea?: string, includeDeleted = false): Hidrolavado[] {
    let list = this.hidrolavado;
    if (!includeDeleted) {
      list = list.filter(h => h.estado_registro !== 'Eliminado');
    }
    if (codLinea) return list.filter(h => h.cod_linea === codLinea);
    return list;
  }

  addHidrolavado(item: Omit<Hidrolavado, 'id_hidrolavado'>): Hidrolavado {
    const newItem: Hidrolavado = {
      ...item,
      id_hidrolavado: this.generateNextId('HID-', this.hidrolavado, 'id_hidrolavado', 4)
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.hidrolavado.unshift(newItem);
    this.markEntityKeyTouched('hidrolavado', newItem.id_hidrolavado);
    this.saveHidrolavado();

    void realtimeService.mutate('hidrolavado', 'create', newItem);
    this.notifyDriveAutoSync('HIDROLAVADO');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'HIDROLAVADO',
      id_registro: newItem.id_hidrolavado,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateHidrolavado(id: string, updates: Partial<Hidrolavado>): boolean {
    const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === id);
    if (idx === -1) return false;
    const prev = { ...this.hidrolavado[idx] };
    this.hidrolavado[idx] = { ...this.hidrolavado[idx], ...updates };
    applyAuditOnUpdate(this.hidrolavado[idx], this.currentUser);
    this.saveHidrolavado();

    realtimeService.mutate('hidrolavado', 'update', this.hidrolavado[idx]);
    this.notifyDriveAutoSync('HIDROLAVADO');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'HIDROLAVADO',
      id_registro: id,
      cod_linea: this.hidrolavado[idx].cod_linea,
      estructura: this.hidrolavado[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.hidrolavado[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteHidrolavado(id: string): boolean {
    const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === id && h.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.hidrolavado[idx], this.currentUser);
    this.saveHidrolavado();

    realtimeService.mutate('hidrolavado', 'delete', this.hidrolavado[idx]);
    this.notifyDriveAutoSync('HIDROLAVADO');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'HIDROLAVADO',
      id_registro: id,
      cod_linea: this.hidrolavado[idx].cod_linea,
      estructura: this.hidrolavado[idx].poste_n,
      valores_anteriores: JSON.stringify(this.hidrolavado[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveHidrolavado() {
    safeSetStorageItem(STORAGE_KEYS.HIDROLAVADO, this.hidrolavado);
  }

  // --- ÓRDENES DE MANTENIMIENTO (OM) ---
  getOrdenesMantenimiento(includeDeleted = false): OrdenMantenimiento[] {
    if (includeDeleted) return this.ordenesMantenimiento;
    return this.ordenesMantenimiento.filter(o => o.estado_registro !== 'Eliminado');
  }

  addOrdenMantenimiento(om: Omit<OrdenMantenimiento, 'id_om' | 'fecha_registro'>): OrdenMantenimiento {
    const now = getLimaDateTime();
    const newItem: OrdenMantenimiento = {
      ...om,
      id_om: 'OM-ID-' + String(this.ordenesMantenimiento.length + 1).padStart(3, '0') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      fecha_registro: `${now.fecha} ${now.hora}`
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.ordenesMantenimiento.unshift(newItem);
    this.markEntityKeyTouched('ordenes_om', newItem.id_om);
    this.saveOrdenesMantenimiento();

    void realtimeService.mutate('ordenes_om', 'create', newItem);
    this.notifyDriveAutoSync('ORDENES_OM');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'ORDENES_MANTENIMIENTO',
      id_registro: newItem.numero_om,
      cod_linea: newItem.registros_asociados[0]?.cod_linea || 'MULTIPLE',
      estructura: newItem.registros_asociados[0]?.poste_n || 'N/A',
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return newItem;
  }

  updateOrdenMantenimiento(id_om: string, updates: Partial<OrdenMantenimiento>): boolean {
    const idx = this.ordenesMantenimiento.findIndex(o => o.id_om === id_om);
    if (idx === -1) return false;
    const prev = { ...this.ordenesMantenimiento[idx] };
    const merged = { ...this.ordenesMantenimiento[idx], ...updates };
    this.ordenesMantenimiento[idx] = merged;
    applyAuditOnUpdate(this.ordenesMantenimiento[idx], this.currentUser);
    this.saveOrdenesMantenimiento();

    realtimeService.mutate('ordenes_om', 'update', this.ordenesMantenimiento[idx]);
    this.notifyDriveAutoSync('ORDENES_OM');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'ORDENES_MANTENIMIENTO',
      id_registro: merged.numero_om,
      cod_linea: merged.registros_asociados[0]?.cod_linea || 'MULTIPLE',
      estructura: merged.registros_asociados[0]?.poste_n || 'N/A',
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(merged),
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return true;
  }

  deleteOrdenMantenimiento(identifier: string): boolean {
    const idx = this.ordenesMantenimiento.findIndex(o => (o.id_om === identifier || o.numero_om === identifier) && o.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    const removed = this.ordenesMantenimiento[idx];
    const numeroOM = removed.numero_om;
    const idOM = removed.id_om;

    // Soft Delete: Keep in array marked as Eliminado
    applyAuditOnDelete(this.ordenesMantenimiento[idx], this.currentUser);
    this.saveOrdenesMantenimiento();

    // Clean and unlink numero_om across deficiencias and any other activities to avoid orphaned links
    let unlinkedDeficiencias = 0;
    this.deficiencias.forEach(d => {
      if (d.numero_om === numeroOM || d.numero_om === idOM) {
        d.numero_om = '';
        applyAuditOnUpdate(d, this.currentUser);
        unlinkedDeficiencias++;
      }
    });
    if (unlinkedDeficiencias > 0) {
      this.saveDeficiencias();
    }

    let unlinkedMantenimientos = 0;
    this.mantenimiento.forEach(m => {
      if (m.orden_mantenimiento === numeroOM || m.orden_mantenimiento === idOM) {
        m.orden_mantenimiento = '';
        applyAuditOnUpdate(m, this.currentUser);
        unlinkedMantenimientos++;
      }
    });
    if (unlinkedMantenimientos > 0) {
      this.saveMantenimiento();
    }

    let unlinkedHidrolavados = 0;
    this.hidrolavado.forEach(h => {
      if (h.orden_mantenimiento === numeroOM || h.orden_mantenimiento === idOM) {
        h.orden_mantenimiento = '';
        applyAuditOnUpdate(h, this.currentUser);
        unlinkedHidrolavados++;
      }
    });
    if (unlinkedHidrolavados > 0) {
      this.saveHidrolavado();
    }

    realtimeService.mutate('ordenes_om', 'delete', { id_om: idOM, numero_om: numeroOM, estado_registro: 'Eliminado' });
    this.notifyDriveAutoSync('ORDENES_OM');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'ORDENES_MANTENIMIENTO',
      id_registro: removed.numero_om,
      cod_linea: removed.registros_asociados[0]?.cod_linea || 'N/A',
      estructura: removed.registros_asociados[0]?.poste_n || 'N/A',
      valores_anteriores: JSON.stringify(removed),
      valores_nuevos: `Orden ${removed.numero_om} eliminada lógicamente (Soft Delete) y desvinculada (${unlinkedDeficiencias} deficiencias, ${unlinkedMantenimientos} mantenimientos, ${unlinkedHidrolavados} hidrolavados)`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return true;
  }

  private saveOrdenesMantenimiento() {
    safeSetStorageItem(STORAGE_KEYS.ORDENES_MANTENIMIENTO, this.ordenesMantenimiento);
  }

  // Sincronización cruzada de prioridad por tipo de actividad
  updateRegistroPrioridad(tipoActividad: TipoActividadOM, idRegistro: string, nuevaPrioridad: Prioridad): boolean {
    if (tipoActividad === 'Deficiencias Técnicas') {
      return this.updateDeficiencia(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Puesta a Tierra') {
      const idx = this.puestaTierra.findIndex(p => p.id_pat === idRegistro);
      if (idx >= 0) {
        this.puestaTierra[idx].prioridad = nuevaPrioridad;
        applyAuditOnUpdate(this.puestaTierra[idx], this.currentUser);
        this.savePuestaTierra();
        realtimeService.mutate('puesta_tierra', 'update', this.puestaTierra[idx]);
        this.notifyDriveAutoSync('PUESTA_A_TIERRA');
        return true;
      }
    } else if (tipoActividad === 'Termografía Infrarroja') {
      return this.updateTermografia(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Control de Podas') {
      return this.updatePoda(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Mantenimiento de Postes') {
      return this.updateMantenimiento(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Hidrolavado') {
      return this.updateHidrolavado(idRegistro, { prioridad: nuevaPrioridad });
    }
    return false;
  }

  bulkUpdateRegistrosPrioridad(tipoActividad: TipoActividadOM, ids: string[], nuevaPrioridad: Prioridad): void {
    ids.forEach(id => {
      this.updateRegistroPrioridad(tipoActividad, id, nuevaPrioridad);
    });

    const updatedOms: OrdenMantenimiento[] = [];
    this.ordenesMantenimiento = this.ordenesMantenimiento.map(om => {
      if (om.tipo_actividad !== tipoActividad) return om;
      let thisOmUpdated = false;
      const updatedRegs = om.registros_asociados.map(reg => {
        if (ids.includes(reg.id_registro)) {
          thisOmUpdated = true;
          return { ...reg, prioridad: nuevaPrioridad };
        }
        return reg;
      });
      if (thisOmUpdated) {
        const nextOm = { ...om, registros_asociados: updatedRegs };
        applyAuditOnUpdate(nextOm, this.currentUser);
        updatedOms.push(nextOm);
        return nextOm;
      }
      return om;
    });
    if (updatedOms.length > 0) {
      this.saveOrdenesMantenimiento();
      updatedOms.forEach(om => {
        void realtimeService.mutate('ordenes_om', 'update', om);
      });
    }
  }

  // --- DMS ---
  getDMS(codLinea?: string, includeDeleted = false): DMSItem[] {
    let list = this.dms;
    if (!includeDeleted) {
      list = list.filter(d => d.estado_registro !== 'Eliminado');
    }
    if (codLinea) return list.filter(d => d.cod_linea === codLinea);
    return list;
  }

  addDMS(item: Omit<DMSItem, 'id_dms'>): DMSItem {
    const newItem: DMSItem = {
      ...item,
      id_dms: 'DMS-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.dms.unshift(newItem);
    this.markEntityKeyTouched('dms', newItem.id_dms);
    this.saveDMS();

    void realtimeService.mutate('dms', 'create', newItem);
    this.notifyDriveAutoSync('DMS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'DMS',
      id_registro: newItem.id_dms,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newItem),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateDMS(id: string, updates: Partial<DMSItem>): boolean {
    const idx = this.dms.findIndex(d => d.id_dms === id);
    if (idx === -1) return false;
    const prev = { ...this.dms[idx] };
    this.dms[idx] = { ...this.dms[idx], ...updates };
    applyAuditOnUpdate(this.dms[idx], this.currentUser);
    this.saveDMS();

    realtimeService.mutate('dms', 'update', this.dms[idx]);
    this.notifyDriveAutoSync('DMS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'DMS',
      id_registro: id,
      cod_linea: this.dms[idx].cod_linea,
      estructura: this.dms[idx].poste_n,
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.dms[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteDMS(id: string): boolean {
    const idx = this.dms.findIndex(d => (d.id_dms === id || d.codigo_dms === id) && d.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.dms[idx], this.currentUser);
    this.saveDMS();

    realtimeService.mutate('dms', 'delete', this.dms[idx]);
    this.notifyDriveAutoSync('DMS');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'DMS',
      id_registro: id,
      cod_linea: this.dms[idx].cod_linea,
      estructura: this.dms[idx].poste_n,
      valores_anteriores: JSON.stringify(this.dms[idx]),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  importDMSBatch(items: DMSItem[], broadcast = true): number {
    let count = 0;
    for (const item of items) {
      const existing = this.dms.findIndex(d => d.codigo_dms && d.codigo_dms === item.codigo_dms);
      if (existing >= 0) {
        this.dms[existing] = { ...this.dms[existing], ...item };
        applyAuditOnUpdate(this.dms[existing], this.currentUser);
      } else {
        applyAuditOnCreate(item, this.currentUser);
        this.dms.push(item);
      }
      count++;
    }
    this.saveDMS();

    if (broadcast) {
      realtimeService.mutate('dms', 'batch', items);
      this.notifyDriveAutoSync('DMS');
    }

    this.recordAudit({
      accion: 'IMPORTACION',
      modulo: 'DMS',
      id_registro: 'BATCH',
      cod_linea: 'VARIAS',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Importados ${count} registros DMS desde archivo Excel`,
      origen: 'Importación Excel',
      resultado: 'Exitoso'
    });
    return count;
  }

  private saveDMS() {
    safeSetStorageItem(STORAGE_KEYS.DMS, this.dms);
  }

  // --- LEVANTAMIENTOS DMS ---
  getLevantamientos(idDms?: string): LevantamientoDMS[] {
    if (idDms) return this.levantamientos.filter(l => l.id_dms === idDms);
    return this.levantamientos;
  }

  addLevantamiento(lev: Omit<LevantamientoDMS, 'id_levantamiento'>): LevantamientoDMS {
    const newItem: LevantamientoDMS = {
      ...lev,
      id_levantamiento: 'LEV-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.levantamientos.unshift(newItem);
    this.markEntityKeyTouched('levantamientos', newItem.id_levantamiento);
    this.saveLevantamientos();

    this.updateDMS(lev.id_dms, { estado: 'Levantada' });

    void realtimeService.mutate('levantamientos', 'create', newItem);
    this.notifyDriveAutoSync('LEVANTAMIENTOS_DMS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'LEVANTAMIENTO_DMS',
      id_registro: newItem.id_levantamiento,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'Pendiente/En Levantamiento',
      valores_nuevos: `Levantamiento registrado por ${newItem.contratista_responsable}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  private saveLevantamientos() {
    safeSetStorageItem(STORAGE_KEYS.LEVANTAMIENTOS, this.levantamientos);
  }

  // --- INSPECCIONES Y CIERRE DMS ---
  getInspecciones(idDms?: string): InspeccionCierreDMS[] {
    if (idDms) return this.inspecciones.filter(i => i.id_dms === idDms);
    return this.inspecciones;
  }

  addInspeccionCierre(insp: Omit<InspeccionCierreDMS, 'id_inspeccion_cierre'>): InspeccionCierreDMS {
    if (this.currentUser.rol === 'Contratista') {
      throw new Error('Permiso denegado: El contratista no puede realizar inspecciones ni cierre definitivo de DMS.');
    }
    const newItem: InspeccionCierreDMS = {
      ...insp,
      id_inspeccion_cierre: 'INSP-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    applyAuditOnCreate(newItem, this.currentUser);
    this.inspecciones.unshift(newItem);
    this.markEntityKeyTouched('inspecciones', newItem.id_inspeccion_cierre);
    this.saveInspecciones();

    if (insp.resultado === 'Levantamiento conforme') {
      this.updateDMS(insp.id_dms, { estado: 'Cerrada' });
    } else {
      this.updateDMS(insp.id_dms, { estado: 'En Levantamiento' });
    }

    void realtimeService.mutate('inspecciones', 'create', newItem);
    this.notifyDriveAutoSync('INSPECCIONES_DMS');

    this.recordAudit({
      accion: insp.resultado === 'Levantamiento conforme' ? 'CIERRE_DMS' : 'EDICION',
      modulo: 'INSPECCION_DMS',
      id_registro: newItem.id_inspeccion_cierre,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'Levantada',
      valores_nuevos: `Inspección de cierre: ${newItem.resultado}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return newItem;
  }

  private saveInspecciones() {
    safeSetStorageItem(STORAGE_KEYS.INSPECCIONES, this.inspecciones);
  }

  // --- USUARIOS ---
  getUsuarios(includeDeleted = false): Usuario[] {
    if (includeDeleted) return this.usuarios;
    return this.usuarios.filter(u => u.estado_registro !== 'Eliminado');
  }

  addUsuario(usr: Omit<Usuario, 'id_usuario' | 'fecha_creacion'>): Usuario {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede crear nuevos usuarios.');
    }
    const { fecha } = getLimaDateTime();
    const newUser: Usuario = {
      ...usr,
      password: usr.password && usr.password.trim() !== '' ? usr.password : 'password123',
      id_usuario: this.generateNextId('USR-', this.usuarios, 'id_usuario', 3),
      fecha_creacion: fecha
    };
    applyAuditOnCreate(newUser, this.currentUser);
    this.usuarios.push(newUser);
    this.markEntityKeyTouched('usuarios', newUser.id_usuario);
    this.saveUsuarios();

    void realtimeService.mutate('usuarios', 'create', newUser);
    this.notifyDriveAutoSync('USUARIOS');

    const { password: _pw, ...auditSafe } = newUser;
    this.recordAudit({
      accion: 'CREACION',
      modulo: 'USUARIOS',
      id_registro: newUser.id_usuario,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(auditSafe),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newUser;
  }

  updateUsuario(id: string, updates: Partial<Usuario>): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede editar usuarios o asignar roles.');
    }
    const idx = this.usuarios.findIndex(u => u.id_usuario === id);
    if (idx === -1) return false;
    const { password: _prevPw, ...prevSafe } = this.usuarios[idx];
    const cleanUpdates = { ...updates };
    if (!cleanUpdates.password || String(cleanUpdates.password).trim() === '') {
      delete cleanUpdates.password;
    }
    this.usuarios[idx] = { ...this.usuarios[idx], ...cleanUpdates };
    applyAuditOnUpdate(this.usuarios[idx], this.currentUser);
    this.saveUsuarios();

    realtimeService.mutate('usuarios', 'update', this.usuarios[idx]);
    this.notifyDriveAutoSync('USUARIOS');

    const { password: _nextPw, ...nextSafe } = this.usuarios[idx];
    this.recordAudit({
      accion: 'EDICION',
      modulo: 'USUARIOS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: JSON.stringify(prevSafe),
      valores_nuevos: JSON.stringify(nextSafe),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteUsuario(id: string): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede eliminar usuarios.');
    }
    const idx = this.usuarios.findIndex(u => u.id_usuario === id && u.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.usuarios[idx], this.currentUser);
    this.usuarios[idx].estado = 'Inactivo';
    this.saveUsuarios();

    realtimeService.mutate('usuarios', 'delete', this.usuarios[idx]);
    this.notifyDriveAutoSync('USUARIOS');

    const { password: _pw, ...safeUser } = this.usuarios[idx];
    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'USUARIOS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: JSON.stringify(safeUser),
      valores_nuevos: 'ELIMINADO_LOGICO',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  setUsuarios(users: Usuario[]) {
    this.usuarios = users;
    this.saveUsuarios();
  }

  private saveUsuarios() {
    // Strip passwords before writing usuarios list to browser storage
    const sanitized = this.usuarios.map(({ password: _pw, ...rest }) => rest);
    safeSetStorageItem(STORAGE_KEYS.USUARIOS, sanitized);
  }

  // --- CONTRATISTAS ---
  getContratistas(includeDeleted = false): Contratista[] {
    if (includeDeleted) return this.contratistas;
    return this.contratistas.filter(c => c.estado_registro !== 'Eliminado');
  }

  getActiveContratistas(): Contratista[] {
    return this.contratistas.filter(c => c.estado === 'Activo' && c.estado_registro !== 'Eliminado');
  }

  getContratistaById(id: string): Contratista | undefined {
    return this.contratistas.find(c => c.id_contratista === id);
  }

  getContratistaByNombre(nombre: string): Contratista | undefined {
    return this.contratistas.find(c => c.razon_social.toLowerCase() === nombre.toLowerCase());
  }

  addContratista(ctr: Omit<Contratista, 'id_contratista' | 'fecha_registro'>): Contratista {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede registrar nuevas contratistas.');
    }
    const { fecha } = getLimaDateTime();
    const newId = this.generateNextId('CTR-', this.contratistas, 'id_contratista', 3);
    const newCtr: Contratista = {
      ...ctr,
      id_contratista: newId,
      fecha_registro: fecha,
      ultima_actualizacion: fecha
    };
    applyAuditOnCreate(newCtr, this.currentUser);
    this.contratistas.push(newCtr);
    this.markEntityKeyTouched('contratistas', newCtr.id_contratista);
    this.saveContratistas();

    void realtimeService.mutate('contratistas', 'create', newCtr);
    this.notifyDriveAutoSync('CONTRATISTAS');

    this.recordAudit({
      accion: 'CREACION',
      modulo: 'CONTRATISTAS',
      id_registro: newCtr.id_contratista,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Contratista ${newCtr.razon_social} (RUC: ${newCtr.ruc}) registrada con ${newCtr.actividades_asignadas.length} actividades asignadas`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newCtr;
  }

  updateContratista(id: string, updates: Partial<Contratista>): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede editar contratistas y sus actividades asignadas.');
    }
    const idx = this.contratistas.findIndex(c => c.id_contratista === id);
    if (idx === -1) return false;
    const { fecha, hora } = getLimaDateTime();
    const prev = { ...this.contratistas[idx] };
    this.contratistas[idx] = {
      ...this.contratistas[idx],
      ...updates,
      ultima_actualizacion: `${fecha} ${hora}`
    };
    applyAuditOnUpdate(this.contratistas[idx], this.currentUser);
    this.saveContratistas();

    realtimeService.mutate('contratistas', 'update', this.contratistas[idx]);
    this.notifyDriveAutoSync('CONTRATISTAS');

    this.recordAudit({
      accion: 'EDICION',
      modulo: 'CONTRATISTAS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: JSON.stringify(prev),
      valores_nuevos: JSON.stringify(this.contratistas[idx]),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  deleteContratista(id: string): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede eliminar contratistas.');
    }
    const idx = this.contratistas.findIndex(c => c.id_contratista === id && c.estado_registro !== 'Eliminado');
    if (idx === -1) return false;
    applyAuditOnDelete(this.contratistas[idx], this.currentUser);
    this.contratistas[idx].estado = 'Inactivo';
    this.saveContratistas();

    realtimeService.mutate('contratistas', 'delete', this.contratistas[idx]);
    this.notifyDriveAutoSync('CONTRATISTAS');

    this.recordAudit({
      accion: 'ELIMINACION',
      modulo: 'CONTRATISTAS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: this.contratistas[idx].razon_social,
      valores_nuevos: 'Eliminado lógicamente (Soft Delete)',
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  // --- RESTAURAR REGISTRO SOFT-DELETED ---
  restoreRegistro(modulo: string, id: string): boolean {
    let targetList: any[] | null = null;
    let saveFunc: (() => void) | null = null;
    let idProp = 'id';

    switch (modulo) {
      case 'lineas':
        targetList = this.lineas;
        saveFunc = () => this.saveLineas();
        idProp = 'cod_linea';
        break;
      case 'estructuras':
        targetList = this.estructuras;
        saveFunc = () => this.saveEstructuras();
        idProp = 'id_poste';
        break;
      case 'corona':
        targetList = this.corona;
        saveFunc = () => this.saveCorona();
        idProp = 'id_corona';
        break;
      case 'deficiencias':
        targetList = this.deficiencias;
        saveFunc = () => this.saveDeficiencias();
        idProp = 'id_deficiencia';
        break;
      case 'puesta_tierra':
        targetList = this.puestaTierra;
        saveFunc = () => this.savePuestaTierra();
        idProp = 'id_pat';
        break;
      case 'termografia':
        targetList = this.termografia;
        saveFunc = () => this.saveTermografia();
        idProp = 'id_termografia';
        break;
      case 'podas':
        targetList = this.podas;
        saveFunc = () => this.savePodas();
        idProp = 'id_poda';
        break;
      case 'mantenimiento':
        targetList = this.mantenimiento;
        saveFunc = () => this.saveMantenimiento();
        idProp = 'id_mantenimiento';
        break;
      case 'hidrolavado':
        targetList = this.hidrolavado;
        saveFunc = () => this.saveHidrolavado();
        idProp = 'id_hidrolavado';
        break;
      case 'ordenes_om':
        targetList = this.ordenesMantenimiento;
        saveFunc = () => this.saveOrdenesMantenimiento();
        idProp = 'id_om';
        break;
      case 'dms':
        targetList = this.dms;
        saveFunc = () => this.saveDMS();
        idProp = 'id_dms';
        break;
      case 'usuarios':
        targetList = this.usuarios;
        saveFunc = () => this.saveUsuarios();
        idProp = 'id_usuario';
        break;
      case 'contratistas':
        targetList = this.contratistas;
        saveFunc = () => this.saveContratistas();
        idProp = 'id_contratista';
        break;
    }

    if (!targetList || !saveFunc) return false;

    const idx = targetList.findIndex(item => item[idProp] === id || item.id === id || (modulo === 'ordenes_om' && item.numero_om === id));
    if (idx === -1) return false;

    targetList[idx].estado_registro = 'Activo';
    targetList[idx].Estado_Registro = 'Activo';
    if (targetList[idx].estado === 'Inactivo') {
      targetList[idx].estado = 'Activo';
    }
    applyAuditOnUpdate(targetList[idx], this.currentUser);
    saveFunc();

    realtimeService.mutate(modulo, 'restore', targetList[idx]);
    const driveMap: Record<string, DriveModuleKey> = {
      lineas: 'LINEAS',
      estructuras: 'ESTRUCTURAS',
      corona: 'EFECTO_CORONA',
      deficiencias: 'DEFICIENCIAS',
      puesta_tierra: 'PUESTA_A_TIERRA',
      termografia: 'TERMOGRAFIA',
      podas: 'CONTROL_PODAS',
      mantenimiento: 'MANTENIMIENTO',
      hidrolavado: 'HIDROLAVADO',
      ordenes_om: 'ORDENES_OM',
      dms: 'DMS',
      usuarios: 'USUARIOS',
      contratistas: 'CONTRATISTAS'
    };
    if (driveMap[modulo]) {
      this.notifyDriveAutoSync(driveMap[modulo]);
    }

    this.recordAudit({
      accion: 'RESTAURACION',
      modulo: modulo.toUpperCase(),
      id_registro: id,
      cod_linea: targetList[idx].cod_linea || '-',
      estructura: targetList[idx].poste_n || '-',
      valores_anteriores: 'Eliminado',
      valores_nuevos: 'Activo (Restaurado)',
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return true;
  }

  // --- EXPORT/IMPORT GENERICO PARA TODOS LOS 16 MODULOS ---
  getModuleData(moduleKey: DriveModuleKey, includeDeleted = false): any[] {
    switch (moduleKey) {
      case 'LINEAS': return this.getLineas(includeDeleted);
      case 'ESTRUCTURAS': return this.getEstructuras(undefined, includeDeleted);
      case 'DEFICIENCIAS': return this.getDeficiencias(undefined, includeDeleted);
      case 'PUESTA_A_TIERRA': return this.getPuestaTierra('TODAS', includeDeleted);
      case 'EFECTO_CORONA': return this.getCorona(undefined, includeDeleted);
      case 'TERMOGRAFIA': return this.getTermografia(undefined, includeDeleted);
      case 'CONTROL_PODAS': return this.getPodas(undefined, includeDeleted);
      case 'MANTENIMIENTO': return this.getMantenimiento(undefined, includeDeleted);
      case 'HIDROLAVADO': return this.getHidrolavado(undefined, includeDeleted);
      case 'ORDENES_OM': return this.getOrdenesMantenimiento(includeDeleted);
      case 'DMS': return this.getDMS(undefined, includeDeleted);
      case 'LEVANTAMIENTOS_DMS': return this.getLevantamientos();
      case 'INSPECCIONES_DMS': return this.getInspecciones();
      case 'CONTRATISTAS': return this.getContratistas(includeDeleted);
      case 'AUDITORIA_SISTEMA': return this.getAuditoria();
      case 'USUARIOS': return this.getUsuarios(includeDeleted);
    }
  }

  batchImportModule(
    moduleKey: DriveModuleKey,
    rawRows: Record<string, any>[],
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; count: number; items: any[]; message: string } {
    const parsed = ExcelService.parseModuleImportRows(moduleKey, rawRows);
    if (parsed.length === 0) {
      return { success: false, count: 0, items: [], message: 'El archivo Excel no contiene filas válidas para importar.' };
    }

    const upsertBy = (
      entityKey: string,
      current: any[],
      incoming: any[],
      getKey: (x: any) => string,
      saveFn: () => void
    ): any[] => {
      let next = mode === 'replace' ? [] : [...current];
      for (const item of incoming) {
        const key = getKey(item);
        const existingIdx = next.findIndex(x => getKey(x) === key && key !== '');
        if (existingIdx >= 0) {
          const merged = { ...next[existingIdx], ...item };
          applyAuditOnUpdate(merged, this.currentUser);
          next[existingIdx] = merged;
        } else {
          applyAuditOnCreate(item, this.currentUser);
          next.unshift(item);
        }
        if (key) this.markEntityKeyTouched(entityKey, key);
      }
      saveFn();
      return next;
    };

    const meta = DRIVE_MODULE_META[moduleKey];
    let updatedList: any[] = [];

    switch (moduleKey) {
      case 'LINEAS':
        this.lineas = upsertBy('lineas', this.lineas, parsed, x => String(x.cod_linea || '').toUpperCase(), () => this.saveLineas());
        updatedList = this.lineas;
        break;
      case 'ESTRUCTURAS':
        this.estructuras = upsertBy('estructuras', this.estructuras, parsed, x => `${x.cod_linea}::${x.poste_n}`, () => this.saveEstructuras());
        updatedList = this.estructuras;
        break;
      case 'DEFICIENCIAS':
        this.deficiencias = upsertBy('deficiencias', this.deficiencias, parsed, x => x.id_deficiencia, () => this.saveDeficiencias());
        updatedList = this.deficiencias;
        break;
      case 'PUESTA_A_TIERRA':
        this.puestaTierra = upsertBy('puesta_tierra', this.puestaTierra, parsed, x => `${x.cod_linea}::${x.poste_n}`, () => this.savePuestaTierra());
        updatedList = this.puestaTierra;
        break;
      case 'EFECTO_CORONA':
        this.corona = upsertBy('corona', this.corona, parsed, x => x.id_corona, () => this.saveCorona());
        updatedList = this.corona;
        break;
      case 'TERMOGRAFIA':
        this.termografia = upsertBy('termografia', this.termografia, parsed, x => x.id_termografia, () => this.saveTermografia());
        updatedList = this.termografia;
        break;
      case 'CONTROL_PODAS':
        this.podas = upsertBy('podas', this.podas, parsed, x => x.id_poda, () => this.savePodas());
        updatedList = this.podas;
        break;
      case 'MANTENIMIENTO':
        this.mantenimiento = upsertBy('mantenimiento', this.mantenimiento, parsed, x => x.id_mantenimiento, () => this.saveMantenimiento());
        updatedList = this.mantenimiento;
        break;
      case 'HIDROLAVADO':
        this.hidrolavado = upsertBy('hidrolavado', this.hidrolavado, parsed, x => x.id_hidrolavado, () => this.saveHidrolavado());
        updatedList = this.hidrolavado;
        break;
      case 'ORDENES_OM':
        this.ordenesMantenimiento = upsertBy('ordenes_om', this.ordenesMantenimiento, parsed, x => x.numero_om || x.id_om, () => this.saveOrdenesMantenimiento());
        updatedList = this.ordenesMantenimiento;
        break;
      case 'DMS':
        this.dms = upsertBy('dms', this.dms, parsed, x => x.codigo_dms || x.id_dms, () => this.saveDMS());
        updatedList = this.dms;
        break;
      case 'LEVANTAMIENTOS_DMS':
        this.levantamientos = upsertBy('levantamientos', this.levantamientos, parsed, x => x.id_levantamiento, () => this.saveLevantamientos());
        updatedList = this.levantamientos;
        break;
      case 'INSPECCIONES_DMS':
        this.inspecciones = upsertBy('inspecciones', this.inspecciones, parsed, x => x.id_inspeccion_cierre, () => this.saveInspecciones());
        updatedList = this.inspecciones;
        break;
      case 'CONTRATISTAS':
        this.contratistas = upsertBy('contratistas', this.contratistas, parsed, x => x.ruc || x.id_contratista, () => this.saveContratistas());
        updatedList = this.contratistas;
        break;
      case 'AUDITORIA_SISTEMA':
        this.auditoria = [...parsed, ...(mode === 'replace' ? [] : this.auditoria)].slice(0, 1000);
        this.saveAuditoria();
        updatedList = this.auditoria;
        break;
      case 'USUARIOS':
        this.usuarios = upsertBy('usuarios', this.usuarios, parsed, x => String(x.username || '').toLowerCase(), () => this.saveUsuarios());
        updatedList = this.usuarios;
        break;
    }

    realtimeService.mutate(meta.entity, 'batch', updatedList);

    this.recordAudit({
      accion: 'IMPORTACION',
      modulo: meta.label.toUpperCase(),
      id_registro: 'CARGA_MASIVA',
      cod_linea: 'VARIAS',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Carga masiva Excel (${parsed.length} registros) en ${meta.label}`,
      origen: 'Importación Excel',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      count: parsed.length,
      items: parsed,
      message: `Se cargaron ${parsed.length} registros en ${meta.label} correctamente.`
    };
  }

  setContratistas(ctrs: Contratista[]) {
    this.contratistas = ctrs;
    this.saveContratistas();
  }

  private saveContratistas() {
    safeSetStorageItem(STORAGE_KEYS.CONTRATISTAS, this.contratistas);
  }

  // --- CONFIGURACIÓN DRIVE ---
  getConfigDrive(): ConfiguracionDrive {
    return this.config;
  }

  updateConfigDrive(updates: Partial<ConfiguracionDrive>, skipAudit = false) {
    this.config = { ...this.config, ...updates };
    safeSetStorageItem(STORAGE_KEYS.CONFIG, this.config);
    if (!skipAudit) {
      this.recordAudit({
        accion: 'EDICION',
        modulo: 'CONFIG_DRIVE',
        id_registro: 'CONFIG',
        cod_linea: '-',
        estructura: '-',
        valores_anteriores: 'N/A',
        valores_nuevos: JSON.stringify(this.config),
        origen: 'Web',
        resultado: 'Exitoso'
      });
    }
  }

  // --- CONFLICTOS ---
  getConflictos(): ConflictoRegistro[] {
    return this.conflictos;
  }

  addConflicto(conf: Omit<ConflictoRegistro, 'id_conflicto' | 'fecha_deteccion' | 'resuelto'>) {
    const { fecha, hora } = getLimaDateTime();
    const item: ConflictoRegistro = {
      ...conf,
      id_conflicto: 'CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      fecha_deteccion: `${fecha} ${hora}`,
      resuelto: false
    };
    this.conflictos.unshift(item);
    safeSetStorageItem(STORAGE_KEYS.CONFLICTOS, this.conflictos);
  }

  resolveConflicto(id: string, decision: 'Local' | 'Drive') {
    const idx = this.conflictos.findIndex(c => c.id_conflicto === id);
    if (idx >= 0) {
      this.conflictos[idx].resuelto = true;
      this.conflictos[idx].resolucion = decision;
      safeSetStorageItem(STORAGE_KEYS.CONFLICTOS, this.conflictos);
      this.recordAudit({
        accion: 'SINCRONIZACION',
        modulo: 'CONFLICTOS',
        id_registro: id,
        cod_linea: '-',
        estructura: '-',
        valores_anteriores: `Discrepancia en ${this.conflictos[idx].campo}`,
        valores_nuevos: `Resuelto: Se conservó valor ${decision}`,
        origen: 'Web',
        resultado: 'Exitoso'
      });
    }
  }

  // --- EVIDENCIAS FOTOGRÁFICAS ---
  getEvidencias(codLinea?: string, posteN?: string): EvidenciaFotografica[] {
    let list = this.evidencias;
    if (codLinea) list = list.filter(e => e.cod_linea === codLinea);
    if (posteN) list = list.filter(e => e.poste_n === posteN);
    return list;
  }

  addEvidencia(ev: Omit<EvidenciaFotografica, 'id_evidencia' | 'fecha_registro'>): EvidenciaFotografica {
    const { fecha, hora } = getLimaDateTime();
    const newItem: EvidenciaFotografica = {
      ...ev,
      id_evidencia: 'EVI-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      fecha_registro: `${fecha} ${hora}`
    };
    this.evidencias.unshift(newItem);
    safeSetStorageItem(STORAGE_KEYS.EVIDENCIAS, this.evidencias.slice(0, 500));
    return newItem;
  }
}

export const storageService = new StorageService();
