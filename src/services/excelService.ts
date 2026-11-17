import * as XLSX from 'xlsx';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Poda,
  Mantenimiento,
  Hidrolavado,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  AuditoriaRegistro,
  Usuario,
  PuestaTierra,
  OrdenMantenimiento,
  Termografia,
  Contratista,
  DriveModuleKey
} from '../types';
import { formatAuditDateTime } from '../utils/auditUtils';

export interface DriveModuleMetaInfo {
  key: DriveModuleKey;
  label: string;
  fileName: string;
  sheetName: string;
  entity: string;
}

export const DRIVE_MODULE_META: Record<DriveModuleKey, DriveModuleMetaInfo> = {
  LINEAS: { key: 'LINEAS', label: 'Líneas Subtransmisión', fileName: 'Registro_Lineas.xlsx', sheetName: 'Lineas_Subtransmision', entity: 'lineas' },
  ESTRUCTURAS: { key: 'ESTRUCTURAS', label: 'Planilla de Estructuras', fileName: 'Planilla_Estructuras.xlsx', sheetName: 'Planilla_Estructuras', entity: 'estructuras' },
  DEFICIENCIAS: { key: 'DEFICIENCIAS', label: 'Deficiencias Técnicas', fileName: 'Inspeccion_Deficiencias.xlsx', sheetName: 'Deficiencias_Tecnicas', entity: 'deficiencias' },
  PUESTA_A_TIERRA: { key: 'PUESTA_A_TIERRA', label: 'Puesta a Tierra (PAT)', fileName: 'Mediciones_Puesta_a_Tierra.xlsx', sheetName: 'Puesta_a_Tierra', entity: 'puesta_tierra' },
  EFECTO_CORONA: { key: 'EFECTO_CORONA', label: 'Efecto Corona UV', fileName: 'Mediciones_Efecto_Corona_UV.xlsx', sheetName: 'Efecto_Corona', entity: 'corona' },
  TERMOGRAFIA: { key: 'TERMOGRAFIA', label: 'Termografía Infrarroja', fileName: 'Inspecciones_Termograficas.xlsx', sheetName: 'Termografia', entity: 'termografia' },
  CONTROL_PODAS: { key: 'CONTROL_PODAS', label: 'Control de Podas', fileName: 'Control_Podas_Franja_Servidumbre.xlsx', sheetName: 'Control_Podas', entity: 'podas' },
  MANTENIMIENTO: { key: 'MANTENIMIENTO', label: 'Mantenimiento / Postes', fileName: 'Mantenimiento_Subtransmision.xlsx', sheetName: 'Mantenimiento', entity: 'mantenimiento' },
  HIDROLAVADO: { key: 'HIDROLAVADO', label: 'Hidrolavado de Aisladores', fileName: 'Hidrolavado_Aisladores.xlsx', sheetName: 'Hidrolavado', entity: 'hidrolavado' },
  ORDENES_OM: { key: 'ORDENES_OM', label: 'Órdenes de Mantenimiento', fileName: 'Ordenes_Mantenimiento.xlsx', sheetName: 'Ordenes_Mantenimiento', entity: 'ordenes_om' },
  DMS: { key: 'DMS', label: 'Gestión de DMS', fileName: 'Infracciones_DMS.xlsx', sheetName: 'Gestion_DMS', entity: 'dms' },
  LEVANTAMIENTOS_DMS: { key: 'LEVANTAMIENTOS_DMS', label: 'Levantamientos DMS', fileName: 'Levantamientos_DMS.xlsx', sheetName: 'Levantamientos_DMS', entity: 'levantamientos' },
  INSPECCIONES_DMS: { key: 'INSPECCIONES_DMS', label: 'Inspecciones Cierre DMS', fileName: 'Inspecciones_Cierre_DMS.xlsx', sheetName: 'Inspecciones_DMS', entity: 'inspecciones' },
  CONTRATISTAS: { key: 'CONTRATISTAS', label: 'Contratistas', fileName: 'Directorio_Contratistas.xlsx', sheetName: 'Contratistas', entity: 'contratistas' },
  AUDITORIA_SISTEMA: { key: 'AUDITORIA_SISTEMA', label: 'Auditoría del Sistema', fileName: 'Historial_Modificaciones.xlsx', sheetName: 'Historial_Modificaciones', entity: 'auditoria' },
  USUARIOS: { key: 'USUARIOS', label: 'Usuarios y Contraseñas', fileName: 'USUARIOS.xlsx', sheetName: 'Usuarios_Contrasenas', entity: 'usuarios' }
};

function pickCol(row: Record<string, any>, ...keys: string[]): string {
  const normMap = new Map<string, any>();
  Object.keys(row).forEach(k => {
    normMap.set(k.trim().toUpperCase().replace(/\s+/g, '_'), row[k]);
  });
  for (const key of keys) {
    const val = normMap.get(key.toUpperCase());
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function numCol(row: Record<string, any>, fallback: number, ...keys: string[]): number {
  const str = pickCol(row, ...keys);
  if (!str) return fallback;
  const parsed = Number(str.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class ExcelService {
  private static createWorkbookFromRows(data: Record<string, any>[], sheetName = 'Datos'): XLSX.WorkBook {
    const safeData = data && data.length > 0 ? data : [{ ESTADO: 'Sin registros' }];
    const ws = XLSX.utils.json_to_sheet(safeData);
    const colWidths = Object.keys(safeData[0]).map(key => {
      let maxLen = key.length;
      safeData.forEach(row => {
        const valStr = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
        if (valStr.length > maxLen) {
          maxLen = Math.min(valStr.length, 60);
        }
      });
      return { wch: Math.max(maxLen + 2, 10) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    return wb;
  }

  private static downloadExcelFile(data: Record<string, any>[], filename: string, sheetName = 'Datos') {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar a Excel');
      return;
    }
    const wb = this.createWorkbookFromRows(data, sheetName);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static getAuditColumns(item: Record<string, any>) {
    return {
      USUARIO_REGISTRO: item.usuario_registro || item.Usuario_Registro || 'admin_carlos (Carlos Alberto Mendoza Rivas)',
      FECHA_HORA_MOVIMIENTO: formatAuditDateTime(
        item.fecha_hora_movimiento ||
        item.Fecha_Hora_Movimiento ||
        item.fecha_registro ||
        item.fecha_creacion ||
        item.fecha_ejecucion ||
        item.fecha_inspeccion ||
        item.fecha ||
        item.fecha_identificacion ||
        item.ultima_sincronizacion ||
        item.ultima_actualizacion
      ),
      ESTADO_REGISTRO: item.estado_registro || item.Estado_Registro || 'Activo'
    };
  }

  // Row mappers with mandatory audit columns at end
  static mapLineasRows(lineas: LineaSubtransmision[]) {
    return lineas.map(l => ({
      ID_LINEA: l.id_linea,
      COD_LINEA: String(l.cod_linea),
      NOMBRE: l.nombre,
      TIPO_SISTEMA: l.tipo_sistema,
      TENSION_NOM: String(l.tension_nom),
      NODO_SALIDA: l.nodo_salida,
      NODO_LLEGADA: l.nodo_llegada,
      CELDA_SALIDA: l.celda_salida,
      CELDA_LLEGADA: l.celda_llegada,
      ESTADO: l.estado,
      ULTIMA_SINCRONIZACION: l.ultima_sincronizacion,
      ...this.getAuditColumns(l)
    }));
  }

  static mapEstructurasRows(estructuras: Estructura[]) {
    return estructuras.map(e => ({
      ID_POSTE: e.id_poste,
      COD_LINEA: String(e.cod_linea),
      POSTE_N: String(e.poste_n),
      TIPO_ARMADO: e.tipo_armado,
      POSTE_CANTIDAD: e.poste_cantidad,
      POSTE_MATERIAL: e.poste_material,
      CRUCETA_MATERIAL: e.cruceta_material,
      MENSULA_MATERIAL: e.mensula_material || '-',
      RIOSTRA_O_AMARRE_MATERIAL: e.riostra_o_amarre_material || '-',
      AISLADOR_MATERIAL: e.aislador_material,
      AISLADOR_CANT: e.aislador_cant,
      AISLADOR_TIPO: e.aislador_tipo || '-',
      CONDUCTOR_MATERIAL: e.conductor_material,
      CONDUCTOR_CALIBRE: e.conductor_calibre,
      CONDUCTOR_N_FASES: e.conductor_n_fases,
      ESTADO: e.estado,
      OBSERVACIONES: e.observaciones || '-',
      ...this.getAuditColumns(e)
    }));
  }

  static mapDeficienciasRows(deficiencias: Deficiencia[]) {
    return deficiencias.map(d => ({
      ID_DEFICIENCIA: d.id_deficiencia,
      COD_LINEA: String(d.cod_linea),
      POSTE_N: String(d.poste_n),
      FECHA_INSPECCION: d.fecha_inspeccion,
      TIPO_DEFICIENCIA: d.tipo_deficiencia,
      DESCRIPCION: d.descripcion,
      PRIORIDAD: d.prioridad,
      NUMERO_OM: d.numero_om || '-',
      ESTADO: d.estado,
      USUARIO_RESPONSABLE: d.usuario_responsable,
      EVIDENCIA_URL: d.evidencia_fotografica,
      OBSERVACIONES: d.observaciones,
      ...this.getAuditColumns(d)
    }));
  }

  static mapPuestaTierraRows(patList: PuestaTierra[]) {
    return patList.map(p => ({
      ID_PAT: p.id_pat,
      COD_LINEA: String(p.cod_linea),
      POSTE_N: String(p.poste_n),
      FECHA_MEDICION: p.fecha_medicion,
      VALOR_RESISTENCIA_OHMIOS: p.valor_resistencia_pat,
      PRIORIDAD: p.prioridad,
      ALERTA_DEFICIENCIA: p.alerta_deficiencia ? 'SI (≥ 5 Ω)' : 'NO (< 5 Ω)',
      TIPO_ESTRUCTURA: p.tipo_estructura || '-',
      MATERIAL_ESTRUCTURA: p.material_estructura || '-',
      UTM_ESTE: p.utm_este || '-',
      UTM_NORTE: p.utm_norte || '-',
      RESPONSABLE: p.responsable || '-',
      COMENTARIO: p.comentario || '-',
      EVIDENCIA_URL: p.evidencia_url || '-',
      ...this.getAuditColumns(p)
    }));
  }

  static mapEfectoCoronaRows(coronaList: EfectoCorona[]) {
    return coronaList.map(c => ({
      ID_CORONA: c.id_corona,
      COD_LINEA: String(c.cod_linea),
      POSTE_N: String(c.poste_n),
      TIPO_ARMADO: c.tipo_armado,
      TIPO_AISLADOR: c.tipo_aislador,
      NIVEL_TENSION_KV: c.nivel_tension_kv,
      PRIORIDAD: c.prioridad || 'NO PRIORITARIO',
      DESCRIPCION_DETALLADA: c.descripcion_detallada || '-',
      CAUSA_PROBABLE: c.causa_probable || '-',
      ACCION_RECOMENDADA: c.accion_recomendada || '-',
      FECHA: c.fecha,
      HORA: c.hora,
      TEMP_C: c.temp_c,
      HUMEDAD_PCT: c.humedad_pct,
      FASE_R_GANANCIA: c.fase_r_ganancia,
      FASE_R_CONTEO: c.fase_r_conteo,
      FASE_S_GANANCIA: c.fase_s_ganancia,
      FASE_S_CONTEO: c.fase_s_conteo,
      FASE_T_GANANCIA: c.fase_t_ganancia,
      FASE_T_CONTEO: c.fase_t_conteo,
      SITUACIONES: (c.situaciones || []).join(', '),
      COMENTARIOS: c.comentarios,
      INSPECTOR: c.inspector,
      EVIDENCIA_URL: c.evidencia_url,
      ...this.getAuditColumns(c)
    }));
  }

  static mapTermografiaRows(termografiaList: Termografia[]) {
    return termografiaList.map(t => ({
      ID_TERMOGRAFIA: t.id_termografia,
      COD_LINEA: String(t.cod_linea),
      POSTE_N: String(t.poste_n),
      FECHA: t.fecha,
      HORA: t.hora,
      COMPONENTE_FALLA: t.componente_falla,
      TEMP_AMBIENTE_C: t.temp_ambiente,
      TEMP_MAX_COMPONENTE_C: t.temp_max_componente,
      DELTA_T_C: t.delta_t,
      CRITICIDAD: t.criticidad,
      PRIORIDAD: t.prioridad || (t.delta_t >= 15 ? 'PRIORITARIO' : 'NO PRIORITARIO'),
      EMISIVIDAD: t.emisividad,
      NIVEL_TENSION: t.nivel_tension,
      TIPO_ZONA: t.tipo_zona,
      COMENTARIO: t.comentario,
      INSPECTOR: t.inspector,
      EVIDENCIA_URL: t.evidencia_url,
      ...this.getAuditColumns(t)
    }));
  }

  static mapPodasRows(podasList: Poda[]) {
    return podasList.map(p => ({
      ID_PODA: p.id_poda,
      COD_LINEA: String(p.cod_linea),
      POSTE_N: String(p.poste_n),
      FECHA_EJECUCION: p.fecha_ejecucion,
      ESTADO: p.estado,
      PRIORIDAD: p.prioridad || 'NO PRIORITARIO',
      ALGARROBO: p.algarrobo,
      PALMERA: p.palmera,
      ORNAMENTAL: p.ornamental,
      TAMARINDO: p.tamarindo,
      PONCEANA: p.ponceana,
      OTROS: p.otros,
      TOTAL_ARBOLES: p.total_arboles,
      UBICACION_REFERENCIA: p.ubicacion_referencia,
      PUNTO_INICIAL: p.punto_inicial,
      PUNTO_FINAL: p.punto_final,
      CONTRATISTA_RESPONSABLE: p.contratista_responsable,
      OBSERVACIONES: p.observaciones,
      ...this.getAuditColumns(p)
    }));
  }

  static mapMantenimientoRows(mantList: Mantenimiento[]) {
    return mantList.map(m => ({
      ID_MANTENIMIENTO: m.id_mantenimiento,
      COD_LINEA: String(m.cod_linea),
      POSTE_N: String(m.poste_n),
      ORDEN_MANTENIMIENTO: m.orden_mantenimiento,
      FECHA_EJECUCION: m.fecha_ejecucion,
      TIPO_MANTENIMIENTO: m.tipo_mantenimiento,
      ACTIVIDAD_REALIZADA: m.actividad_realizada,
      PRIORIDAD: m.prioridad || 'NO PRIORITARIO',
      ESTADO: m.estado,
      ALTERA_ESTRUCTURAS: m.altera_estructuras ? 'SI' : 'NO',
      CONTRATISTA_RESPONSABLE: m.contratista_responsable,
      OBSERVACIONES: m.observaciones,
      ...this.getAuditColumns(m)
    }));
  }

  static mapHidrolavadoRows(hidroList: Hidrolavado[]) {
    return hidroList.map(h => ({
      ID_HIDROLAVADO: h.id_hidrolavado,
      COD_LINEA: String(h.cod_linea),
      POSTE_N: String(h.poste_n),
      TIPO_ARMADO: h.tipo_armado || '-',
      TIPO_AISLADOR: h.tipo_aislador,
      NIVEL_TENSION_KV: h.nivel_tension_kv,
      FECHA_EJECUCION: h.fecha_ejecucion,
      METODO_LAVADO: h.metodo_lavado,
      AGUA_UTILIZADA_LITROS: h.agua_utilizada_litros,
      CONDUCTIVIDAD_AGUA_US: h.conductividad_agua_us,
      PRESION_PSI: h.presion_psi,
      NIVEL_CONTAMINACION: h.nivel_contaminacion,
      PRIORIDAD: h.prioridad,
      ESTADO: h.estado,
      ORDEN_MANTENIMIENTO: h.orden_mantenimiento || '-',
      CONTRATISTA_RESPONSABLE: h.contratista_responsable,
      OBSERVACIONES: h.observaciones,
      ...this.getAuditColumns(h)
    }));
  }

  static mapOrdenesMantenimientoRows(omList: OrdenMantenimiento[]) {
    return omList.map(om => ({
      ID_OM: om.id_om,
      NUMERO_OM: om.numero_om,
      TIPO_ACTIVIDAD: om.tipo_actividad,
      ESTADO: om.estado,
      PRIORIDAD: om.prioridad || (om.registros_asociados?.some(r => r.prioridad === 'PRIORITARIO') ? 'PRIORITARIO' : 'NO PRIORITARIO'),
      FECHA_INICIO: om.fecha_inicio,
      FECHA_EJECUCION: om.fecha_ejecucion,
      RESPONSABLE: om.responsable || '-',
      CANTIDAD_REGISTROS: (om.registros_asociados || []).length,
      OBSERVACIONES: om.observaciones || '-',
      ...this.getAuditColumns(om)
    }));
  }

  static mapDMSRows(dmsList: DMSItem[]) {
    return dmsList.map(d => ({
      ID_DMS: d.id_dms,
      CODIGO_DMS: d.codigo_dms,
      COD_LINEA: String(d.cod_linea),
      POSTE_N: String(d.poste_n),
      FECHA_IDENTIFICACION: d.fecha_identificacion,
      DESCRIPCION: d.descripcion,
      PRIORIDAD: d.prioridad,
      FUENTE: d.fuente,
      ORDEN_SERVICIO: d.orden_servicio,
      ESTADO: d.estado,
      OBSERVACIONES: d.observaciones,
      ...this.getAuditColumns(d)
    }));
  }

  static mapLevantamientosDMSRows(list: LevantamientoDMS[]) {
    return list.map(l => ({
      ID_LEVANTAMIENTO: l.id_levantamiento,
      ID_DMS: l.id_dms,
      COD_LINEA: String(l.cod_linea),
      POSTE_N: String(l.poste_n),
      FECHA_EJECUCION: l.fecha_ejecucion,
      DESCRIPCION_TRABAJO: l.descripcion_trabajo,
      ORDEN_SERVICIO: l.orden_servicio,
      CONTRATISTA_RESPONSABLE: l.contratista_responsable,
      ESTADO: l.estado,
      OBSERVACIONES: l.observaciones,
      ...this.getAuditColumns(l)
    }));
  }

  static mapInspeccionesDMSRows(list: InspeccionCierreDMS[]) {
    return list.map(i => ({
      ID_INSPECCION_CIERRE: i.id_inspeccion_cierre,
      ID_DMS: i.id_dms,
      ID_LEVANTAMIENTO: i.id_levantamiento,
      COD_LINEA: String(i.cod_linea),
      POSTE_N: String(i.poste_n),
      FECHA_INSPECCION: i.fecha_inspeccion,
      INSPECTOR: i.inspector,
      RESULTADO: i.resultado,
      ESTADO_FINAL: i.estado_final,
      OBSERVACIONES: i.observaciones,
      ...this.getAuditColumns(i)
    }));
  }

  static mapUsuariosRows(usuariosList: Usuario[], includePassword = false) {
    return usuariosList.map(u => {
      const base: Record<string, any> = {
        ID_USUARIO: u.id_usuario,
        NOMBRES: u.nombres,
        APELLIDOS: u.apellidos,
        DNI: u.dni,
        EMAIL: u.email,
        TELEFONO: u.telefono,
        USERNAME: u.username
      };
      if (includePassword) {
        base.PASSWORD = u.password || 'password123';
      }
      return {
        ...base,
        ROL: u.rol,
        ESTADO: u.estado,
        SUPERVISOR_RESPONSABLE: u.supervisor_responsable || '-',
        LINEAS_ASIGNADAS: Array.isArray(u.lineas_asignadas) ? u.lineas_asignadas.join(', ') : '*',
        FECHA_CREACION: u.fecha_creacion,
        ULTIMA_ACTUALIZACION: u.ultima_actualizacion || '-',
        ...this.getAuditColumns(u)
      };
    });
  }

  static mapContratistasRows(contratistasList: Contratista[]) {
    return contratistasList.map(c => ({
      ID_CONTRATISTA: c.id_contratista,
      RAZON_SOCIAL: c.razon_social,
      RUC: c.ruc,
      REPRESENTANTE_LEGAL: c.representante_legal,
      TELEFONO: c.telefono,
      EMAIL: c.email,
      ESPECIALIDAD: c.especialidad,
      ESTADO: c.estado,
      ACTIVIDADES_ASIGNADAS: (c.actividades_asignadas || []).join(', '),
      LINEAS_ASIGNADAS: (c.lineas_asignadas || []).join(', '),
      FECHA_REGISTRO: c.fecha_registro,
      ...this.getAuditColumns(c)
    }));
  }

  static mapAuditoriaRows(auditList: AuditoriaRegistro[]) {
    return auditList.map(a => ({
      ID_AUDITORIA: a.id_auditoria,
      FECHA: a.fecha,
      HORA: a.hora,
      USUARIO: a.usuario,
      ROL: a.rol,
      ACCION: a.accion,
      MODULO: a.modulo,
      ID_REGISTRO: a.id_registro,
      COD_LINEA: a.cod_linea,
      ESTRUCTURA: a.estructura,
      VALORES_NUEVOS: a.valores_nuevos,
      VALORES_ANTERIORES: a.valores_anteriores,
      ORIGEN: a.origen,
      RESULTADO: a.resultado,
      SYNC_ID: a.sync_id,
      USUARIO_REGISTRO: a.usuario_registro || a.usuario,
      FECHA_HORA_MOVIMIENTO: formatAuditDateTime(a.fecha_hora_movimiento || `${a.fecha} ${a.hora}`),
      ESTADO_REGISTRO: a.estado_registro || 'Activo'
    }));
  }

  // Standard downloads
  static exportLineas(lineas: LineaSubtransmision[], filename = 'Registro_Lineas.xlsx') {
    this.downloadExcelFile(this.mapLineasRows(lineas), filename, 'Lineas_Subtransmision');
  }

  static exportEstructuras(estructuras: Estructura[], filename = 'Planilla_Estructuras.xlsx') {
    this.downloadExcelFile(this.mapEstructurasRows(estructuras), filename, 'Planilla_Estructuras');
  }

  static exportDeficiencias(deficiencias: Deficiencia[], filename = 'Inspeccion_Deficiencias.xlsx') {
    this.downloadExcelFile(this.mapDeficienciasRows(deficiencias), filename, 'Deficiencias_Tecnicas');
  }

  static exportPuestaTierra(patList: PuestaTierra[], filename = 'Mediciones_Puesta_a_Tierra.xlsx') {
    this.downloadExcelFile(this.mapPuestaTierraRows(patList), filename, 'Puesta_a_Tierra');
  }

  static exportEfectoCorona(coronaList: EfectoCorona[], filename = 'Mediciones_Efecto_Corona_UV.xlsx') {
    this.downloadExcelFile(this.mapEfectoCoronaRows(coronaList), filename, 'Efecto_Corona');
  }

  static exportCorona(coronaList: EfectoCorona[], filename = 'Mediciones_Efecto_Corona_UV.xlsx') {
    this.exportEfectoCorona(coronaList, filename);
  }

  static exportTermografia(termografiaList: Termografia[], filename = 'Inspecciones_Termograficas.xlsx') {
    this.downloadExcelFile(this.mapTermografiaRows(termografiaList), filename, 'Termografia');
  }

  static exportPodas(podasList: Poda[], filename = 'Control_Podas_Franja_Servidumbre.xlsx') {
    this.downloadExcelFile(this.mapPodasRows(podasList), filename, 'Control_Podas');
  }

  static exportMantenimiento(mantList: Mantenimiento[], filename = 'Mantenimiento_Subtransmision.xlsx') {
    this.downloadExcelFile(this.mapMantenimientoRows(mantList), filename, 'Mantenimiento');
  }

  static exportHidrolavado(hidroList: Hidrolavado[], filename = 'Hidrolavado_Aisladores.xlsx') {
    this.downloadExcelFile(this.mapHidrolavadoRows(hidroList), filename, 'Hidrolavado');
  }

  static exportOrdenesMantenimiento(omList: OrdenMantenimiento[], filename = 'Ordenes_Mantenimiento.xlsx') {
    this.downloadExcelFile(this.mapOrdenesMantenimientoRows(omList), filename, 'Ordenes_Mantenimiento');
  }

  static exportDMS(
    dmsList: DMSItem[],
    _levantamientos?: LevantamientoDMS[],
    _inspecciones?: InspeccionCierreDMS[],
    filename = 'Infracciones_DMS.xlsx'
  ) {
    this.downloadExcelFile(this.mapDMSRows(dmsList), filename, 'Gestion_DMS');
  }

  static exportLevantamientosDMS(list: LevantamientoDMS[], filename = 'Levantamientos_DMS.xlsx') {
    this.downloadExcelFile(this.mapLevantamientosDMSRows(list), filename, 'Levantamientos_DMS');
  }

  static exportInspeccionesDMS(list: InspeccionCierreDMS[], filename = 'Inspecciones_Cierre_DMS.xlsx') {
    this.downloadExcelFile(this.mapInspeccionesDMSRows(list), filename, 'Inspecciones_DMS');
  }

  // Note: Local web export intentionally omits plaintext passwords unless explicitly requested
  static exportUsuarios(usuariosList: Usuario[], filename = 'USUARIOS.xlsx', includePassword = false) {
    this.downloadExcelFile(this.mapUsuariosRows(usuariosList, includePassword), filename, 'Usuarios_Contrasenas');
  }

  static exportAuditoria(auditList: AuditoriaRegistro[], filename = 'Historial_Modificaciones.xlsx') {
    this.downloadExcelFile(this.mapAuditoriaRows(auditList), filename, 'Historial_Modificaciones');
  }

  static exportContratistas(contratistasList: Contratista[], filename = 'Directorio_Contratistas.xlsx') {
    this.downloadExcelFile(this.mapContratistasRows(contratistasList), filename, 'Contratistas');
  }

  // Generic builders for Google Drive & Google Sheets synchronization across all 16 modules
  static getModuleTableRows(moduleKey: DriveModuleKey, items: any[], options?: { includePassword?: boolean }): Record<string, any>[] {
    switch (moduleKey) {
      case 'LINEAS': return this.mapLineasRows(items);
      case 'ESTRUCTURAS': return this.mapEstructurasRows(items);
      case 'DEFICIENCIAS': return this.mapDeficienciasRows(items);
      case 'PUESTA_A_TIERRA': return this.mapPuestaTierraRows(items);
      case 'EFECTO_CORONA': return this.mapEfectoCoronaRows(items);
      case 'TERMOGRAFIA': return this.mapTermografiaRows(items);
      case 'CONTROL_PODAS': return this.mapPodasRows(items);
      case 'MANTENIMIENTO': return this.mapMantenimientoRows(items);
      case 'HIDROLAVADO': return this.mapHidrolavadoRows(items);
      case 'ORDENES_OM': return this.mapOrdenesMantenimientoRows(items);
      case 'DMS': return this.mapDMSRows(items);
      case 'LEVANTAMIENTOS_DMS': return this.mapLevantamientosDMSRows(items);
      case 'INSPECCIONES_DMS': return this.mapInspeccionesDMSRows(items);
      case 'CONTRATISTAS': return this.mapContratistasRows(items);
      case 'AUDITORIA_SISTEMA': return this.mapAuditoriaRows(items);
      case 'USUARIOS': return this.mapUsuariosRows(items, Boolean(options?.includePassword));
    }
  }

  static buildModuleWorkbookArray(moduleKey: DriveModuleKey, items: any[], options?: { includePassword?: boolean }): Uint8Array {
    const meta = DRIVE_MODULE_META[moduleKey];
    const rows = this.getModuleTableRows(moduleKey, items, options);
    const wb = this.createWorkbookFromRows(rows, meta.sheetName);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(buf);
  }

  static buildModuleValuesMatrix(moduleKey: DriveModuleKey, items: any[], options?: { includePassword?: boolean }): any[][] {
    const rows = this.getModuleTableRows(moduleKey, items, options);
    if (rows.length === 0) {
      return [['ESTADO'], ['Sin registros']];
    }
    const headers = Object.keys(rows[0]);
    const body = rows.map(r => headers.map(h => r[h] ?? ''));
    return [headers, ...body];
  }

  static downloadModuleTemplate(moduleKey: DriveModuleKey, sampleItems: any[] = []) {
    const meta = DRIVE_MODULE_META[moduleKey];
    const sample = sampleItems.length > 0 ? sampleItems.slice(0, 3) : [];
    if (sample.length > 0) {
      const rows = this.getModuleTableRows(moduleKey, sample, { includePassword: false });
      this.downloadExcelFile(rows, `Plantilla_${meta.fileName}`, meta.sheetName);
      return;
    }
    const fallbackRow: Record<string, any> = { COD_LINEA: 'L-6657C', POSTE_N: '1', OBSERVACIONES: 'Ejemplo de carga masiva' };
    this.downloadExcelFile([fallbackRow], `Plantilla_${meta.fileName}`, meta.sheetName);
  }

  // Parse uploaded Excel/CSV rows into normalized module items
  static parseModuleImportRows(moduleKey: DriveModuleKey, rawRows: Record<string, any>[]): any[] {
    const today = new Date().toISOString().split('T')[0];
    return rawRows
      .filter(r => Object.values(r).some(v => String(v ?? '').trim() !== ''))
      .map((row, index) => {
        const suffix = `${Date.now().toString(36).slice(-4).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
        switch (moduleKey) {
          case 'LINEAS':
            return {
              id_linea: pickCol(row, 'ID_LINEA', 'ID') || `LIN-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA', 'CODIGO') || `L-IMP-${index + 1}`).toUpperCase(),
              nombre: pickCol(row, 'NOMBRE', 'DESCRIPCION') || 'Línea Importada',
              tipo_sistema: pickCol(row, 'TIPO_SISTEMA', 'SISTEMA') || 'I',
              tension_nom: pickCol(row, 'TENSION_NOM', 'TENSION', 'KV') || '60',
              nodo_salida: pickCol(row, 'NODO_SALIDA') || '-',
              nodo_llegada: pickCol(row, 'NODO_LLEGADA') || '-',
              celda_salida: pickCol(row, 'CELDA_SALIDA') || '-',
              celda_llegada: pickCol(row, 'CELDA_LLEGADA') || '-',
              estado: (pickCol(row, 'ESTADO') as any) || 'Activo',
              fecha_registro: pickCol(row, 'FECHA_REGISTRO') || today,
              ultima_sincronizacion: today
            };
          case 'ESTRUCTURAS':
            return {
              id_poste: pickCol(row, 'ID_POSTE', 'ID') || `POS-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE', 'ESTRUCTURA') || String(index + 1),
              tipo_armado: pickCol(row, 'TIPO_ARMADO', 'ARMADO') || 'A',
              poste_cantidad: pickCol(row, 'POSTE_CANTIDAD', 'CANT_POSTE') || '1',
              poste_material: pickCol(row, 'POSTE_MATERIAL', 'MATERIAL') || 'CAC',
              cruceta_material: pickCol(row, 'CRUCETA_MATERIAL') || 'ACERO',
              mensula_material: pickCol(row, 'MENSULA_MATERIAL') || '-',
              riostra_o_amarre_material: pickCol(row, 'RIOSTRA_O_AMARRE_MATERIAL') || '-',
              aislador_material: pickCol(row, 'AISLADOR_MATERIAL') || 'POLIMERICO',
              aislador_cant: pickCol(row, 'AISLADOR_CANT') || '3',
              aislador_tipo: pickCol(row, 'AISLADOR_TIPO') || 'SUSPENSION',
              conductor_material: pickCol(row, 'CONDUCTOR_MATERIAL') || 'AAAC',
              conductor_calibre: pickCol(row, 'CONDUCTOR_CALIBRE') || '240',
              conductor_n_fases: pickCol(row, 'CONDUCTOR_N_FASES') || '3',
              estado: (pickCol(row, 'ESTADO') as any) || 'Operativo',
              observaciones: pickCol(row, 'OBSERVACIONES') || ''
            };
          case 'DEFICIENCIAS': {
            const prioRaw = pickCol(row, 'PRIORIDAD').toUpperCase();
            return {
              id_deficiencia: pickCol(row, 'ID_DEFICIENCIA', 'ID') || `DEF-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              fecha_inspeccion: pickCol(row, 'FECHA_INSPECCION', 'FECHA') || today,
              tipo_deficiencia: pickCol(row, 'TIPO_DEFICIENCIA', 'TIPO') || 'Deficiencia general de inspección',
              descripcion: pickCol(row, 'DESCRIPCION') || 'Importado desde Excel',
              prioridad: prioRaw.includes('NO') ? 'NO PRIORITARIO' : (prioRaw ? 'PRIORITARIO' : 'NO PRIORITARIO'),
              numero_om: pickCol(row, 'NUMERO_OM', 'OM') || '',
              estado: (pickCol(row, 'ESTADO') as any) || 'Registrada',
              usuario_responsable: pickCol(row, 'USUARIO_RESPONSABLE', 'RESPONSABLE') || 'Supervisor Campo',
              evidencia_fotografica: pickCol(row, 'EVIDENCIA_URL', 'EVIDENCIA') || 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link',
              observaciones: pickCol(row, 'OBSERVACIONES') || ''
            };
          }
          case 'PUESTA_A_TIERRA': {
            const resVal = numCol(row, 4.5, 'VALOR_RESISTENCIA_OHMIOS', 'VALOR_RESISTENCIA_PAT', 'RESISTENCIA', 'OHM');
            return {
              id_pat: pickCol(row, 'ID_PAT', 'ID') || `PAT-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              fecha_medicion: pickCol(row, 'FECHA_MEDICION', 'FECHA') || today,
              valor_resistencia_pat: resVal,
              prioridad: resVal >= 5.0 ? 'PRIORITARIO' : 'NO PRIORITARIO',
              alerta_deficiencia: resVal >= 5.0,
              tipo_estructura: pickCol(row, 'TIPO_ESTRUCTURA') || 'Alineamiento',
              material_estructura: pickCol(row, 'MATERIAL_ESTRUCTURA') || 'CAC',
              utm_este: pickCol(row, 'UTM_ESTE') || '-',
              utm_norte: pickCol(row, 'UTM_NORTE') || '-',
              responsable: pickCol(row, 'RESPONSABLE') || 'Cuadrilla PAT',
              comentario: pickCol(row, 'COMENTARIO', 'OBSERVACIONES') || '',
              evidencia_url: pickCol(row, 'EVIDENCIA_URL') || ''
            };
          }
          case 'EFECTO_CORONA': {
            const r = numCol(row, 0, 'FASE_R_CONTEO');
            const s = numCol(row, 0, 'FASE_S_CONTEO');
            const t = numCol(row, 0, 'FASE_T_CONTEO');
            return {
              id_corona: pickCol(row, 'ID_CORONA', 'ID') || `COR-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              tipo_armado: pickCol(row, 'TIPO_ARMADO') || 'A',
              tipo_aislador: pickCol(row, 'TIPO_AISLADOR') || 'Polimérico',
              nivel_tension_kv: pickCol(row, 'NIVEL_TENSION_KV', 'TENSION') || '60',
              temp_c: pickCol(row, 'TEMP_C') || '26',
              humedad_pct: pickCol(row, 'HUMEDAD_PCT') || '68',
              fase_r_ganancia: pickCol(row, 'FASE_R_GANANCIA') || '120',
              fase_r_conteo: r,
              fase_s_ganancia: pickCol(row, 'FASE_S_GANANCIA') || '120',
              fase_s_conteo: s,
              fase_t_ganancia: pickCol(row, 'FASE_T_GANANCIA') || '120',
              fase_t_conteo: t,
              fecha: pickCol(row, 'FECHA') || today,
              hora: pickCol(row, 'HORA') || '10:00',
              prioridad: Math.max(r, s, t) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO',
              descripcion_detallada: pickCol(row, 'DESCRIPCION_DETALLADA') || '',
              causa_probable: pickCol(row, 'CAUSA_PROBABLE') || '',
              accion_recomendada: pickCol(row, 'ACCION_RECOMENDADA') || '',
              comentarios: pickCol(row, 'COMENTARIOS', 'OBSERVACIONES') || '',
              situaciones: pickCol(row, 'SITUACIONES') ? pickCol(row, 'SITUACIONES').split(',').map(x => x.trim()).filter(Boolean) : [],
              evidencia_url: pickCol(row, 'EVIDENCIA_URL') || '',
              inspector: pickCol(row, 'INSPECTOR') || 'Inspector UV'
            };
          }
          case 'TERMOGRAFIA': {
            const ta = numCol(row, 28, 'TEMP_AMBIENTE_C', 'TEMP_AMBIENTE');
            const tm = numCol(row, 35, 'TEMP_MAX_COMPONENTE_C', 'TEMP_MAX_COMPONENTE');
            const dt = numCol(row, Number((tm - ta).toFixed(1)), 'DELTA_T_C', 'DELTA_T');
            return {
              id_termografia: pickCol(row, 'ID_TERMOGRAFIA', 'ID') || `TRM-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              tipo_armado: pickCol(row, 'TIPO_ARMADO') || 'A',
              conductor_calibre: pickCol(row, 'CONDUCTOR_CALIBRE') || 'AAAC 240',
              conductor_n_fases: pickCol(row, 'CONDUCTOR_N_FASES') || '3',
              nivel_tension: pickCol(row, 'NIVEL_TENSION') || '60 kV',
              tipo_zona: pickCol(row, 'TIPO_ZONA') || 'Rural',
              temp_ambiente: ta,
              temp_max_componente: tm,
              emisividad: numCol(row, 0.95, 'EMISIVIDAD'),
              delta_t: dt,
              hora: pickCol(row, 'HORA') || '11:00',
              fecha: pickCol(row, 'FECHA') || today,
              componente_falla: pickCol(row, 'COMPONENTE_FALLA') || 'Grapa de suspensión',
              comentario: pickCol(row, 'COMENTARIO', 'OBSERVACIONES') || '',
              criticidad: (pickCol(row, 'CRITICIDAD') as any) || (dt >= 15 ? 'Alerta' : 'Normal'),
              prioridad: dt >= 15 ? 'PRIORITARIO' : 'NO PRIORITARIO',
              evidencia_url: pickCol(row, 'EVIDENCIA_URL') || '',
              inspector: pickCol(row, 'INSPECTOR') || 'Inspector Termográfico'
            };
          }
          case 'CONTROL_PODAS': {
            const a = numCol(row, 0, 'ALGARROBO');
            const p = numCol(row, 0, 'PALMERA');
            const o = numCol(row, 0, 'ORNAMENTAL');
            const t = numCol(row, 0, 'TAMARINDO');
            const po = numCol(row, 0, 'PONCEANA');
            const ot = numCol(row, 0, 'OTROS');
            return {
              id_poda: pickCol(row, 'ID_PODA', 'ID') || `POD-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              tipo_armado: pickCol(row, 'TIPO_ARMADO') || 'A',
              tipo_aislador: pickCol(row, 'TIPO_AISLADOR') || 'Polimérico',
              nivel_tension_kv: pickCol(row, 'NIVEL_TENSION_KV') || '60',
              fecha_ejecucion: pickCol(row, 'FECHA_EJECUCION', 'FECHA') || today,
              ubicacion_referencia: pickCol(row, 'UBICACION_REFERENCIA') || '-',
              punto_inicial: pickCol(row, 'PUNTO_INICIAL') || '-',
              punto_final: pickCol(row, 'PUNTO_FINAL') || '-',
              algarrobo: a,
              palmera: p,
              ornamental: o,
              tamarindo: t,
              ponceana: po,
              otros: ot,
              total_arboles: numCol(row, a + p + o + t + po + ot, 'TOTAL_ARBOLES'),
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              prioridad: pickCol(row, 'PRIORIDAD').toUpperCase().includes('NO') ? 'NO PRIORITARIO' : (pickCol(row, 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'),
              fotografias: [],
              contratista_responsable: pickCol(row, 'CONTRATISTA_RESPONSABLE', 'CONTRATISTA') || 'Consorcio Eléctrico del Norte S.A.C.',
              estado: (pickCol(row, 'ESTADO') as any) || 'Completada'
            };
          }
          case 'MANTENIMIENTO':
            return {
              id_mantenimiento: pickCol(row, 'ID_MANTENIMIENTO', 'ID') || `MNT-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              fecha_ejecucion: pickCol(row, 'FECHA_EJECUCION', 'FECHA') || today,
              tipo_mantenimiento: (pickCol(row, 'TIPO_MANTENIMIENTO') as any) || 'Preventivo',
              actividad_realizada: pickCol(row, 'ACTIVIDAD_REALIZADA', 'ACTIVIDAD') || 'Mantenimiento programado',
              orden_mantenimiento: pickCol(row, 'ORDEN_MANTENIMIENTO', 'OM') || '',
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              prioridad: pickCol(row, 'PRIORIDAD').toUpperCase().includes('NO') ? 'NO PRIORITARIO' : (pickCol(row, 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'),
              fotografias: [],
              contratista_responsable: pickCol(row, 'CONTRATISTA_RESPONSABLE', 'CONTRATISTA') || 'Consorcio Eléctrico del Norte S.A.C.',
              estado: (pickCol(row, 'ESTADO') as any) || 'Programado',
              altera_estructuras: pickCol(row, 'ALTERA_ESTRUCTURAS').toUpperCase() === 'SI'
            };
          case 'HIDROLAVADO':
            return {
              id_hidrolavado: pickCol(row, 'ID_HIDROLAVADO', 'ID') || `HID-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              tipo_armado: pickCol(row, 'TIPO_ARMADO') || 'A',
              tipo_aislador: pickCol(row, 'TIPO_AISLADOR') || 'Polimérico',
              nivel_tension_kv: pickCol(row, 'NIVEL_TENSION_KV', 'TENSION') || '60',
              fecha_ejecucion: pickCol(row, 'FECHA_EJECUCION', 'FECHA') || today,
              metodo_lavado: (pickCol(row, 'METODO_LAVADO') as any) || 'En Caliente (Línea Energizada)',
              agua_utilizada_litros: numCol(row, 180, 'AGUA_UTILIZADA_LITROS', 'LITROS'),
              conductividad_agua_us: numCol(row, 20, 'CONDUCTIVIDAD_AGUA_US', 'CONDUCTIVIDAD'),
              presion_psi: numCol(row, 600, 'PRESION_PSI', 'PRESION'),
              nivel_contaminacion: (pickCol(row, 'NIVEL_CONTAMINACION') as any) || 'Alto',
              prioridad: pickCol(row, 'PRIORIDAD').toUpperCase().includes('NO') ? 'NO PRIORITARIO' : (pickCol(row, 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'),
              estado: (pickCol(row, 'ESTADO') as any) || 'Completado',
              contratista_responsable: pickCol(row, 'CONTRATISTA_RESPONSABLE', 'CONTRATISTA') || 'Consorcio Eléctrico del Norte S.A.C.',
              orden_mantenimiento: pickCol(row, 'ORDEN_MANTENIMIENTO', 'OM') || '',
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              fotografias: []
            };
          case 'ORDENES_OM':
            return {
              id_om: pickCol(row, 'ID_OM', 'ID') || `OM-ID-${suffix}`,
              numero_om: pickCol(row, 'NUMERO_OM', 'OM') || `OM-${suffix}`,
              fecha_inicio: pickCol(row, 'FECHA_INICIO') || today,
              fecha_ejecucion: pickCol(row, 'FECHA_EJECUCION') || today,
              estado: (pickCol(row, 'ESTADO') as any) || 'Por subsanar',
              tipo_actividad: (pickCol(row, 'TIPO_ACTIVIDAD') as any) || 'Deficiencias Técnicas',
              registros_asociados: [],
              responsable: pickCol(row, 'RESPONSABLE') || 'Consorcio Eléctrico del Norte S.A.C.',
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              fecha_registro: today,
              prioridad: pickCol(row, 'PRIORIDAD').toUpperCase().includes('NO') ? 'NO PRIORITARIO' : (pickCol(row, 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO')
            };
          case 'DMS':
            return {
              id_dms: pickCol(row, 'ID_DMS', 'ID') || `DMS-${suffix}`,
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              codigo_dms: pickCol(row, 'CODIGO_DMS', 'CODIGO') || `OSINERGMIN-${suffix}`,
              descripcion: pickCol(row, 'DESCRIPCION') || 'Incumplimiento DMS importado',
              fecha_identificacion: pickCol(row, 'FECHA_IDENTIFICACION', 'FECHA') || today,
              prioridad: pickCol(row, 'PRIORIDAD').toUpperCase().includes('NO') ? 'NO PRIORITARIO' : 'PRIORITARIO',
              fuente: pickCol(row, 'FUENTE') || 'OSINERGMIN',
              orden_servicio: pickCol(row, 'ORDEN_SERVICIO', 'OS') || '-',
              estado: (pickCol(row, 'ESTADO') as any) || 'Pendiente',
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              evidencias: []
            };
          case 'LEVANTAMIENTOS_DMS':
            return {
              id_levantamiento: pickCol(row, 'ID_LEVANTAMIENTO', 'ID') || `LEV-${suffix}`,
              id_dms: pickCol(row, 'ID_DMS') || 'DMS-IMPORT',
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              fecha_ejecucion: pickCol(row, 'FECHA_EJECUCION', 'FECHA') || today,
              descripcion_trabajo: pickCol(row, 'DESCRIPCION_TRABAJO', 'DESCRIPCION') || 'Levantamiento DMS ejecutado',
              orden_servicio: pickCol(row, 'ORDEN_SERVICIO') || '-',
              fotografias: [],
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              contratista_responsable: pickCol(row, 'CONTRATISTA_RESPONSABLE', 'CONTRATISTA') || 'Consorcio Eléctrico del Norte S.A.C.',
              estado: (pickCol(row, 'ESTADO') as any) || 'Registrado'
            };
          case 'INSPECCIONES_DMS':
            return {
              id_inspeccion_cierre: pickCol(row, 'ID_INSPECCION_CIERRE', 'ID') || `INSP-${suffix}`,
              id_dms: pickCol(row, 'ID_DMS') || 'DMS-IMPORT',
              id_levantamiento: pickCol(row, 'ID_LEVANTAMIENTO') || 'LEV-IMPORT',
              cod_linea: (pickCol(row, 'COD_LINEA', 'LINEA') || 'L-6657C').toUpperCase(),
              poste_n: pickCol(row, 'POSTE_N', 'POSTE') || '1',
              fecha_inspeccion: pickCol(row, 'FECHA_INSPECCION', 'FECHA') || today,
              inspector: pickCol(row, 'INSPECTOR') || 'Supervisor Operaciones',
              resultado: (pickCol(row, 'RESULTADO') as any) || 'Levantamiento conforme',
              observaciones: pickCol(row, 'OBSERVACIONES') || '',
              evidencias_fotograficas: [],
              estado_final: (pickCol(row, 'ESTADO_FINAL') as any) || 'Cerrada'
            };
          case 'CONTRATISTAS':
            return {
              id_contratista: pickCol(row, 'ID_CONTRATISTA', 'ID') || `CTR-${suffix}`,
              razon_social: pickCol(row, 'RAZON_SOCIAL', 'NOMBRE') || `Contratista ${index + 1}`,
              ruc: pickCol(row, 'RUC') || '20500000000',
              representante_legal: pickCol(row, 'REPRESENTANTE_LEGAL') || '-',
              telefono: pickCol(row, 'TELEFONO') || '-',
              email: pickCol(row, 'EMAIL') || '',
              especialidad: pickCol(row, 'ESPECIALIDAD') || 'Mantenimiento de Líneas',
              estado: (pickCol(row, 'ESTADO') as any) || 'Activo',
              actividades_asignadas: pickCol(row, 'ACTIVIDADES_ASIGNADAS') ? pickCol(row, 'ACTIVIDADES_ASIGNADAS').split(',').map(s => s.trim()).filter(Boolean) : ['deficiencias', 'mantenimiento'],
              lineas_asignadas: pickCol(row, 'LINEAS_ASIGNADAS') ? pickCol(row, 'LINEAS_ASIGNADAS').split(',').map(s => s.trim()).filter(Boolean) : ['*'],
              fecha_registro: pickCol(row, 'FECHA_REGISTRO') || today
            };
          case 'AUDITORIA_SISTEMA':
            return {
              id_auditoria: pickCol(row, 'ID_AUDITORIA', 'ID') || `AUD-${suffix}`,
              usuario: pickCol(row, 'USUARIO') || 'Importación Excel',
              rol: pickCol(row, 'ROL') || 'Administrador',
              fecha: pickCol(row, 'FECHA') || today,
              hora: pickCol(row, 'HORA') || '12:00:00',
              accion: (pickCol(row, 'ACCION') as any) || 'IMPORTACION',
              modulo: pickCol(row, 'MODULO') || 'AUDITORIA',
              id_registro: pickCol(row, 'ID_REGISTRO') || '-',
              cod_linea: pickCol(row, 'COD_LINEA') || '-',
              estructura: pickCol(row, 'ESTRUCTURA') || '-',
              valores_anteriores: pickCol(row, 'VALORES_ANTERIORES') || '-',
              valores_nuevos: pickCol(row, 'VALORES_NUEVOS') || 'Registro importado desde Excel',
              origen: 'Importación Excel',
              resultado: (pickCol(row, 'RESULTADO') as any) || 'Exitoso',
              sync_id: pickCol(row, 'SYNC_ID') || `IMP-${suffix}`
            };
          case 'USUARIOS': {
            const username = (pickCol(row, 'USERNAME', 'USUARIO') || `user_${suffix.toLowerCase()}`).toLowerCase();
            const lineasRaw = pickCol(row, 'LINEAS_ASIGNADAS') || '*';
            const passVal = pickCol(row, 'PASSWORD', 'CONTRASENA', 'CONTRASEÑA', 'CLAVE');
            return {
              id_usuario: pickCol(row, 'ID_USUARIO', 'ID') || `USR-${suffix}`,
              nombres: pickCol(row, 'NOMBRES') || username,
              apellidos: pickCol(row, 'APELLIDOS') || '',
              dni: pickCol(row, 'DNI', 'DOCUMENTO') || '',
              email: pickCol(row, 'EMAIL', 'CORREO') || `${username}@empresa.com`,
              telefono: pickCol(row, 'TELEFONO') || '',
              username,
              password: passVal || 'password123',
              rol: (pickCol(row, 'ROL') as any) || 'Contratista',
              estado: (pickCol(row, 'ESTADO') as any) || 'Activo',
              supervisor_responsable: pickCol(row, 'SUPERVISOR_RESPONSABLE') || '',
              lineas_asignadas: lineasRaw === '*' ? ['*'] : lineasRaw.split(/[,;]+/).map(s => s.trim()).filter(Boolean),
              fecha_creacion: pickCol(row, 'FECHA_CREACION') || today
            };
          }
        }
      });
  }

  // Read Excel/CSV file into sheet rows
  static async readExcelFile(file: File): Promise<{ sheetNames: string[]; data: Record<string, any[]> }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const wb = XLSX.read(buffer, { type: 'binary' });
          const result: Record<string, any[]> = {};
          wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          });
          resolve({ sheetNames: wb.SheetNames, data: result });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }
}
