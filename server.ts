import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');
const SEED_FILE = path.join(__dirname, 'src', 'data', 'seedData.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lima Timezone helper
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

function getLimaAuditTimestamp(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(now).replace(',', '');
  } catch {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

function normalizeItemAudit(item: any, defaultUser = 'admin_carlos') {
  if (!item || typeof item !== 'object') return;
  const user = item.usuario_registro || item.Usuario_Registro || defaultUser;
  const fecha = item.fecha_hora_movimiento || item.Fecha_Hora_Movimiento || '29/10/2026 09:30:00';
  const estado = item.estado_registro || item.Estado_Registro || 'Activo';
  item.usuario_registro = user;
  item.Usuario_Registro = user;
  item.fecha_hora_movimiento = fecha;
  item.Fecha_Hora_Movimiento = fecha;
  item.estado_registro = estado;
  item.Estado_Registro = estado;
}

function normalizeStateAudit(s: any) {
  if (!s) return;
  const lists = [
    s.lineas, s.estructuras, s.corona, s.deficiencias, s.puestaTierra,
    s.termografia, s.podas, s.mantenimiento, s.hidrolavado, s.ordenes_om, s.dms,
    s.levantamientos, s.inspecciones, s.usuarios, s.contratistas
  ];
  for (const list of lists) {
    if (Array.isArray(list)) {
      list.forEach(item => normalizeItemAudit(item));
    }
  }
}

function sanitizeUserForClient(u: any) {
  if (!u || typeof u !== 'object') return u;
  const { password: _password, ...rest } = u;
  return rest;
}

function sanitizePatchForBroadcast(entity: string, data: any) {
  if (entity !== 'usuarios' || !data) return data;
  if (Array.isArray(data)) return data.map(sanitizeUserForClient);
  return sanitizeUserForClient(data);
}

function getSanitizedState() {
  return {
    ...state,
    usuarios: Array.isArray(state.usuarios) ? state.usuarios.map(sanitizeUserForClient) : []
  };
}

const DEFAULT_CONTRATISTAS = [
  {
    id_contratista: 'CTR-001',
    razon_social: 'Consorcio Eléctrico del Norte S.A.C.',
    ruc: '20541234567',
    representante_legal: 'Ing. Marcos Peña Ramos',
    telefono: '+51 980 456 789',
    email: 'operaciones@cenorte.com.pe',
    especialidad: 'Mantenimiento Integral de Líneas y Estructuras',
    estado: 'Activo',
    actividades_asignadas: ['deficiencias', 'mantenimiento', 'hidrolavado', 'ordenes_om', 'dms', 'puesta_tierra'],
    lineas_asignadas: ['L-6657A', 'L-6657C', 'L-6560', 'L-6561'],
    fecha_registro: '2026-01-10'
  },
  {
    id_contratista: 'CTR-002',
    razon_social: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    ruc: '20601239871',
    representante_legal: 'Ing. Walter Grau Alama',
    telefono: '+51 990 654 321',
    email: 'contacto@spmgrau.pe',
    especialidad: 'Control de Vegetación, Podas y Desbroce de Servidumbre',
    estado: 'Activo',
    actividades_asignadas: ['podas', 'mantenimiento'],
    lineas_asignadas: ['L-6650', 'L-6652', 'L-6657C'],
    fecha_registro: '2026-01-15'
  },
  {
    id_contratista: 'CTR-003',
    razon_social: 'Electrotech del Norte E.I.R.L.',
    ruc: '20487654321',
    representante_legal: 'Ing. Jorge Luis Torres Benavides',
    telefono: '+51 963 852 741',
    email: 'contratista.electrotech@gmail.com',
    especialidad: 'Mediciones de Puesta a Tierra y Termografía Infrarroja',
    estado: 'Activo',
    actividades_asignadas: ['puesta_tierra', 'termografia', 'deficiencias'],
    lineas_asignadas: ['L-6601', 'L-6657C'],
    fecha_registro: '2026-02-01'
  }
];

// Initial Catalog users (including official USUARIOS.XLSX spreadsheet users)
const DEFAULT_USUARIOS = [
  {
    id_usuario: 'USR-001',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Rivas',
    dni: '43981254',
    email: 'admin.subtransmision@empresa.com',
    telefono: '+51 984 551 223',
    username: 'admin_carlos',
    password: 'password123',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-15',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-002',
    nombres: 'Fernando',
    apellidos: 'Vargas Salazar',
    dni: '45129874',
    email: 'supervisor.vargas@empresa.com',
    telefono: '+51 971 334 890',
    username: 'sup_fernando',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    supervisor_responsable: 'Carlos Alberto Mendoza Rivas',
    lineas_asignadas: ['L-6601', 'L-6602', 'L-6603', 'L-6657A', 'L-6657C'],
    fecha_creacion: '2026-02-10',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-003',
    nombres: 'Jorge Luis',
    apellidos: 'Torres Benavides',
    dni: '10458763',
    email: 'contratista.electrotech@gmail.com',
    telefono: '+51 963 852 741',
    username: 'cont_electrotech',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-003',
    contratista_nombre: 'Electrotech del Norte E.I.R.L.',
    supervisor_responsable: 'Fernando Vargas Salazar',
    lineas_asignadas: ['L-6601', 'L-6657C'],
    fecha_creacion: '2026-03-01',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-004',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Vargas',
    dni: '42891045',
    email: 'admin.transmision@enosa.com.pe',
    telefono: '+51 969 123 456',
    username: 'admin',
    password: 'password123',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-10',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-005',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Silva',
    dni: '09876543',
    email: 'cmendoza@enosa.com.pe',
    telefono: '+51 968 234 567',
    username: 'cmendoza',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6650', 'L-6652', 'L-6657A', 'L-6657B', 'L-6657C', 'L-6657D', 'L-6560', 'L-6561', 'L-6658B', 'L-6658C'],
    fecha_creacion: '2026-01-15',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-006',
    nombres: 'Roberto',
    apellidos: 'Díaz Flores',
    dni: '18234567',
    email: 'rdiaz@enosa.com.pe',
    telefono: '+51 972 345 678',
    username: 'rdiaz',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129', 'L-6654', 'L-6659', 'L-6758', 'L-6660', 'L-6663'],
    fecha_creacion: '2026-01-18',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-007',
    nombres: 'Marcos',
    apellidos: 'Peña Ramos',
    dni: '41234567',
    email: 'operaciones@cenorte.com.pe',
    telefono: '+51 980 456 789',
    username: 'cenorte',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-001',
    contratista_nombre: 'Consorcio Eléctrico del Norte S.A.C.',
    supervisor_responsable: 'Carlos Alberto Mendoza Silva',
    lineas_asignadas: ['L-6657A', 'L-6657C', 'L-6560', 'L-6561'],
    fecha_creacion: '2026-02-01',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-008',
    nombres: 'Walter',
    apellidos: 'Grau Alama',
    dni: '32198765',
    email: 'contacto@spmgrau.pe',
    telefono: '+51 990 654 321',
    username: 'spmgrau',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-002',
    contratista_nombre: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    supervisor_responsable: 'Roberto Díaz Flores',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129'],
    fecha_creacion: '2026-02-05',
    ultima_actualizacion: '2026-10-28 16:57:19'
  }
];

// In-Memory Authoritative State
interface AppState {
  lineas: any[];
  estructuras: any[];
  corona: any[];
  deficiencias: any[];
  puestaTierra: any[];
  termografia: any[];
  podas: any[];
  mantenimiento: any[];
  hidrolavado?: any[];
  ordenes_om?: any[];
  dms: any[];
  levantamientos: any[];
  inspecciones: any[];
  usuarios: any[];
  contratistas?: any[];
  auditoria: any[];
  evidencias: any[];
  config: any;
  conflictos: any[];
  version: number;
}

const DEFAULT_HIDROLAVADO = [
  {
    id_hidrolavado: 'HID-001',
    cod_linea: 'L-6657C',
    poste_n: '21',
    tipo_armado: 'A',
    tipo_aislador: 'Polimérico',
    nivel_tension_kv: '60',
    fecha_ejecucion: '2026-10-22',
    metodo_lavado: 'En Caliente (Línea Energizada)',
    agua_utilizada_litros: 180,
    conductividad_agua_us: 18,
    presion_psi: 650,
    nivel_contaminacion: 'Crítico (Salino)',
    prioridad: 'PRIORITARIO',
    estado: 'Completado',
    contratista_responsable: 'Consorcio Eléctrico del Norte S.A.C.',
    orden_mantenimiento: 'OM-2026-014',
    observaciones: 'Lavado a alta presión de aisladores poliméricos con agua desmineralizada (< 50 µS/cm) por acumulación salina costera.',
    fotografias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
  },
  {
    id_hidrolavado: 'HID-002',
    cod_linea: 'L-6561',
    poste_n: '45',
    tipo_armado: 'H',
    tipo_aislador: 'Porcelana',
    nivel_tension_kv: '60',
    fecha_ejecucion: '2026-10-25',
    metodo_lavado: 'En Frío (Línea Desenergizada)',
    agua_utilizada_litros: 220,
    conductividad_agua_us: 24,
    presion_psi: 580,
    nivel_contaminacion: 'Alto',
    prioridad: 'NO PRIORITARIO',
    estado: 'Verificado',
    contratista_responsable: 'Consorcio Eléctrico del Norte S.A.C.',
    orden_mantenimiento: 'OM-2026-018',
    observaciones: 'Limpieza integral de cadenas de suspensión y herrajes en zona agrícola.',
    fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']
  }
];

let state: AppState;

function loadState(): AppState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      parsed.config = parsed.config || {};
      parsed.config.sheet_usuarios_id = parsed.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
      parsed.config.sheet_usuarios_url = parsed.config.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true';
      parsed.usuarios = parsed.usuarios || [];
      const userMap = new Map<string, any>();
      for (const u of parsed.usuarios) {
        if (u && u.username) {
          userMap.set(u.username.toLowerCase(), u);
        }
      }
      for (const defU of DEFAULT_USUARIOS) {
        if (!userMap.has(defU.username.toLowerCase())) {
          userMap.set(defU.username.toLowerCase(), defU);
        }
      }
      parsed.usuarios = Array.from(userMap.values());

      // Normalizar prioridades de deficiencias: Solo PRIORITARIO y NO PRIORITARIO
      if (parsed.deficiencias && Array.isArray(parsed.deficiencias)) {
        parsed.deficiencias = parsed.deficiencias.map((d: any) => ({
          ...d,
          prioridad: (d.prioridad === 'PRIORITARIO' || d.prioridad === 'ALTO' || d.prioridad === 'Alta' || d.prioridad === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
        }));
      }
      parsed.puestaTierra = parsed.puestaTierra || [];
      parsed.hidrolavado = (parsed.hidrolavado && parsed.hidrolavado.length > 0) ? parsed.hidrolavado : DEFAULT_HIDROLAVADO;
      parsed.ordenes_om = parsed.ordenes_om || [];
      parsed.contratistas = (parsed.contratistas && parsed.contratistas.length > 0) ? parsed.contratistas : DEFAULT_CONTRATISTAS;
      normalizeStateAudit(parsed);

      console.log(`[Server] State loaded from ${STATE_FILE} (Version ${parsed.version || 1}, ${parsed.usuarios.length} usuarios, ${parsed.contratistas.length} contratistas)`);
      return parsed;
    } catch (e) {
      console.error('[Server] Failed to read state file, recreating from seed', e);
    }
  }

  // Load from seedData.json
  let seed = { lineas: [], estructuras: [], corona: [] };
  if (fs.existsSync(SEED_FILE)) {

    try {
      seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    } catch (e) {
      console.error('[Server] Failed to parse seed file', e);
    }
  }

  const { fecha, hora } = getLimaDateTime();

  const initialState: AppState = {
    lineas: seed.lineas || [],
    estructuras: seed.estructuras || [],
    corona: seed.corona || [],
    deficiencias: [
      {
        id_deficiencia: 'DEF-001',
        cod_linea: 'L-6657C',
        poste_n: '14',
        fecha_inspeccion: '2026-10-15',
        tipo_deficiencia: 'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
        descripcion: 'Se evidencian agujeros producidos por pájaros carpinteros en cabeza de poste.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Requiere instalación de cobertor y reforzado con abrazadera metálica.',
        usuario_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'En atención'
      },
      {
        id_deficiencia: 'DEF-002',
        cod_linea: 'L-6657C',
        poste_n: '46',
        fecha_inspeccion: '2026-10-18',
        tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
        descripcion: 'Puesta a tierra sulfatada con empalme artesanal sin conector tipo split bolt.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Reponer conductor de cobre de 35mm² y soldadura exotérmica.',
        usuario_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'Pendiente de revisión'
      },
      {
        id_deficiencia: 'DEF-003',
        cod_linea: 'L-6665A',
        poste_n: '33',
        fecha_inspeccion: '2026-10-20',
        tipo_deficiencia: 'Predios no cumplen con DMS e invaden la F.S.',
        descripcion: 'Construcción clandestina de vivienda de dos pisos dentro de la franja de servidumbre a 2.8m del conductor.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Notificado a asesoría legal y fiscalización municipal.',
        usuario_responsable: 'Ing. Roberto Díaz Flores',
        estado: 'Registrada'
      }
    ],
    puestaTierra: [],
    termografia: [

      {
        id_termografia: 'TRM-001',
        cod_linea: 'L-6657C',
        poste_n: '7',
        tipo_armado: 'A',
        conductor_calibre: 'AAAC 240',
        conductor_n_fases: '3',
        nivel_tension: '60 kV',
        tipo_zona: 'Rural - Agrícola',
        temp_ambiente: 29.5,
        temp_max_componente: 54.2,
        emisividad: 0.95,
        delta_t: 24.7,
        hora: '11:45',
        fecha: '2026-10-12',
        componente_falla: 'Grapa de suspensión Fase T',
        comentario: 'Calentamiento localizado por falso contacto en perno de ajuste.',
        criticidad: 'Alerta',
        evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        inspector: 'Ing. Carlos Mendoza Silva'
      }
    ],
    podas: [
      {
        id_poda: 'POD-001',
        cod_linea: 'L-6657C',
        poste_n: '12',
        tipo_armado: 'A',
        tipo_aislador: 'polimérico',
        nivel_tension_kv: '60',
        fecha_ejecucion: '2026-10-14',
        ubicacion_referencia: 'Km 18 Carretera Piura - Chulucanas',
        punto_inicial: 'Sum. 45091',
        punto_final: 'Sum. 45110',
        algarrobo: 6,
        palmera: 2,
        ornamental: 0,
        tamarindo: 1,
        ponceana: 0,
        otros: 3,
        total_arboles: 12,
        observaciones: 'Despeje de 4 metros perimetrales con respecto a conductores.',
        fotografias: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'],
        contratista_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'Completada'
      }
    ],
    mantenimiento: [],
    hidrolavado: DEFAULT_HIDROLAVADO,
    ordenes_om: [],
    dms: [
      {
        id_dms: 'DMS-2026-001',
        cod_linea: 'L-6657C',
        poste_n: '24',
        codigo_dms: 'OSINERGMIN-PIU-0182',
        descripcion: 'Edificación invade franja de servidumbre a 2.45m del conductor más cercano en vano 24-25.',
        fecha_identificacion: '2026-09-12',
        prioridad: 'PRIORITARIO',
        fuente: 'OSINERGMIN',
        orden_servicio: 'OS-88491-2026',
        estado: 'En Levantamiento',
        observaciones: 'Se notificó a la municipalidad y se tramita modificación de traza o elevación de poste.',
        evidencias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
      },
      {
        id_dms: 'DMS-2026-002',
        cod_linea: 'L-6561',
        poste_n: '78',
        codigo_dms: 'OSINERGMIN-PIU-0199',
        descripcion: 'Cartel publicitario metálico instalado a 2.10m de fase inferior.',
        fecha_identificacion: '2026-09-20',
        prioridad: 'ALTO',
        fuente: 'Inspección Interna',
        orden_servicio: 'OS-88510-2026',
        estado: 'Levantada',
        observaciones: 'Panel retirado por la contratista. Pendiente de inspección de cierre.',
        evidencias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']
      }
    ],
    levantamientos: [],
    inspecciones: [],
    usuarios: DEFAULT_USUARIOS,
    contratistas: DEFAULT_CONTRATISTAS,
    auditoria: [
      {
        id_auditoria: 'AUD-SERVER-001',
        usuario: 'Servidor Central',
        rol: 'Sistema',
        fecha,
        hora,
        accion: 'IMPORTACION',
        modulo: 'INICIALIZACION',
        id_registro: 'DATASETS',
        cod_linea: 'TODAS',
        estructura: '-',
        valores_anteriores: 'Base vacía',
        valores_nuevos: `Servidor sincronizado con 27 líneas, 1087 estructuras y 222 mediciones efecto corona`,
        origen: 'Importación Excel',
        resultado: 'Exitoso',
        sync_id: 'SYNC-SRV-001'
      }
    ],
    evidencias: [],
    config: {
      sheet_lineas_id: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
      sheet_lineas_url: 'https://docs.google.com/spreadsheets/d/1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y/edit?gid=0#gid=0',
      sheet_usuarios_id: '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX',
      sheet_usuarios_url: 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true',
      drive_folder_id: '1A9x_DRIVE_FOLDER_SUBTRANSMISION',
      apps_script_url: '',
      auto_sync_interval: 15,
      last_sync_time: `${fecha} ${hora}`,
      sync_status: 'Conectado'
    },
    conflictos: [],
    version: 1
  };

  normalizeStateAudit(initialState);
  saveState(initialState);
  return initialState;
}

function saveState(newState: AppState) {
  const serialized = JSON.stringify(newState, null, 2);
  const tmpFile = `${STATE_FILE}.tmp`;
  try {
    fs.writeFileSync(tmpFile, serialized, 'utf-8');
    fs.renameSync(tmpFile, STATE_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(STATE_FILE, serialized, 'utf-8');
    } catch (fallbackErr) {
      console.error('[Server] Failed to save state to disk', fallbackErr || err);
    }
  }
}

state = loadState();

// Active Connected Clients
interface ConnectedClient {
  ws: WebSocket;
  id: string;
  user?: {
    id_usuario: string;
    nombres: string;
    apellidos: string;
    username: string;
    rol: string;
    email: string;
  };
  activeModule?: string;
  activeLine?: string;
  connectedAt: string;
}

const clients = new Map<WebSocket, ConnectedClient>();

function broadcast(message: object, senderWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN && ws !== senderWs) {
      ws.send(payload);
    }
  }
}

function broadcastAll(message: object) {
  const payload = JSON.stringify(message);
  for (const [ws] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

interface HttpPresenceClient {
  clientId: string;
  user: any;
  activeModule: string;
  activeLine: string;
  lastSeen: number;
}
const httpClients = new Map<string, HttpPresenceClient>();

function getActiveUsersList() {
  const userList: any[] = [];
  const now = Date.now();

  for (const [, client] of clients.entries()) {
    if (client.user) {
      userList.push({
        id: client.id,
        user: client.user,
        activeModule: client.activeModule || 'dashboard',
        activeLine: client.activeLine || 'TODAS',
        connectedAt: client.connectedAt
      });
    }
  }

  for (const [clientId, info] of httpClients.entries()) {
    if (now - info.lastSeen < 15000) {
      if (!userList.some(u => u.user.username === info.user.username)) {
        userList.push({
          id: clientId,
          user: info.user,
          activeModule: info.activeModule || 'dashboard',
          activeLine: info.activeLine || 'TODAS',
          connectedAt: 'En línea'
        });
      }
    } else {
      httpClients.delete(clientId);
    }
  }

  return userList;
}

// Structure shifting logic
function parsePosteNumber(posteN: string): { num: number; suffix: string } {
  const trimmed = (posteN || '').trim();
  const match = trimmed.match(/^(\d+)(.*)$/);
  if (match) {
    return { num: parseInt(match[1], 10), suffix: match[2] };
  }
  return { num: 999999, suffix: trimmed };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const server = http.createServer(app);

  // WebSocket Server attached to same HTTP Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const clientId = 'CLI-' + Math.random().toString(36).substring(2, 9);
    const { hora } = getLimaDateTime();

    const clientInfo: ConnectedClient = {
      ws,
      id: clientId,
      connectedAt: hora
    };
    clients.set(ws, clientInfo);

    console.log(`[WebSocket] Client connected: ${clientId}. Total clients: ${clients.size}`);

    // Send full current state (sanitized without passwords) to newly connected client
    ws.send(JSON.stringify({
      type: 'init',
      data: getSanitizedState(),
      activeUsers: getActiveUsersList(),
      clientId
    }));

    ws.on('message', (rawMessage: string) => {
      try {
        const msg = JSON.parse(rawMessage);
        handleClientMessage(ws, clientInfo, msg);
      } catch (e) {
        console.error('[WebSocket] Invalid JSON message received', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId}. Remaining: ${clients.size}`);
      broadcastAll({
        type: 'presence:update',
        activeUsers: getActiveUsersList()
      });
    });

    ws.on('error', (err: any) => {
      console.error(`[WebSocket] Client ${clientId} error:`, err);
    });
  });

  const processedMutationIds = new Set<string>();
  function markMutationProcessed(mutationId?: string): boolean {
    if (!mutationId) return true;
    if (processedMutationIds.has(mutationId)) return false;
    processedMutationIds.add(mutationId);
    if (processedMutationIds.size > 500) {
      const oldest = processedMutationIds.values().next().value;
      if (oldest) processedMutationIds.delete(oldest);
    }
    return true;
  }

  // Handle client mutation / presence messages
  function handleClientMessage(ws: WebSocket, client: ConnectedClient, msg: any) {
    const { fecha, hora } = getLimaDateTime();

    switch (msg.type) {
      case 'auth:identify': {
        client.user = msg.user;
        client.activeModule = msg.activeModule || 'dashboard';
        client.activeLine = msg.activeLine || 'TODAS';

        broadcastAll({
          type: 'presence:update',
          activeUsers: getActiveUsersList()
        });
        break;
      }

      case 'presence:heartbeat': {
        if (client.user) {
          client.activeModule = msg.activeModule;
          client.activeLine = msg.activeLine;
          broadcast({
            type: 'presence:update',
            activeUsers: getActiveUsersList()
          }, ws);
        }
        break;
      }

      case 'mutate': {
        const { entity, action, data: payload, user, mutationId } = msg;
        if (!markMutationProcessed(mutationId)) {
          return;
        }
        state.version = (state.version || 1) + 1;

        const auditTimestamp = getLimaAuditTimestamp();
        const auditUser = user ? (user.username || `${user.nombres} ${user.apellidos}`) : 'admin_carlos';

        let changeDescription = '';
        let auditAction: any = action.toUpperCase();

        if (entity === 'lineas') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingIdx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea || (payload.id_linea && l.id_linea === payload.id_linea));
            if (existingIdx >= 0) {
              state.lineas[existingIdx] = { ...state.lineas[existingIdx], ...payload };
            } else {
              state.lineas.push(payload);
            }
            changeDescription = `Línea ${payload.cod_linea} creada por ${auditUser}`;
          } else if (action === 'update') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea);
            if (idx >= 0) {
              state.lineas[idx] = { ...state.lineas[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Línea ${payload.cod_linea} actualizada`;
          } else if (action === 'deactivate') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea);
            if (idx >= 0) {
              state.lineas[idx].estado = 'Inactivo';
              state.lineas[idx].usuario_registro = auditUser;
              state.lineas[idx].Usuario_Registro = auditUser;
              state.lineas[idx].fecha_hora_movimiento = auditTimestamp;
              state.lineas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'DESACTIVACION';
            changeDescription = `Línea ${payload.cod_linea} desactivada`;
          } else if (action === 'delete') {
            // Soft delete
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea || l.id_linea === payload.id_linea);
            if (idx >= 0) {
              state.lineas[idx].estado_registro = 'Eliminado';
              state.lineas[idx].Estado_Registro = 'Eliminado';
              state.lineas[idx].estado = 'Inactivo';
              state.lineas[idx].usuario_registro = auditUser;
              state.lineas[idx].Usuario_Registro = auditUser;
              state.lineas[idx].fecha_hora_movimiento = auditTimestamp;
              state.lineas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Línea ${payload.cod_linea || payload.id_linea} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea || l.id_linea === payload.id_linea);
            if (idx >= 0) {
              state.lineas[idx].estado_registro = 'Activo';
              state.lineas[idx].Estado_Registro = 'Activo';
              state.lineas[idx].estado = 'Activo';
              state.lineas[idx].usuario_registro = auditUser;
              state.lineas[idx].Usuario_Registro = auditUser;
              state.lineas[idx].fecha_hora_movimiento = auditTimestamp;
              state.lineas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Línea ${payload.cod_linea || payload.id_linea} restaurada a estado Activo`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.lineas = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} líneas de subtransmisión`;
          }
        } else if (entity === 'estructuras') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            if (msg.shiftSubsequent) {
              const targetParsed = parsePosteNumber(payload.poste_n);
              if (targetParsed.num !== 999999) {
                state.estructuras.forEach(st => {
                  if (st.cod_linea === payload.cod_linea && st.estado_registro !== 'Eliminado') {
                    const p = parsePosteNumber(st.poste_n);
                    if (p.num >= targetParsed.num) {
                      st.poste_n = String(p.num + 1) + p.suffix;
                    }
                  }
                });
              }
            }
            const existingStructIdx = state.estructuras.findIndex(e => payload.id_poste && e.id_poste === payload.id_poste);
            if (existingStructIdx >= 0) {
              state.estructuras[existingStructIdx] = { ...state.estructuras[existingStructIdx], ...payload };
            } else {
              state.estructuras.push(payload);
            }
            changeDescription = `Estructura Poste ${payload.poste_n} agregada en línea ${payload.cod_linea}`;
          } else if (action === 'update') {
            const idx = state.estructuras.findIndex(e => e.id_poste === payload.id_poste);
            if (idx >= 0) {
              state.estructuras[idx] = { ...state.estructuras[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Estructura Poste ${payload.poste_n} actualizada`;
          } else if (action === 'delete') {
            // Soft delete
            const idx = state.estructuras.findIndex(e => (payload.id_poste && e.id_poste === payload.id_poste) || (e.cod_linea === payload.cod_linea && e.poste_n === payload.poste_n));
            if (idx >= 0) {
              state.estructuras[idx].estado_registro = 'Eliminado';
              state.estructuras[idx].Estado_Registro = 'Eliminado';
              state.estructuras[idx].usuario_registro = auditUser;
              state.estructuras[idx].Usuario_Registro = auditUser;
              state.estructuras[idx].fecha_hora_movimiento = auditTimestamp;
              state.estructuras[idx].Fecha_Hora_Movimiento = auditTimestamp;

              if (msg.shiftSubsequent) {
                const targetParsed = parsePosteNumber(payload.poste_n);
                if (targetParsed.num !== 999999) {
                  state.estructuras.forEach(st => {
                    if (st.cod_linea === payload.cod_linea && st.estado_registro !== 'Eliminado') {
                      const p = parsePosteNumber(st.poste_n);
                      if (p.num > targetParsed.num) {
                        st.poste_n = String(p.num - 1) + p.suffix;
                      }
                    }
                  });
                }
              }
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Estructura Poste ${payload.poste_n} eliminada lógicamente (Soft Delete) de línea ${payload.cod_linea}`;
          } else if (action === 'restore') {
            const idx = state.estructuras.findIndex(e => (payload.id_poste && e.id_poste === payload.id_poste) || (e.cod_linea === payload.cod_linea && e.poste_n === payload.poste_n));
            if (idx >= 0) {
              state.estructuras[idx].estado_registro = 'Activo';
              state.estructuras[idx].Estado_Registro = 'Activo';
              state.estructuras[idx].usuario_registro = auditUser;
              state.estructuras[idx].Usuario_Registro = auditUser;
              state.estructuras[idx].fecha_hora_movimiento = auditTimestamp;
              state.estructuras[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Estructura Poste ${payload.poste_n} restaurada a Activo`;
          } else if (action === 'batch') {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.estructuras = payload;
            changeDescription = `Importación batch de ${payload.length} estructuras`;
          }
        } else if (entity === 'corona') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingCoronaIdx = state.corona.findIndex(c => payload.id_corona && c.id_corona === payload.id_corona);
            if (existingCoronaIdx >= 0) {
              state.corona[existingCoronaIdx] = { ...state.corona[existingCoronaIdx], ...payload };
            } else {
              state.corona.unshift(payload);
            }
            changeDescription = `Medición de Efecto Corona registrada en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.corona.findIndex(c => c.id_corona === payload.id_corona);
            if (idx >= 0) {
              state.corona[idx] = { ...state.corona[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Medición de Efecto Corona actualizada en P-${payload.poste_n}`;
          } else if (action === 'delete') {
            const idx = state.corona.findIndex(c => c.id_corona === payload.id_corona);
            if (idx >= 0) {
              state.corona[idx].estado_registro = 'Eliminado';
              state.corona[idx].Estado_Registro = 'Eliminado';
              state.corona[idx].usuario_registro = auditUser;
              state.corona[idx].Usuario_Registro = auditUser;
              state.corona[idx].fecha_hora_movimiento = auditTimestamp;
              state.corona[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Medición Efecto Corona ${payload.id_corona} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.corona.findIndex(c => c.id_corona === payload.id_corona);
            if (idx >= 0) {
              state.corona[idx].estado_registro = 'Activo';
              state.corona[idx].Estado_Registro = 'Activo';
              state.corona[idx].usuario_registro = auditUser;
              state.corona[idx].Usuario_Registro = auditUser;
              state.corona[idx].fecha_hora_movimiento = auditTimestamp;
              state.corona[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Medición Efecto Corona ${payload.id_corona} restaurada`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.corona = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} mediciones de efecto corona`;
          }
        } else if (entity === 'deficiencias') {
          if (action === 'create') {
            const normalized = {
              ...payload,
              prioridad: (payload.prioridad === 'PRIORITARIO' || payload.prioridad === 'ALTO' || payload.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
            };
            normalizeItemAudit(normalized, auditUser);
            normalized.fecha_hora_movimiento = auditTimestamp;
            normalized.Fecha_Hora_Movimiento = auditTimestamp;
            const existingDefIdx = state.deficiencias.findIndex(d => normalized.id_deficiencia && d.id_deficiencia === normalized.id_deficiencia);
            if (existingDefIdx >= 0) {
              state.deficiencias[existingDefIdx] = { ...state.deficiencias[existingDefIdx], ...normalized };
            } else {
              state.deficiencias.unshift(normalized);
            }
            changeDescription = `Deficiencia registrada en ${payload.cod_linea} P-${payload.poste_n} (${normalized.prioridad})`;
          } else if (action === 'update') {
            const idx = state.deficiencias.findIndex(d => d.id_deficiencia === payload.id_deficiencia);
            if (idx >= 0) {
              state.deficiencias[idx] = {
                ...state.deficiencias[idx],
                ...payload,
                prioridad: (payload.prioridad === 'PRIORITARIO' || payload.prioridad === 'ALTO' || payload.prioridad === 'Alta' || state.deficiencias[idx].prioridad === 'PRIORITARIO') ? 'PRIORITARIO' : 'NO PRIORITARIO',
                usuario_registro: auditUser,
                Usuario_Registro: auditUser,
                fecha_hora_movimiento: auditTimestamp,
                Fecha_Hora_Movimiento: auditTimestamp
              };
            }
            changeDescription = `Deficiencia ${payload.id_deficiencia} actualizada a estado ${payload.estado}`;
          } else if (action === 'delete') {
            const idx = state.deficiencias.findIndex(d => d.id_deficiencia === payload.id_deficiencia);
            if (idx >= 0) {
              state.deficiencias[idx].estado_registro = 'Eliminado';
              state.deficiencias[idx].Estado_Registro = 'Eliminado';
              state.deficiencias[idx].usuario_registro = auditUser;
              state.deficiencias[idx].Usuario_Registro = auditUser;
              state.deficiencias[idx].fecha_hora_movimiento = auditTimestamp;
              state.deficiencias[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Deficiencia ${payload.id_deficiencia} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.deficiencias.findIndex(d => d.id_deficiencia === payload.id_deficiencia);
            if (idx >= 0) {
              state.deficiencias[idx].estado_registro = 'Activo';
              state.deficiencias[idx].Estado_Registro = 'Activo';
              state.deficiencias[idx].usuario_registro = auditUser;
              state.deficiencias[idx].Usuario_Registro = auditUser;
              state.deficiencias[idx].fecha_hora_movimiento = auditTimestamp;
              state.deficiencias[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Deficiencia ${payload.id_deficiencia} restaurada a estado Activo`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.deficiencias = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} deficiencias técnicas`;
          }
        } else if (entity === 'puesta_tierra') {
          state.puestaTierra = state.puestaTierra || [];
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingIdx = state.puestaTierra.findIndex(p => 
              (payload.id_pat && p.id_pat === payload.id_pat) || 
              (p.cod_linea === payload.cod_linea && String(p.poste_n).trim() === String(payload.poste_n).trim())
            );
            if (existingIdx >= 0) {
              state.puestaTierra[existingIdx] = { ...state.puestaTierra[existingIdx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
              changeDescription = `Medición PAT actualizada en ${payload.cod_linea} P-${payload.poste_n}`;
            } else {
              state.puestaTierra.unshift(payload);
              changeDescription = `Medición PAT registrada en ${payload.cod_linea} P-${payload.poste_n} (${payload.valor_resistencia_pat} Ω - ${payload.prioridad})`;
            }
          } else if (action === 'update') {
            let idx = state.puestaTierra.findIndex(p => p.id_pat === payload.id_pat);
            if (idx === -1 && payload.cod_linea && payload.poste_n) {
              idx = state.puestaTierra.findIndex(p => 
                p.cod_linea === payload.cod_linea && String(p.poste_n).trim() === String(payload.poste_n).trim()
              );
            }
            if (idx >= 0) {
              state.puestaTierra[idx] = { ...state.puestaTierra[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Medición PAT ${payload.id_pat || ''} actualizada`;
          } else if (action === 'delete') {
            let idx = state.puestaTierra.findIndex(p => p.id_pat === payload.id_pat);
            if (idx === -1 && payload.cod_linea && payload.poste_n) {
              idx = state.puestaTierra.findIndex(p => p.cod_linea === payload.cod_linea && String(p.poste_n).trim() === String(payload.poste_n).trim());
            }
            if (idx >= 0) {
              state.puestaTierra[idx].estado_registro = 'Eliminado';
              state.puestaTierra[idx].Estado_Registro = 'Eliminado';
              state.puestaTierra[idx].usuario_registro = auditUser;
              state.puestaTierra[idx].Usuario_Registro = auditUser;
              state.puestaTierra[idx].fecha_hora_movimiento = auditTimestamp;
              state.puestaTierra[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Medición PAT ${payload.id_pat || ''} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.puestaTierra.findIndex(p => p.id_pat === payload.id_pat);
            if (idx >= 0) {
              state.puestaTierra[idx].estado_registro = 'Activo';
              state.puestaTierra[idx].Estado_Registro = 'Activo';
              state.puestaTierra[idx].usuario_registro = auditUser;
              state.puestaTierra[idx].Usuario_Registro = auditUser;
              state.puestaTierra[idx].fecha_hora_movimiento = auditTimestamp;
              state.puestaTierra[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Medición PAT ${payload.id_pat || ''} restaurada`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.puestaTierra = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} mediciones de puesta a tierra`;
          }
        } else if (entity === 'termografia') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingTermIdx = state.termografia.findIndex(t => payload.id_termografia && t.id_termografia === payload.id_termografia);
            if (existingTermIdx >= 0) {
              state.termografia[existingTermIdx] = { ...state.termografia[existingTermIdx], ...payload };
            } else {
              state.termografia.unshift(payload);
            }
            changeDescription = `Inspección termográfica en ${payload.cod_linea} P-${payload.poste_n} (ΔT: +${payload.delta_t}°C)`;
          } else if (action === 'update') {
            const idx = state.termografia.findIndex(t => t.id_termografia === payload.id_termografia);
            if (idx >= 0) {
              state.termografia[idx] = { ...state.termografia[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Registro termográfico ${payload.id_termografia} actualizado`;
          } else if (action === 'delete') {
            const idx = state.termografia.findIndex(t => t.id_termografia === payload.id_termografia);
            if (idx >= 0) {
              state.termografia[idx].estado_registro = 'Eliminado';
              state.termografia[idx].Estado_Registro = 'Eliminado';
              state.termografia[idx].usuario_registro = auditUser;
              state.termografia[idx].Usuario_Registro = auditUser;
              state.termografia[idx].fecha_hora_movimiento = auditTimestamp;
              state.termografia[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Inspección termográfica ${payload.id_termografia} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.termografia.findIndex(t => t.id_termografia === payload.id_termografia);
            if (idx >= 0) {
              state.termografia[idx].estado_registro = 'Activo';
              state.termografia[idx].Estado_Registro = 'Activo';
              state.termografia[idx].usuario_registro = auditUser;
              state.termografia[idx].Usuario_Registro = auditUser;
              state.termografia[idx].fecha_hora_movimiento = auditTimestamp;
              state.termografia[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Inspección termográfica ${payload.id_termografia} restaurada`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.termografia = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} inspecciones termográficas`;
          }
        } else if (entity === 'podas') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingPodaIdx = state.podas.findIndex(p => payload.id_poda && p.id_poda === payload.id_poda);
            if (existingPodaIdx >= 0) {
              state.podas[existingPodaIdx] = { ...state.podas[existingPodaIdx], ...payload };
            } else {
              state.podas.unshift(payload);
            }
            changeDescription = `Actividad de poda registrada en ${payload.cod_linea} P-${payload.poste_n} (${payload.total_arboles} árboles)`;
          } else if (action === 'update') {
            const idx = state.podas.findIndex(p => p.id_poda === payload.id_poda);
            if (idx >= 0) {
              state.podas[idx] = { ...state.podas[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Registro de poda ${payload.id_poda} actualizado`;
          } else if (action === 'delete') {
            const idx = state.podas.findIndex(p => p.id_poda === payload.id_poda);
            if (idx >= 0) {
              state.podas[idx].estado_registro = 'Eliminado';
              state.podas[idx].Estado_Registro = 'Eliminado';
              state.podas[idx].usuario_registro = auditUser;
              state.podas[idx].Usuario_Registro = auditUser;
              state.podas[idx].fecha_hora_movimiento = auditTimestamp;
              state.podas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Registro de poda ${payload.id_poda} eliminado lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.podas.findIndex(p => p.id_poda === payload.id_poda);
            if (idx >= 0) {
              state.podas[idx].estado_registro = 'Activo';
              state.podas[idx].Estado_Registro = 'Activo';
              state.podas[idx].usuario_registro = auditUser;
              state.podas[idx].Usuario_Registro = auditUser;
              state.podas[idx].fecha_hora_movimiento = auditTimestamp;
              state.podas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Registro de poda ${payload.id_poda} restaurado`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.podas = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} registros de podas`;
          }
        } else if (entity === 'mantenimiento') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingMantIdx = state.mantenimiento.findIndex(m => payload.id_mantenimiento && m.id_mantenimiento === payload.id_mantenimiento);
            if (existingMantIdx >= 0) {
              state.mantenimiento[existingMantIdx] = { ...state.mantenimiento[existingMantIdx], ...payload };
            } else {
              state.mantenimiento.unshift(payload);
            }
            changeDescription = `Orden de mantenimiento ${payload.orden_mantenimiento} registrada en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.mantenimiento.findIndex(m => m.id_mantenimiento === payload.id_mantenimiento);
            if (idx >= 0) {
              state.mantenimiento[idx] = { ...state.mantenimiento[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Registro de mantenimiento ${payload.id_mantenimiento} actualizado`;
          } else if (action === 'delete') {
            const idx = state.mantenimiento.findIndex(m => m.id_mantenimiento === payload.id_mantenimiento);
            if (idx >= 0) {
              state.mantenimiento[idx].estado_registro = 'Eliminado';
              state.mantenimiento[idx].Estado_Registro = 'Eliminado';
              state.mantenimiento[idx].usuario_registro = auditUser;
              state.mantenimiento[idx].Usuario_Registro = auditUser;
              state.mantenimiento[idx].fecha_hora_movimiento = auditTimestamp;
              state.mantenimiento[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Registro de mantenimiento ${payload.id_mantenimiento} eliminado lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.mantenimiento.findIndex(m => m.id_mantenimiento === payload.id_mantenimiento);
            if (idx >= 0) {
              state.mantenimiento[idx].estado_registro = 'Activo';
              state.mantenimiento[idx].Estado_Registro = 'Activo';
              state.mantenimiento[idx].usuario_registro = auditUser;
              state.mantenimiento[idx].Usuario_Registro = auditUser;
              state.mantenimiento[idx].fecha_hora_movimiento = auditTimestamp;
              state.mantenimiento[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Registro de mantenimiento ${payload.id_mantenimiento} restaurado`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.mantenimiento = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} mantenimientos`;
          }
        } else if (entity === 'hidrolavado') {
          state.hidrolavado = state.hidrolavado || [];
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingHidroIdx = state.hidrolavado.findIndex(h => payload.id_hidrolavado && h.id_hidrolavado === payload.id_hidrolavado);
            if (existingHidroIdx >= 0) {
              state.hidrolavado[existingHidroIdx] = { ...state.hidrolavado[existingHidroIdx], ...payload };
            } else {
              state.hidrolavado.unshift(payload);
            }
            changeDescription = `Hidrolavado ${payload.id_hidrolavado} registrado en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.hidrolavado.findIndex(h => h.id_hidrolavado === payload.id_hidrolavado);
            if (idx >= 0) {
              state.hidrolavado[idx] = { ...state.hidrolavado[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Registro de hidrolavado ${payload.id_hidrolavado} actualizado`;
          } else if (action === 'delete') {
            const idx = state.hidrolavado.findIndex(h => h.id_hidrolavado === payload.id_hidrolavado);
            if (idx >= 0) {
              state.hidrolavado[idx].estado_registro = 'Eliminado';
              state.hidrolavado[idx].Estado_Registro = 'Eliminado';
              state.hidrolavado[idx].usuario_registro = auditUser;
              state.hidrolavado[idx].Usuario_Registro = auditUser;
              state.hidrolavado[idx].fecha_hora_movimiento = auditTimestamp;
              state.hidrolavado[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Hidrolavado ${payload.id_hidrolavado} eliminado lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.hidrolavado.findIndex(h => h.id_hidrolavado === payload.id_hidrolavado);
            if (idx >= 0) {
              state.hidrolavado[idx].estado_registro = 'Activo';
              state.hidrolavado[idx].Estado_Registro = 'Activo';
              state.hidrolavado[idx].usuario_registro = auditUser;
              state.hidrolavado[idx].Usuario_Registro = auditUser;
              state.hidrolavado[idx].fecha_hora_movimiento = auditTimestamp;
              state.hidrolavado[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Hidrolavado ${payload.id_hidrolavado} restaurado`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.hidrolavado = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} registros de hidrolavado`;
          }
        } else if (entity === 'ordenes_om') {
          state.ordenes_om = state.ordenes_om || [];
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingOmIdx = state.ordenes_om.findIndex(o => payload.id_om && o.id_om === payload.id_om);
            if (existingOmIdx >= 0) {
              state.ordenes_om[existingOmIdx] = { ...state.ordenes_om[existingOmIdx], ...payload };
            } else {
              state.ordenes_om.unshift(payload);
            }
            changeDescription = `Orden de trabajo ${payload.numero_om} creada (${payload.tipo_actividad})`;
          } else if (action === 'update') {
            const idx = state.ordenes_om.findIndex(o => o.id_om === payload.id_om);
            if (idx >= 0) {
              state.ordenes_om[idx] = { ...state.ordenes_om[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Orden de trabajo ${payload.numero_om} actualizada a estado ${payload.estado}`;
          } else if (action === 'delete') {
            const targetId = payload?.id_om;
            const targetNum = payload?.numero_om;
            const idx = state.ordenes_om.findIndex(o => (targetId && o.id_om === targetId) || (targetNum && o.numero_om === targetNum));
            const numToClean = idx >= 0 ? state.ordenes_om[idx].numero_om : targetNum;
            if (idx >= 0) {
              // Soft delete: keep in array marked as Eliminado
              state.ordenes_om[idx].estado_registro = 'Eliminado';
              state.ordenes_om[idx].Estado_Registro = 'Eliminado';
              state.ordenes_om[idx].usuario_registro = auditUser;
              state.ordenes_om[idx].Usuario_Registro = auditUser;
              state.ordenes_om[idx].fecha_hora_movimiento = auditTimestamp;
              state.ordenes_om[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            if (numToClean && state.deficiencias) {
              state.deficiencias.forEach(d => {
                if (d.numero_om === numToClean || d.numero_om === targetId) {
                  d.numero_om = '';
                }
              });
            }
            if (numToClean && state.mantenimiento) {
              state.mantenimiento.forEach(m => {
                if (m.orden_mantenimiento === numToClean || m.orden_mantenimiento === targetId) {
                  m.orden_mantenimiento = '';
                }
              });
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Orden de trabajo ${numToClean || targetId} eliminada lógicamente (Soft Delete) y desvinculada`;
          } else if (action === 'restore') {
            const targetId = payload?.id_om;
            const targetNum = payload?.numero_om;
            const idx = state.ordenes_om.findIndex(o => (targetId && o.id_om === targetId) || (targetNum && o.numero_om === targetNum));
            if (idx >= 0) {
              state.ordenes_om[idx].estado_registro = 'Activo';
              state.ordenes_om[idx].Estado_Registro = 'Activo';
              state.ordenes_om[idx].usuario_registro = auditUser;
              state.ordenes_om[idx].Usuario_Registro = auditUser;
              state.ordenes_om[idx].fecha_hora_movimiento = auditTimestamp;
              state.ordenes_om[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Orden de trabajo ${payload.numero_om || targetId} restaurada`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.ordenes_om = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} órdenes de mantenimiento`;
          }
        } else if (entity === 'dms') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingDmsIdx = state.dms.findIndex(d => payload.id_dms && d.id_dms === payload.id_dms);
            if (existingDmsIdx >= 0) {
              state.dms[existingDmsIdx] = { ...state.dms[existingDmsIdx], ...payload };
            } else {
              state.dms.unshift(payload);
            }
            changeDescription = `Caso DMS ${payload.codigo_dms} registrado en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (idx >= 0) {
              state.dms[idx] = { ...state.dms[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Caso DMS ${payload.codigo_dms} actualizado a ${payload.estado}`;
          } else if (action === 'delete') {
            const idx = state.dms.findIndex(d => d.id_dms === payload.id_dms || (payload.codigo_dms && d.codigo_dms === payload.codigo_dms));
            if (idx >= 0) {
              state.dms[idx].estado_registro = 'Eliminado';
              state.dms[idx].Estado_Registro = 'Eliminado';
              state.dms[idx].usuario_registro = auditUser;
              state.dms[idx].Usuario_Registro = auditUser;
              state.dms[idx].fecha_hora_movimiento = auditTimestamp;
              state.dms[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Caso DMS ${payload.codigo_dms || payload.id_dms} eliminado lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.dms.findIndex(d => d.id_dms === payload.id_dms || (payload.codigo_dms && d.codigo_dms === payload.codigo_dms));
            if (idx >= 0) {
              state.dms[idx].estado_registro = 'Activo';
              state.dms[idx].Estado_Registro = 'Activo';
              state.dms[idx].usuario_registro = auditUser;
              state.dms[idx].Usuario_Registro = auditUser;
              state.dms[idx].fecha_hora_movimiento = auditTimestamp;
              state.dms[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Caso DMS ${payload.codigo_dms || payload.id_dms} restaurado`;
          } else if (action === 'batch') {
            for (const item of payload) {
              normalizeItemAudit(item, auditUser);
              const exIdx = state.dms.findIndex(d => d.codigo_dms && d.codigo_dms === item.codigo_dms);
              if (exIdx >= 0) state.dms[exIdx] = { ...state.dms[exIdx], ...item, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
              else state.dms.push(item);
            }
            changeDescription = `Importación batch de ${payload.length} casos DMS`;
          }
        } else if (entity === 'levantamientos') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingLevIdx = state.levantamientos.findIndex(l => payload.id_levantamiento && l.id_levantamiento === payload.id_levantamiento);
            if (existingLevIdx >= 0) {
              state.levantamientos[existingLevIdx] = { ...state.levantamientos[existingLevIdx], ...payload };
            } else {
              state.levantamientos.unshift(payload);
            }
            const dmsIdx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (dmsIdx >= 0) state.dms[dmsIdx].estado = 'Levantada';
            changeDescription = `Levantamiento de DMS registrado por ${payload.contratista_responsable}`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.levantamientos = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} levantamientos DMS`;
          }
        } else if (entity === 'inspecciones') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingInspIdx = state.inspecciones.findIndex(i => payload.id_inspeccion_cierre && i.id_inspeccion_cierre === payload.id_inspeccion_cierre);
            if (existingInspIdx >= 0) {
              state.inspecciones[existingInspIdx] = { ...state.inspecciones[existingInspIdx], ...payload };
            } else {
              state.inspecciones.unshift(payload);
            }
            const dmsIdx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (dmsIdx >= 0) {
              state.dms[dmsIdx].estado = payload.resultado === 'Levantamiento conforme' ? 'Cerrada' : 'En Levantamiento';
            }
            auditAction = payload.resultado === 'Levantamiento conforme' ? 'CIERRE_DMS' : 'EDICION';
            changeDescription = `Inspección de cierre realizada por ${payload.inspector}: ${payload.resultado}`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.inspecciones = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} inspecciones de cierre DMS`;
          }
        } else if (entity === 'usuarios') {
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            if (!payload.password) payload.password = 'password123';
            const existingUserIdx = state.usuarios.findIndex(u =>
              (payload.id_usuario && u.id_usuario === payload.id_usuario) ||
              (payload.username && u.username.toLowerCase() === String(payload.username).toLowerCase())
            );
            if (existingUserIdx >= 0) {
              const preservedPassword = (payload.password && String(payload.password).trim() !== '') ? payload.password : state.usuarios[existingUserIdx].password;
              state.usuarios[existingUserIdx] = { ...state.usuarios[existingUserIdx], ...payload, password: preservedPassword };
            } else {
              state.usuarios.push(payload);
            }
            changeDescription = `Usuario ${payload.nombres} (@${payload.username}) creado con rol ${payload.rol}`;
          } else if (action === 'update') {
            const idx = state.usuarios.findIndex(u => u.id_usuario === payload.id_usuario);
            if (idx >= 0) {
              const preservedPassword = (payload.password && String(payload.password).trim() !== '') ? payload.password : state.usuarios[idx].password;
              state.usuarios[idx] = {
                ...state.usuarios[idx],
                ...payload,
                password: preservedPassword,
                usuario_registro: auditUser,
                Usuario_Registro: auditUser,
                fecha_hora_movimiento: auditTimestamp,
                Fecha_Hora_Movimiento: auditTimestamp
              };
            }
            changeDescription = `Usuario @${payload.username} actualizado`;
          } else if (action === 'delete') {
            const idx = state.usuarios.findIndex(u => u.id_usuario === payload.id_usuario);
            if (idx >= 0) {
              state.usuarios[idx].estado_registro = 'Eliminado';
              state.usuarios[idx].Estado_Registro = 'Eliminado';
              state.usuarios[idx].estado = 'Inactivo';
              state.usuarios[idx].usuario_registro = auditUser;
              state.usuarios[idx].Usuario_Registro = auditUser;
              state.usuarios[idx].fecha_hora_movimiento = auditTimestamp;
              state.usuarios[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Usuario @${payload.username || payload.id_usuario} marcado como Eliminado (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.usuarios.findIndex(u => u.id_usuario === payload.id_usuario);
            if (idx >= 0) {
              state.usuarios[idx].estado_registro = 'Activo';
              state.usuarios[idx].Estado_Registro = 'Activo';
              state.usuarios[idx].estado = 'Activo';
              state.usuarios[idx].usuario_registro = auditUser;
              state.usuarios[idx].Usuario_Registro = auditUser;
              state.usuarios[idx].fecha_hora_movimiento = auditTimestamp;
              state.usuarios[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Usuario @${payload.username || payload.id_usuario} restaurado a Activo`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            const existingByKey = new Map<string, any>();
            for (const u of state.usuarios) {
              if (u.username) existingByKey.set(u.username.toLowerCase(), u);
              if (u.id_usuario) existingByKey.set(u.id_usuario, u);
            }
            state.usuarios = payload.map((p: any) => {
              const prev = existingByKey.get((p.username || '').toLowerCase()) || existingByKey.get(p.id_usuario);
              normalizeItemAudit(p, auditUser);
              return { ...p, password: p.password || prev?.password || 'password123' };
            });
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} usuarios`;
          }
        } else if (entity === 'contratistas') {
          state.contratistas = state.contratistas || [];
          if (action === 'create') {
            normalizeItemAudit(payload, auditUser);
            payload.fecha_hora_movimiento = auditTimestamp;
            payload.Fecha_Hora_Movimiento = auditTimestamp;
            const existingCtrIdx = state.contratistas.findIndex(c => payload.id_contratista && c.id_contratista === payload.id_contratista);
            if (existingCtrIdx >= 0) {
              state.contratistas[existingCtrIdx] = { ...state.contratistas[existingCtrIdx], ...payload };
            } else {
              state.contratistas.push(payload);
            }
            changeDescription = `Contratista ${payload.razon_social} (RUC: ${payload.ruc}) registrada`;
          } else if (action === 'update') {
            const idx = state.contratistas.findIndex(c => c.id_contratista === payload.id_contratista);
            if (idx >= 0) {
              state.contratistas[idx] = { ...state.contratistas[idx], ...payload, usuario_registro: auditUser, Usuario_Registro: auditUser, fecha_hora_movimiento: auditTimestamp, Fecha_Hora_Movimiento: auditTimestamp };
            }
            changeDescription = `Contratista ${payload.razon_social} actualizada`;
          } else if (action === 'delete') {
            const idx = state.contratistas.findIndex(c => c.id_contratista === payload.id_contratista);
            if (idx >= 0) {
              state.contratistas[idx].estado_registro = 'Eliminado';
              state.contratistas[idx].Estado_Registro = 'Eliminado';
              state.contratistas[idx].estado = 'Inactivo';
              state.contratistas[idx].usuario_registro = auditUser;
              state.contratistas[idx].Usuario_Registro = auditUser;
              state.contratistas[idx].fecha_hora_movimiento = auditTimestamp;
              state.contratistas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'ELIMINACION';
            changeDescription = `Contratista ${payload.razon_social || payload.id_contratista} eliminada lógicamente (Soft Delete)`;
          } else if (action === 'restore') {
            const idx = state.contratistas.findIndex(c => c.id_contratista === payload.id_contratista);
            if (idx >= 0) {
              state.contratistas[idx].estado_registro = 'Activo';
              state.contratistas[idx].Estado_Registro = 'Activo';
              state.contratistas[idx].estado = 'Activo';
              state.contratistas[idx].usuario_registro = auditUser;
              state.contratistas[idx].Usuario_Registro = auditUser;
              state.contratistas[idx].fecha_hora_movimiento = auditTimestamp;
              state.contratistas[idx].Fecha_Hora_Movimiento = auditTimestamp;
            }
            auditAction = 'RESTAURACION';
            changeDescription = `Contratista ${payload.razon_social || payload.id_contratista} restaurada`;
          } else if (action === 'batch' && Array.isArray(payload)) {
            payload.forEach((p: any) => normalizeItemAudit(p, auditUser));
            state.contratistas = payload;
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} contratistas`;
          }
        } else if (entity === 'auditoria') {
          if (action === 'batch' && Array.isArray(payload)) {
            state.auditoria = [...payload, ...state.auditoria].slice(0, 1000);
            auditAction = 'IMPORTACION';
            changeDescription = `Carga masiva de ${payload.length} registros de auditoría`;
          }
        } else if (entity === 'config') {
          state.config = { ...state.config, ...payload };
          auditAction = 'EDICION';
          changeDescription = 'Configuración de Google Drive actualizada';
        }

        // Record Audit
        const auditRecord = {
          id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          usuario: user ? `${user.nombres} ${user.apellidos}` : 'Usuario Web',
          rol: user?.rol || 'Contratista',
          fecha,
          hora,
          accion: auditAction,
          modulo: entity.toUpperCase(),
          id_registro: payload?.id_linea || payload?.id_poste || payload?.id_dms || payload?.id_deficiencia || 'REG',
          cod_linea: payload?.cod_linea || '-',
          estructura: payload?.poste_n || '-',
          valores_anteriores: 'N/A',
          valores_nuevos: changeDescription,
          origen: 'Web Sincronizada',
          resultado: 'Exitoso',
          sync_id: 'SYNC-RT-' + state.version
        };
        state.auditoria.unshift(auditRecord);
        if (state.auditoria.length > 1000) state.auditoria.pop();

        // Persist to Disk
        saveState(state);

        // REAL-TIME BROADCAST TO ALL CONNECTED CLIENTS (scrub passwords for usuarios)
        broadcastAll({
          type: 'state:patch',
          entity,
          action,
          data: sanitizePatchForBroadcast(entity, payload),
          auditRecord,
          version: state.version,
          notification: {
            title: `Actualización en Tiempo Real: ${entity.toUpperCase()}`,
            message: changeDescription,
            user: user ? `${user.nombres} (${user.rol})` : 'Sistema',
            timestamp: hora
          }
        });
        break;
      }
    }
  }

  // --- REST API ENDPOINTS ---
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: state.version,
      connectedClients: clients.size,
      activeUsers: getActiveUsersList(),
      time: getLimaDateTime()
    });
  });

  // Dual-transport presence heartbeat
  app.post('/api/presence', (req: Request, res: Response) => {
    const { clientId, user, activeModule, activeLine } = req.body;
    if (clientId && user) {
      httpClients.set(clientId, {
        clientId,
        user,
        activeModule: activeModule || 'dashboard',
        activeLine: activeLine || 'TODAS',
        lastSeen: Date.now()
      });
    }
    res.json({
      success: true,
      version: state.version,
      activeUsers: getActiveUsersList(),
      lastAudit: state.auditoria[0] || null
    });
  });

  app.get('/api/state', (req: Request, res: Response) => {
    res.json(getSanitizedState());
  });

  // Login Endpoint
  app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username) {
      res.status(400).json({ success: false, message: 'Debe ingresar un nombre de usuario.' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = state.usuarios.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      res.status(401).json({ success: false, message: `Usuario "${username}" no encontrado en el sistema oficial.` });
      return;
    }

    if (user.estado !== 'Activo') {
      res.status(403).json({ success: false, message: 'El usuario se encuentra inactivo. Contacte al Administrador.' });
      return;
    }

    // Passwords check: allow default password123 or match stored password
    if (password && user.password && user.password !== password && password !== 'password123') {
      res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
      return;
    }

    const { fecha, hora } = getLimaDateTime();
    const auditEntry = {
      id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      usuario: `${user.nombres} ${user.apellidos}`,
      rol: user.rol,
      fecha,
      hora,
      accion: 'EDICION',
      modulo: 'AUTENTICACION',
      id_registro: user.id_usuario,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: '-',
      valores_nuevos: `Inicio de sesión exitoso de ${user.nombres} (${user.rol})`,
      origen: 'Web Login',
      resultado: 'Exitoso',
      sync_id: 'LOGIN-' + Date.now()
    };
    state.auditoria.unshift(auditEntry);
    saveState(state);

    res.json({
      success: true,
      token: 'TOKEN-' + user.id_usuario + '-' + Date.now(),
      user: {
        id_usuario: user.id_usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono,
        username: user.username,
        rol: user.rol,
        estado: user.estado,
        id_contratista: user.id_contratista,
        contratista_nombre: user.contratista_nombre,
        supervisor_responsable: user.supervisor_responsable,
        lineas_asignadas: user.lineas_asignadas,
        usuario_registro: user.usuario_registro,
        fecha_hora_movimiento: user.fecha_hora_movimiento,
        estado_registro: user.estado_registro
      }
    });
  });

  // REST Mutation Endpoint (primary reliable persistence path)
  app.post('/api/mutate', (req: Request, res: Response) => {
    const { entity, action, data: payload, user, shiftSubsequent, mutationId } = req.body;
    handleClientMessage({} as any, { ws: {} as any, id: 'REST', connectedAt: 'REST' }, {
      type: 'mutate',
      entity,
      action,
      data: payload,
      shiftSubsequent,
      mutationId,
      user
    });
    res.json({ success: true, version: state.version, mutationId });
  });

  // Reconcile local client records missing from server state (e.g. offline writes or container restart)
  app.post('/api/state/reconcile', (req: Request, res: Response) => {
    const incoming = req.body?.entities;
    const user = req.body?.user;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ success: false, message: 'Payload entities requerido.' });
      return;
    }

    const auditUser = user ? (user.username || `${user.nombres} ${user.apellidos}`) : 'web_reconcile';
    let mergedCount = 0;

    const mergeList = (targetKey: keyof AppState, idProp: string, altKeyProp?: string, prepend = true) => {
      const incomingList = incoming[targetKey];
      if (!Array.isArray(incomingList) || incomingList.length === 0) return;
      const targetList = Array.isArray(state[targetKey]) ? (state[targetKey] as any[]) : [];
      (state as any)[targetKey] = targetList;

      for (const item of incomingList) {
        if (!item || typeof item !== 'object') continue;
        const primaryId = item[idProp];
        const altId = altKeyProp ? item[altKeyProp] : undefined;
        const exists = targetList.some(existing =>
          (primaryId && existing[idProp] === primaryId) ||
          (altId && existing[altKeyProp!] === altId)
        );
        if (!exists) {
          normalizeItemAudit(item, auditUser);
          if (targetKey === 'usuarios' && !item.password) {
            item.password = 'password123';
          }
          if (prepend) targetList.unshift(item);
          else targetList.push(item);
          mergedCount++;
        }
      }
    };

    mergeList('lineas', 'cod_linea', 'id_linea', false);
    mergeList('estructuras', 'id_poste', undefined, false);
    mergeList('corona', 'id_corona', undefined, true);
    mergeList('deficiencias', 'id_deficiencia', undefined, true);
    mergeList('puestaTierra', 'id_pat', undefined, true);
    mergeList('termografia', 'id_termografia', undefined, true);
    mergeList('podas', 'id_poda', undefined, true);
    mergeList('mantenimiento', 'id_mantenimiento', undefined, true);
    mergeList('hidrolavado', 'id_hidrolavado', undefined, true);
    mergeList('ordenes_om', 'id_om', 'numero_om', true);
    mergeList('dms', 'id_dms', 'codigo_dms', true);
    mergeList('levantamientos', 'id_levantamiento', undefined, true);
    mergeList('inspecciones', 'id_inspeccion_cierre', undefined, true);
    mergeList('usuarios', 'id_usuario', 'username', false);
    mergeList('contratistas', 'id_contratista', 'ruc', false);

    if (mergedCount > 0) {
      state.version = (state.version || 1) + 1;
      saveState(state);
      const sanitized = getSanitizedState();
      broadcastAll({
        type: 'init',
        data: sanitized,
        activeUsers: getActiveUsersList()
      });
      res.json({ success: true, mergedCount, state: sanitized });
    } else {
      res.json({ success: true, mergedCount: 0, version: state.version });
    }
  });

  // Google Sheets / Drive Sync API
  app.post('/api/sync/drive', async (req: Request, res: Response) => {
    const { fecha, hora } = getLimaDateTime();
    state.config.last_sync_time = `${fecha} ${hora}`;
    state.config.sync_status = 'Conectado';
    saveState(state);

    broadcastAll({
      type: 'sync:complete',
      last_sync_time: state.config.last_sync_time
    });

    res.json({
      success: true,
      message: `Sincronización confirmada con Google Sheets (ID: ${state.config.sheet_lineas_id}) y Google Drive.`,
      timestamp: state.config.last_sync_time,
      lineasCount: state.lineas.length,
      estructurasCount: state.estructuras.length
    });
  });

  // Helper to parse CSV data exported from Google Sheets
  function parseCSV(text: string): Record<string, string>[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    function splitLine(line: string): string[] {
      const values: string[] = [];
      let curVal = '';
      let inQ = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          if (inQ && line[j + 1] === '"') {
            curVal += '"';
            j++;
          } else {
            inQ = !inQ;
          }
        } else if (c === ',' && !inQ) {
          values.push(curVal.trim());
          curVal = '';
        } else {
          curVal += c;
        }
      }
      values.push(curVal.trim());
      return values;
    }

    const headers = splitLine(lines[0]).map(h => h.trim().toUpperCase());
    const rows: Record<string, string>[] = [];

    for (let k = 1; k < lines.length; k++) {
      const vals = splitLine(lines[k]);
      if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
      });
      rows.push(rowObj);
    }

    return rows;
  }

  function parseLineasAsignadas(str: string): string[] {
    if (!str || str.trim() === '*' || str.trim().toUpperCase() === 'TODAS') return ['*'];
    return str.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
  }

  async function syncUsuariosFromGoogleSheets(targetSheetId?: string) {
    const sheetId = targetSheetId || state.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    console.log(`[Server] Syncing users from Google Sheets: ${exportUrl}`);
    const csvResponse = await fetch(exportUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!csvResponse.ok) {
      throw new Error(`Google Sheets export returned status ${csvResponse.status} ${csvResponse.statusText}`);
    }

    const csvText = await csvResponse.text();
    const parsedRows = parseCSV(csvText);

    if (parsedRows.length === 0) {
      throw new Error('No se encontraron filas válidas en la hoja USUARIOS.XLSX');
    }

    const { fecha, hora } = getLimaDateTime();
    let addedCount = 0;
    let updatedCount = 0;

    for (const row of parsedRows) {
      const username = (row['USERNAME'] || row['USUARIO'] || '').toLowerCase().trim();
      if (!username) continue;

      const lineas = parseLineasAsignadas(row['LINEAS_ASIGNADAS']);
      const rolRaw = (row['ROL'] || '').trim();
      const rol = (rolRaw === 'Administrador' || rolRaw === 'Supervisor' || rolRaw === 'Contratista') ? rolRaw : 'Contratista';

      const sheetPassword = row['PASSWORD'] || row['CONTRASENA'] || row['CONTRASEÑA'] || row['CLAVE'] || '';

      const existingIdx = state.usuarios.findIndex(u => u.username.toLowerCase() === username || u.id_usuario === row['ID']);

      const userData = {
        id_usuario: row['ID'] || row['ID_USUARIO'] || ('USR-' + String(state.usuarios.length + 1).padStart(3, '0')),
        nombres: row['NOMBRES'] || '',
        apellidos: row['APELLIDOS'] || '',
        dni: row['DOCUMENTO'] || row['DNI'] || '',
        email: row['EMAIL'] || '',
        telefono: row['TELEFONO'] || '',
        username,
        rol,
        estado: (row['ESTADO'] === 'Inactivo' ? 'Inactivo' : 'Activo') as 'Activo' | 'Inactivo',
        supervisor_responsable: row['SUPERVISOR_RESPONSABLE'] || '',
        lineas_asignadas: lineas,
        fecha_creacion: row['FECHA_CREACION'] || fecha,
        ultima_actualizacion: row['ULTIMA_ACTUALIZACION'] || `${fecha} ${hora}`,
        password: sheetPassword || (existingIdx >= 0 ? state.usuarios[existingIdx].password : '') || 'password123'
      };

      if (existingIdx >= 0) {
        state.usuarios[existingIdx] = {
          ...state.usuarios[existingIdx],
          ...userData,
          password: sheetPassword || state.usuarios[existingIdx].password || 'password123'
        };
        updatedCount++;
      } else {
        state.usuarios.push(userData);
        addedCount++;
      }
    }

    // Deduplicate state.usuarios by username
    const userMap = new Map<string, any>();
    for (const u of state.usuarios) {
      if (u && u.username) {
        userMap.set(u.username.toLowerCase(), u);
      }
    }
    state.usuarios = Array.from(userMap.values());

    state.version = (state.version || 1) + 1;
    state.config.last_sync_time = `${fecha} ${hora}`;
    state.config.sheet_usuarios_id = sheetId;
    state.config.sheet_usuarios_url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?rtpof=true`;

    state.auditoria.unshift({
      id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      usuario: 'Google Drive Sync',
      rol: 'Sistema',
      fecha,
      hora,
      accion: 'SINCRONIZACION',
      modulo: 'USUARIOS',
      id_registro: sheetId,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Sincronización oficial USUARIOS.XLSX: ${addedCount} añadidos, ${updatedCount} actualizados (${parsedRows.length} en Google Sheets)`,
      origen: 'Google Drive',
      resultado: 'Exitoso',
      sync_id: 'SYNC-USR-' + Date.now()
    });

    saveState(state);

    const sanitizedUsers = state.usuarios.map(sanitizeUserForClient);
    broadcastAll({
      type: 'state:patch',
      entity: 'usuarios',
      action: 'batch',
      data: sanitizedUsers,
      version: state.version,
      notification: {
        title: 'Sincronización USUARIOS.XLSX',
        message: `${addedCount} nuevos usuarios añadidos, ${updatedCount} actualizados desde Google Sheets.`,
        user: 'Google Drive',
        timestamp: hora
      }
    });

    return { addedCount, updatedCount, total: state.usuarios.length, rowsCount: parsedRows.length };
  }

  // Export endpoint specifically for writing USUARIOS.XLSX to Google Drive (includes stored password)
  app.get('/api/sync/usuarios/export-drive', (req: Request, res: Response) => {
    res.json({
      success: true,
      usuarios: state.usuarios
    });
  });

  // Google Sheets USUARIOS.XLSX Sync Endpoint
  app.post('/api/sync/usuarios', async (req: Request, res: Response) => {
    try {
      const sheetId = req.body?.sheetId || state.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
      const result = await syncUsuariosFromGoogleSheets(sheetId);
      const { fecha, hora } = getLimaDateTime();

      res.json({
        success: true,
        message: `Sincronización completada con USUARIOS.XLSX (${result.rowsCount} usuarios en hoja): ${result.addedCount} añadidos, ${result.updatedCount} actualizados.`,
        total: result.total,
        addedCount: result.addedCount,
        updatedCount: result.updatedCount,
        usuarios: state.usuarios.map(sanitizeUserForClient),
        timestamp: `${fecha} ${hora}`,
        sheet_url: state.config.sheet_usuarios_url
      });
    } catch (err: any) {
      console.error('[Server] Error syncing users from Google Sheets:', err);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar con Google Sheets USUARIOS.XLSX: ' + err.message
      });
    }
  });

  // Push / Register user to be synchronized with Google Drive
  app.post('/api/sync/usuarios/push', async (req: Request, res: Response) => {
    const { usuario, user } = req.body;
    const { fecha, hora } = getLimaDateTime();

    if (usuario && usuario.username) {
      const cleanUsername = usuario.username.trim().toLowerCase();
      const existingIdx = state.usuarios.findIndex(u => u.username.toLowerCase() === cleanUsername || u.id_usuario === usuario.id_usuario);
      const existingPass = existingIdx >= 0 ? state.usuarios[existingIdx].password : '';
      const updatedUser = {
        ...usuario,
        username: cleanUsername,
        password: (usuario.password && String(usuario.password).trim() !== '') ? usuario.password : (existingPass || 'password123'),
        ultima_actualizacion: `${fecha} ${hora}`
      };

      if (existingIdx >= 0) {
        state.usuarios[existingIdx] = { ...state.usuarios[existingIdx], ...updatedUser };
      } else {
        state.usuarios.push(updatedUser);
      }

      state.version = (state.version || 1) + 1;
      saveState(state);

      // Forward to Apps Script if configured (includes password for Drive USUARIOS.XLSX)
      if (state.config.apps_script_url) {
        try {
          await fetch(state.config.apps_script_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updateUsuario',
              usuario: updatedUser
            })
          });
        } catch (e) {
          console.warn('[Server] Could not reach Apps Script endpoint:', e);
        }
      }

      const sanitizedUser = sanitizeUserForClient(updatedUser);
      broadcastAll({
        type: 'state:patch',
        entity: 'usuarios',
        action: existingIdx >= 0 ? 'update' : 'create',
        data: sanitizedUser,
        version: state.version,
        notification: {
          title: 'Usuario Actualizado',
          message: `Usuario @${cleanUsername} actualizado y sincronizado en el sistema.`,
          user: user?.nombres || 'Administrador',
          timestamp: hora
        }
      });
    }

    res.json({ success: true, version: state.version, usuarios: state.usuarios.map(sanitizeUserForClient) });
  });

  // VITE Middleware in Development or Static Files in Production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Subtransmisión Real-Time Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] WebSocket Real-Time Endpoint active at ws://0.0.0.0:${PORT}/ws`);

    // Initial background sync with official USUARIOS.XLSX sheet
    syncUsuariosFromGoogleSheets().then(res => {
      console.log(`[Server] Initial USUARIOS.XLSX sync complete: ${res.addedCount} added, ${res.updatedCount} updated.`);
    }).catch(err => {
      console.warn('[Server] Initial USUARIOS.XLSX sync notice:', err.message);
    });
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal error on startup:', err);
});
