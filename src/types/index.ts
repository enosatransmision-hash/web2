export type RolUsuario = 'Administrador' | 'Supervisor' | 'Contratista';
export type EstadoRegistro = 'Activo' | 'Eliminado';

export interface AuditFields {
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Contratista {
  id_contratista: string;
  razon_social: string;
  ruc: string; // 11 dígitos
  representante_legal: string;
  telefono: string;
  email: string;
  especialidad: string;
  estado: 'Activo' | 'Inactivo';
  actividades_asignadas: string[]; // e.g. ['deficiencias', 'puesta_tierra', 'termografia', 'podas', 'mantenimiento', 'ordenes_om', 'dms']
  lineas_asignadas?: string[];
  fecha_registro: string;
  ultima_actualizacion?: string;
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Usuario {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  username: string;
  rol: RolUsuario;
  estado: 'Activo' | 'Inactivo';
  supervisor_responsable?: string;
  id_contratista?: string; // ID único de la contratista vinculada
  contratista_nombre?: string; // Razón social de la contratista vinculada
  lineas_asignadas: string[]; // List of COD_LINEA, or ['*'] for all
  fecha_creacion: string;
  password?: string;
  ultima_actualizacion?: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface LineaSubtransmision {
  id_linea: string;
  cod_linea: string;
  nombre: string;
  tipo_sistema: string;
  tension_nom: string;
  nodo_salida: string;
  nodo_llegada: string;
  celda_salida: string;
  celda_llegada: string;
  estado: 'Activo' | 'Inactivo' | 'En Mantenimiento';
  fecha_registro: string;
  ultima_sincronizacion: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Estructura {
  id_poste: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  poste_cantidad: string;
  poste_material: string;
  cruceta_material: string;
  mensula_material: string;
  riostra_o_amarre_material: string;
  aislador_material: string;
  aislador_cant: string;
  aislador_tipo: string;
  conductor_material: string;
  conductor_calibre: string;
  conductor_n_fases: string;
  estado: 'Operativo' | 'En Mantenimiento' | 'Desactivado';
  observaciones?: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export type Prioridad = 'PRIORITARIO' | 'NO PRIORITARIO';

export interface PuestaTierra {
  id_pat: string;
  item?: number;
  cod_linea: string;
  poste_n: string;
  utm_este?: string;
  utm_norte?: string;
  tipo_estructura?: string;
  material_estructura?: string;
  fecha_medicion: string;
  valor_resistencia_pat: number;
  comentario?: string;
  prioridad: Prioridad;
  alerta_deficiencia?: boolean;
  id_deficiencia_relacionada?: string;
  evidencia_url?: string;
  responsable?: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export type EstadoDeficiencia = 
  | 'Registrada'
  | 'Pendiente de revisión'
  | 'En atención'
  | 'Corregida'
  | 'Pendiente de verificación'
  | 'Cerrada'
  | 'Rechazada para corrección';

export type TipoPosteDeficiencia = 'Madera' | 'Concreto' | 'Celosía';

export interface Deficiencia {
  id_deficiencia: string;
  cod_linea: string;
  poste_n: string;
  tipo_poste?: TipoPosteDeficiencia;
  fecha_inspeccion: string;
  tipo_deficiencia: string;
  descripcion: string;
  prioridad: Prioridad;
  numero_om?: string; // N° de OM autocompletado
  evidencia_fotografica: string;
  evidencia_drive_id?: string;
  observaciones: string;
  usuario_responsable: string;
  estado: EstadoDeficiencia;
  fecha_cierre?: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Termografia {
  id_termografia: string;
  id_poste?: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  conductor_calibre: string;
  conductor_n_fases: string;
  nivel_tension: string; // e.g. '60 kV'
  tipo_zona: string; // e.g. 'Costa - Salina', 'Rural', 'Urbana'
  temp_ambiente: number; // °C
  temp_max_componente: number; // °C
  emisividad: number; // e.g. 0.95
  delta_t: number; // temp_max - temp_ambiente
  hora: string;
  fecha: string;
  componente_falla: string;
  comentario: string;
  criticidad: 'Normal' | 'Alerta' | 'Emergencia';
  prioridad: Prioridad;
  evidencia_url: string;
  inspector: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface EfectoCorona {
  id_corona: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  tipo_aislador: string;
  nivel_tension_kv: string;
  temp_c: string;
  humedad_pct: string;
  fase_r_ganancia: string;
  fase_r_conteo: number;
  fase_s_ganancia: string;
  fase_s_conteo: number;
  fase_t_ganancia: string;
  fase_t_conteo: number;
  fecha: string;
  hora: string;
  prioridad: Prioridad; // Prioritario / No Prioritario
  descripcion_detallada?: string; // Descripción detallada del problema detectado
  causa_probable?: string; // Causa probable identificada
  accion_recomendada?: string; // Acción técnica recomendada
  comentarios: string;
  situaciones: string[];
  evidencia_url: string;
  inspector: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Poda {
  id_poda: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  tipo_aislador: string;
  nivel_tension_kv: string;
  fecha_ejecucion: string;
  ubicacion_referencia: string;
  punto_inicial: string;
  punto_final: string;
  algarrobo: number;
  palmera: number;
  ornamental: number;
  tamarindo: number;
  ponceana: number;
  otros: number;
  total_arboles: number;
  observaciones: string;
  prioridad: Prioridad;
  fotografias: string[];
  contratista_responsable: string;
  estado: 'Programada' | 'En Ejecución' | 'Completada' | 'Verificada';
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Mantenimiento {
  id_mantenimiento: string;
  cod_linea: string;
  poste_n: string;
  fecha_ejecucion: string;
  tipo_mantenimiento: 'Preventivo' | 'Correctivo' | 'Rutinario' | 'Emergencia' | 'Estructural' | 'Predictivo';
  actividad_realizada: string;
  orden_mantenimiento: string;
  observaciones: string;
  prioridad: Prioridad;
  fotografias: string[];
  contratista_responsable: string;
  estado: 'Programado' | 'En Proceso' | 'Finalizado' | 'Aprobado';
  altera_estructuras?: boolean;
  detalle_reordenamiento?: string;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface Hidrolavado {
  id_hidrolavado: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado?: string;
  tipo_aislador: string;
  nivel_tension_kv: string;
  fecha_ejecucion: string;
  metodo_lavado: 'En Caliente (Línea Energizada)' | 'En Frío (Línea Desenergizada)';
  agua_utilizada_litros: number;
  conductividad_agua_us: number;
  presion_psi: number;
  nivel_contaminacion: 'Bajo' | 'Medio' | 'Alto' | 'Crítico (Salino)';
  prioridad: Prioridad;
  estado: 'Programado' | 'En Proceso' | 'Completado' | 'Verificado';
  contratista_responsable: string;
  orden_mantenimiento?: string;
  observaciones: string;
  fotografias: string[];
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export type EstadoOrdenMantenimiento = 'Subsanado' | 'Por subsanar';

export type TipoActividadOM =
  | 'Deficiencias Técnicas'
  | 'Puesta a Tierra'
  | 'Termografía Infrarroja'
  | 'Control de Podas'
  | 'Mantenimiento de Postes'
  | 'Hidrolavado';

export type DriveModuleKey =
  | 'LINEAS'
  | 'ESTRUCTURAS'
  | 'DEFICIENCIAS'
  | 'PUESTA_A_TIERRA'
  | 'EFECTO_CORONA'
  | 'TERMOGRAFIA'
  | 'CONTROL_PODAS'
  | 'MANTENIMIENTO'
  | 'HIDROLAVADO'
  | 'ORDENES_OM'
  | 'DMS'
  | 'LEVANTAMIENTOS_DMS'
  | 'INSPECCIONES_DMS'
  | 'CONTRATISTAS'
  | 'AUDITORIA_SISTEMA'
  | 'USUARIOS';

export interface ItemRegistroOM {
  id_registro: string;
  cod_linea: string;
  poste_n: string;
  descripcion: string;
  prioridad: Prioridad;
  tipo_actividad: TipoActividadOM;
  estado_original?: string;
  fecha_original?: string;
  evidencia_url?: string;
}

export interface OrdenMantenimiento {
  id_om: string;
  numero_om: string;
  fecha_inicio: string;
  fecha_ejecucion: string;
  estado: EstadoOrdenMantenimiento;
  tipo_actividad: TipoActividadOM;
  registros_asociados: ItemRegistroOM[];
  responsable?: string;
  observaciones?: string;
  fecha_registro: string;
  prioridad?: Prioridad;
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export type EstadoDMS = 
  | 'Pendiente'
  | 'Asignada'
  | 'En Levantamiento'
  | 'Levantada'
  | 'Verificada'
  | 'Cerrada';

export interface DMSItem {
  id_dms: string;
  cod_linea: string;
  poste_n: string;
  codigo_dms: string;
  descripcion: string;
  fecha_identificacion: string;
  prioridad: Prioridad;
  fuente: string; // e.g. OSINERGMIN, Inspección Interna
  orden_servicio: string;
  estado: EstadoDMS;
  observaciones: string;
  evidencias: string[];
  // Campos de Auditoría y Trazabilidad
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface LevantamientoDMS {
  id_levantamiento: string;
  id_dms: string;
  cod_linea: string;
  poste_n: string;
  fecha_ejecucion: string;
  descripcion_trabajo: string;
  orden_servicio: string;
  fotografias: string[];
  observaciones: string;
  contratista_responsable: string;
  estado: 'Registrado' | 'Aceptado por Supervisor' | 'Rechazado';
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface InspeccionCierreDMS {
  id_inspeccion_cierre: string;
  id_dms: string;
  id_levantamiento: string;
  cod_linea: string;
  poste_n: string;
  fecha_inspeccion: string;
  inspector: string;
  resultado: 'Levantamiento conforme' | 'Levantamiento no conforme' | 'Requiere nueva intervención';
  observaciones: string;
  evidencias_fotograficas: string[];
  estado_final: 'Cerrada' | 'En Corrección' | 'Pendiente';
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
  Usuario_Registro?: string;
  Fecha_Hora_Movimiento?: string;
  Estado_Registro?: EstadoRegistro;
}

export interface EvidenciaFotografica {
  id_evidencia: string;
  id_actividad: string;
  tipo_actividad: 'Deficiencia' | 'Termografía' | 'Efecto Corona' | 'Poda' | 'Mantenimiento' | 'Hidrolavado' | 'DMS' | 'Estructura';
  cod_linea: string;
  poste_n: string;
  drive_file_id?: string;
  enlace_drive?: string;
  tipo_foto: 'Antes' | 'Durante' | 'Después' | 'Detalle' | 'UV_Corona' | 'Termograma';
  fecha_registro: string;
  usuario_responsable: string;
  descripcion: string;
  url: string; // Data URL or Web link
}

export interface AuditoriaRegistro {
  id_auditoria: string;
  usuario: string;
  rol: string;
  fecha: string; // YYYY-MM-DD America/Lima
  hora: string; // HH:mm:ss America/Lima
  accion: 'CREACION' | 'EDICION' | 'DESACTIVACION' | 'ELIMINACION' | 'RESTAURACION' | 'SINCRONIZACION' | 'IMPORTACION' | 'CIERRE_DMS' | 'REORDENAMIENTO';
  modulo: string;
  id_registro: string;
  cod_linea: string;
  estructura: string;
  valores_anteriores: string;
  valores_nuevos: string;
  origen: 'Web' | 'Google Drive' | 'Importación Excel' | 'Automático';
  resultado: 'Exitoso' | 'Fallido' | 'Conflicto';
  sync_id: string;
  usuario_registro?: string;
  fecha_hora_movimiento?: string;
  estado_registro?: EstadoRegistro;
}

export interface ConfiguracionDrive {
  sheet_lineas_id: string;
  sheet_lineas_url: string;
  sheet_usuarios_id?: string;
  sheet_usuarios_url?: string;
  drive_folder_id: string;
  drive_folder_url?: string;
  apps_script_url: string;
  auto_sync_interval: number; // minutes, 0 = off
  last_sync_time: string;
  sync_status: 'Conectado' | 'Desconectado' | 'Sincronizando' | 'Error';
  error_message?: string;
  google_account_email?: string;
  module_file_ids?: Record<string, string>;
  module_file_urls?: Record<string, string>;
  pending_sync_modules?: string[];
}

export interface ConflictoRegistro {
  id_conflicto: string;
  modulo: string;
  id_registro: string;
  campo: string;
  valor_local: string;
  valor_drive: string;
  fecha_deteccion: string;
  resuelto: boolean;
  resolucion?: 'Local' | 'Drive';
}
