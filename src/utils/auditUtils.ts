/**
 * SISTEMA WEB PARA EL REGISTRO Y CONTROL DE ACTIVIDADES EN LÍNEAS DE SUBTRANSMISIÓN
 * Utilidades de Auditoría y Trazabilidad (Usuario_Registro, Fecha_Hora_Movimiento, Estado_Registro)
 */

import { Usuario, EstadoRegistro } from '../types';

/**
 * Obtiene la fecha y hora actual en zona horaria America/Lima con formato legible DD/MM/YYYY HH:MM:SS
 */
export function getLimaAuditTimestamp(): string {
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
    const parts = formatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '12';
    const month = parts.find(p => p.type === 'month')?.value || '11';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const min = parts.find(p => p.type === 'minute')?.value || '00';
    const sec = parts.find(p => p.type === 'second')?.value || '00';
    return `${day}/${month}/${year} ${hour}:${min}:${sec}`;
  } catch {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
}

/**
 * Formatea cualquier valor de fecha o timestamp a formato legible estricto DD/MM/YYYY HH:MM:SS
 */
export function formatAuditDateTime(dateInput?: string | Date | number): string {
  if (!dateInput) return getLimaAuditTimestamp();
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // If it is YYYY-MM-DD or similar
      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        const [datePart, timePart] = dateInput.split('T');
        const [y, m, day] = datePart.split('-');
        const t = timePart ? timePart.split('.')[0] : '00:00:00';
        return `${day}/${m}/${y} ${t.length === 5 ? t + ':00' : t}`;
      }
      return String(dateInput);
    }
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
    const parts = formatter.formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '12';
    const month = parts.find(p => p.type === 'month')?.value || '11';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const min = parts.find(p => p.type === 'minute')?.value || '00';
    const sec = parts.find(p => p.type === 'second')?.value || '00';
    return `${day}/${month}/${year} ${hour}:${min}:${sec}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Obtiene el identificador completo del usuario de sesión para la auditoría (username y nombres)
 */
export function getUserAuditIdentifier(user?: Usuario | { username?: string; nombres?: string; apellidos?: string } | null): string {
  if (!user) return 'admin_carlos (Carlos Alberto Mendoza Rivas)';
  const username = user.username || 'usuario';
  const fullName = [user.nombres, user.apellidos].filter(Boolean).join(' ');
  return fullName ? `${username} (${fullName})` : username;
}

/**
 * Aplica campos de auditoría automáticos al CREAR un registro
 */
export function applyAuditOnCreate<T extends Record<string, any>>(item: T, user?: Usuario | null): T {
  const timestamp = getLimaAuditTimestamp();
  const userTag = getUserAuditIdentifier(user);
  const userVal = item.usuario_registro || item.Usuario_Registro || userTag;
  const estadoVal = (item.estado_registro || item.Estado_Registro || 'Activo') as EstadoRegistro;
  (item as any).usuario_registro = userVal;
  (item as any).fecha_hora_movimiento = timestamp;
  (item as any).estado_registro = estadoVal;
  (item as any).Usuario_Registro = userVal;
  (item as any).Fecha_Hora_Movimiento = timestamp;
  (item as any).Estado_Registro = estadoVal;
  return item;
}

/**
 * Aplica campos de auditoría automáticos al EDITAR un registro
 */
export function applyAuditOnUpdate<T extends Record<string, any>>(updates: Partial<T>, user?: Usuario | null): Partial<T> {
  const timestamp = getLimaAuditTimestamp();
  const userTag = getUserAuditIdentifier(user);
  const estadoVal = (updates.estado_registro || updates.Estado_Registro || 'Activo') as EstadoRegistro;
  (updates as any).usuario_registro = userTag;
  (updates as any).fecha_hora_movimiento = timestamp;
  (updates as any).estado_registro = estadoVal;
  (updates as any).Usuario_Registro = userTag;
  (updates as any).Fecha_Hora_Movimiento = timestamp;
  (updates as any).Estado_Registro = estadoVal;
  return updates;
}

/**
 * Aplica campos de auditoría para BORRADO LÓGICO (Soft Delete)
 */
export function applyAuditOnDelete<T extends Record<string, any>>(item: T, user?: Usuario | null): T {
  const timestamp = getLimaAuditTimestamp();
  const userTag = getUserAuditIdentifier(user);
  (item as any).usuario_registro = userTag;
  (item as any).fecha_hora_movimiento = timestamp;
  (item as any).estado_registro = 'Eliminado' as EstadoRegistro;
  (item as any).Usuario_Registro = userTag;
  (item as any).Fecha_Hora_Movimiento = timestamp;
  (item as any).Estado_Registro = 'Eliminado' as EstadoRegistro;
  return item;
}
