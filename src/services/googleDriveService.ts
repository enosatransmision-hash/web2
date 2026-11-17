import * as XLSX from 'xlsx';
import { storageService } from './storageService';
import { ExcelService, DRIVE_MODULE_META } from './excelService';
import {
  getAccessToken,
  clearAccessToken,
  getGoogleSession
} from './googleAuthService';
import { DriveModuleKey, Usuario } from '../types';

const DRIVE_FOLDER_NAME = 'SISTEMA_SUBTRANSMISION';
const ALL_DRIVE_MODULES: DriveModuleKey[] = Object.keys(DRIVE_MODULE_META) as DriveModuleKey[];

export interface DriveSyncResult {
  success: boolean;
  message: string;
  count?: number;
  fileId?: string;
  fileUrl?: string;
  needsAuth?: boolean;
  moduleKey?: DriveModuleKey;
}

export interface DriveSyncAllResult {
  success: boolean;
  message: string;
  syncedCount: number;
  totalModules: number;
  failedModules: DriveModuleKey[];
  needsAuth?: boolean;
  results: DriveSyncResult[];
}

export class GoogleDriveService {
  private static autoSyncTimer: any = null;
  private static moduleTimers = new Map<DriveModuleKey, any>();

  private static async driveFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
    if (res.status === 401) {
      clearAccessToken();
    }
    return res;
  }

  /**
   * Encuentra o crea la carpeta raíz SISTEMA_SUBTRANSMISION en Google Drive
   */
  static async ensureRootFolder(token: string): Promise<{ folderId: string; folderUrl: string }> {
    const config = storageService.getConfigDrive();
    if (config.drive_folder_id && !config.drive_folder_id.startsWith('1A9x_DRIVE_FOLDER')) {
      try {
        const check = await this.driveFetch(
          `https://www.googleapis.com/drive/v3/files/${config.drive_folder_id}?fields=id,name,trashed,webViewLink`,
          token
        );
        if (check.ok) {
          const meta = await check.json();
          if (!meta.trashed) {
            return {
              folderId: meta.id,
              folderUrl: meta.webViewLink || `https://drive.google.com/drive/folders/${meta.id}`
            };
          }
        }
      } catch {
        // search or create below
      }
    }

    const query = encodeURIComponent(
      `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const listRes = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      token
    );
    if (listRes.ok) {
      const listJson = await listRes.json();
      if (listJson.files && listJson.files.length > 0) {
        const folder = listJson.files[0];
        const folderUrl = folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;
        storageService.updateConfigDrive({ drive_folder_id: folder.id, drive_folder_url: folderUrl }, true);
        return { folderId: folder.id, folderUrl };
      }
    }

    const createRes = await this.driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`No se pudo crear la carpeta ${DRIVE_FOLDER_NAME} en Drive: ${errText}`);
    }
    const created = await createRes.json();
    const folderUrl = created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`;
    storageService.updateConfigDrive({ drive_folder_id: created.id, drive_folder_url: folderUrl }, true);
    return { folderId: created.id, folderUrl };
  }

  /**
   * Inspecciona dinámicamente el nombre real de la primera pestaña y escribe la matriz de valores
   */
  private static async writeToNativeGoogleSheet(token: string, spreadsheetId: string, values: any[][]): Promise<string> {
    const metaRes = await this.driveFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetUrl,sheets.properties`,
      token
    );
    if (!metaRes.ok) {
      const err = await metaRes.text();
      throw new Error(`Error leyendo propiedades de Google Sheet (${metaRes.status}): ${err}`);
    }
    const meta = await metaRes.json();
    const sheetTitle = meta?.sheets?.[0]?.properties?.title;
    if (!sheetTitle) {
      throw new Error('La hoja de cálculo no contiene pestañas válidas.');
    }

    const escapedTitle = `'${String(sheetTitle).replace(/'/g, "''")}'`;
    const clearRange = encodeURIComponent(escapedTitle);

    const clearRes = await this.driveFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
      token,
      { method: 'POST' }
    );
    if (!clearRes.ok) {
      const err = await clearRes.text();
      throw new Error(`Error limpiando hoja ${sheetTitle}: ${err}`);
    }

    const updateRange = encodeURIComponent(`${escapedTitle}!A1`);
    const updateRes = await this.driveFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Error escribiendo filas en ${sheetTitle}: ${err}`);
    }

    return meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  /**
   * Sube o actualiza un archivo .xlsx binario directamente en Google Drive mediante multipart upload
   */
  private static async uploadBinaryXlsxToDrive(
    token: string,
    fileId: string,
    fileBytes: Uint8Array,
    fileName: string
  ): Promise<string> {
    const boundary = '---subtransmision_xlsx_boundary_' + Date.now();
    const metadataPart =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name: fileName })}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const closingPart = `\r\n--${boundary}--`;

    const encoder = new TextEncoder();
    const headBytes = encoder.encode(metadataPart);
    const tailBytes = encoder.encode(closingPart);
    const body = new Uint8Array(headBytes.length + fileBytes.length + tailBytes.length);
    body.set(headBytes, 0);
    body.set(fileBytes, headBytes.length);
    body.set(tailBytes, headBytes.length + fileBytes.length);

    const res = await this.driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,webViewLink`,
      token,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error actualizando archivo XLSX en Drive (${res.status}): ${err}`);
    }
    const json = await res.json();
    return json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`;
  }

  /**
   * Busca o crea una Google Spreadsheet por nombre dentro de la carpeta SISTEMA_SUBTRANSMISION
   */
  private static async findOrCreateSpreadsheetInFolder(
    token: string,
    folderId: string,
    title: string,
    sheetTabTitle: string
  ): Promise<{ id: string; url: string }> {
    const escapedName = title.replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name='${escapedName}' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const searchRes = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`,
      token
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      if (searchJson.files && searchJson.files.length > 0) {
        const f = searchJson.files[0];
        return {
          id: f.id,
          url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`
        };
      }
    }

    // Create new Google Spreadsheet
    const createRes = await this.driveFetch('https://sheets.googleapis.com/v4/spreadsheets', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: sheetTabTitle.substring(0, 31) } }]
      })
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`No se pudo crear Google Sheet "${title}": ${err}`);
    }
    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;

    // Move into SISTEMA_SUBTRANSMISION folder
    const fileInfoRes = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents,webViewLink`,
      token
    );
    let previousParents = '';
    let webViewLink = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    if (fileInfoRes.ok) {
      const info = await fileInfoRes.json();
      if (Array.isArray(info.parents) && info.parents.length > 0) {
        previousParents = info.parents.join(',');
      }
      if (info.webViewLink) webViewLink = info.webViewLink;
    }

    const moveUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}${
      previousParents ? `&removeParents=${encodeURIComponent(previousParents)}` : ''
    }&fields=id,webViewLink`;
    await this.driveFetch(moveUrl, token, { method: 'PATCH' });

    return { id: spreadsheetId, url: webViewLink };
  }

  /**
   * Obtiene usuarios completos (incluyendo password para persistencia exclusiva en USUARIOS.XLSX de Drive)
   */
  private static async fetchUsersWithPasswordsForDrive(): Promise<Usuario[]> {
    try {
      const res = await fetch('/api/sync/usuarios/export-drive');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.usuarios)) {
          return json.usuarios;
        }
      }
    } catch {
      // fallback below
    }
    return storageService.getUsuarios(true);
  }

  private static markPendingModule(moduleKey: DriveModuleKey) {
    const config = storageService.getConfigDrive();
    const current = new Set(config.pending_sync_modules || []);
    if (!current.has(moduleKey)) {
      current.add(moduleKey);
      storageService.updateConfigDrive({ pending_sync_modules: Array.from(current) }, true);
    }
  }

  private static clearPendingModule(moduleKey: DriveModuleKey) {
    const config = storageService.getConfigDrive();
    const current = (config.pending_sync_modules || []).filter(m => m !== moduleKey);
    storageService.updateConfigDrive({ pending_sync_modules: current }, true);
  }

  /**
   * Sincroniza un módulo específico (cualquiera de los 16) hacia Google Drive / Google Sheets
   */
  static async syncModuleToDrive(moduleKey: DriveModuleKey): Promise<DriveSyncResult> {
    const token = getAccessToken();
    const meta = DRIVE_MODULE_META[moduleKey];

    if (!token) {
      this.markPendingModule(moduleKey);
      return {
        success: false,
        needsAuth: true,
        moduleKey,
        message: `Conecta tu cuenta de Google Drive para subir ${meta.label}.`
      };
    }

    try {
      const config = storageService.getConfigDrive();
      const { folderId } = await this.ensureRootFolder(token);

      const items =
        moduleKey === 'USUARIOS'
          ? await this.fetchUsersWithPasswordsForDrive()
          : storageService.getModuleData(moduleKey, true);

      let targetId =
        moduleKey === 'LINEAS'
          ? config.sheet_lineas_id
          : moduleKey === 'USUARIOS'
          ? config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX'
          : config.module_file_ids?.[moduleKey];

      let finalUrl = '';
      let usedExistingTarget = false;

      if (targetId) {
        try {
          const metaRes = await this.driveFetch(
            `https://www.googleapis.com/drive/v3/files/${targetId}?fields=id,name,mimeType,trashed,webViewLink`,
            token
          );
          if (metaRes.ok) {
            const fileMeta = await metaRes.json();
            if (!fileMeta.trashed) {
              usedExistingTarget = true;
              if (fileMeta.mimeType === 'application/vnd.google-apps.spreadsheet') {
                const values = ExcelService.buildModuleValuesMatrix(moduleKey, items, {
                  includePassword: moduleKey === 'USUARIOS'
                });
                finalUrl = await this.writeToNativeGoogleSheet(token, targetId, values);
              } else {
                const xlsxBytes = ExcelService.buildModuleWorkbookArray(moduleKey, items, {
                  includePassword: moduleKey === 'USUARIOS'
                });
                finalUrl = await this.uploadBinaryXlsxToDrive(token, targetId, xlsxBytes, fileMeta.name || meta.fileName);
              }
            }
          }
        } catch (err) {
          console.warn(`[GoogleDriveService] Direct target update fallback for ${moduleKey}:`, err);
          usedExistingTarget = false;
        }
      }

      if (!usedExistingTarget) {
        const sheetTitle = moduleKey === 'USUARIOS' ? 'USUARIOS' : meta.fileName.replace(/\.xlsx$/i, '');
        const created = await this.findOrCreateSpreadsheetInFolder(token, folderId, sheetTitle, meta.sheetName);
        targetId = created.id;
        const values = ExcelService.buildModuleValuesMatrix(moduleKey, items, {
          includePassword: moduleKey === 'USUARIOS'
        });
        finalUrl = await this.writeToNativeGoogleSheet(token, targetId, values);
      }

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const nextIds = { ...(config.module_file_ids || {}), [moduleKey]: targetId! };
      const nextUrls = { ...(config.module_file_urls || {}), [moduleKey]: finalUrl };
      const pending = (config.pending_sync_modules || []).filter(m => m !== moduleKey);

      const updates: Record<string, any> = {
        module_file_ids: nextIds,
        module_file_urls: nextUrls,
        pending_sync_modules: pending,
        last_sync_time: nowStr,
        sync_status: 'Conectado',
        error_message: undefined,
        google_account_email: getGoogleSession().email || config.google_account_email
      };

      if (moduleKey === 'LINEAS' && targetId) {
        updates.sheet_lineas_id = targetId;
        updates.sheet_lineas_url = finalUrl;
      }
      if (moduleKey === 'USUARIOS' && targetId) {
        updates.sheet_usuarios_id = targetId;
        updates.sheet_usuarios_url = finalUrl;
      }

      storageService.updateConfigDrive(updates, true);
      storageService.recordAudit({
        accion: 'SINCRONIZACION',
        modulo: meta.label.toUpperCase(),
        id_registro: targetId || 'DRIVE',
        cod_linea: 'TODAS',
        estructura: '-',
        valores_anteriores: 'N/A',
        valores_nuevos: `Sincronizados ${items.length} registros en Google Drive (${meta.fileName})`,
        origen: 'Google Drive',
        resultado: 'Exitoso'
      });

      return {
        success: true,
        moduleKey,
        count: items.length,
        fileId: targetId,
        fileUrl: finalUrl,
        message: `${meta.label}: ${items.length} registros sincronizados en Google Drive.`
      };
    } catch (err: any) {
      this.markPendingModule(moduleKey);
      storageService.updateConfigDrive({ error_message: err?.message || 'Error de sincronización' }, true);
      return {
        success: false,
        moduleKey,
        needsAuth: !getAccessToken(),
        message: `Error al subir ${meta.label} a Drive: ${err?.message || 'Error desconocido'}`
      };
    }
  }

  /**
   * Sincroniza TODOS los 16 módulos completos hacia Google Drive / Sheets
   */
  static async syncAllModulesToDrive(
    onProgress?: (current: number, total: number, moduleKey: DriveModuleKey, label: string) => void
  ): Promise<DriveSyncAllResult> {
    const token = getAccessToken();
    if (!token) {
      return {
        success: false,
        needsAuth: true,
        syncedCount: 0,
        totalModules: ALL_DRIVE_MODULES.length,
        failedModules: ALL_DRIVE_MODULES,
        results: [],
        message: 'Conecta tu cuenta de Google Drive antes de sincronizar todos los módulos.'
      };
    }

    const results: DriveSyncResult[] = [];
    const failedModules: DriveModuleKey[] = [];
    let syncedCount = 0;

    for (let i = 0; i < ALL_DRIVE_MODULES.length; i++) {
      const key = ALL_DRIVE_MODULES[i];
      const meta = DRIVE_MODULE_META[key];
      onProgress?.(i + 1, ALL_DRIVE_MODULES.length, key, meta.label);
      const res = await this.syncModuleToDrive(key);
      results.push(res);
      if (res.success) {
        syncedCount++;
      } else {
        failedModules.push(key);
        if (res.needsAuth) break;
      }
    }

    return {
      success: failedModules.length === 0,
      syncedCount,
      totalModules: ALL_DRIVE_MODULES.length,
      failedModules,
      results,
      needsAuth: !getAccessToken(),
      message:
        failedModules.length === 0
          ? `Sincronización total completada: ${syncedCount}/${ALL_DRIVE_MODULES.length} módulos actualizados en Google Drive.`
          : `Sincronizados ${syncedCount}/${ALL_DRIVE_MODULES.length} módulos. Revisa conexión en: ${failedModules.join(', ')}.`
    };
  }

  /**
   * Dispara sincronización automática en segundo plano cuando hay sesión OAuth activa;
   * si no hay token OAuth, marca el módulo como pendiente de subida.
   */
  static autoSyncModule(moduleKey: DriveModuleKey): void {
    const token = getAccessToken();
    if (!token) {
      this.markPendingModule(moduleKey);
      return;
    }
    const existing = this.moduleTimers.get(moduleKey);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.moduleTimers.delete(moduleKey);
      this.syncModuleToDrive(moduleKey).catch(err => {
        console.warn(`[GoogleDriveService] Auto-sync error for ${moduleKey}:`, err);
      });
    }, 800);
    this.moduleTimers.set(moduleKey, timer);
  }

  /**
   * Prueba de conexión real contra Google Drive API
   */
  static async testConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    const token = getAccessToken();
    const config = storageService.getConfigDrive();

    if (token) {
      try {
        const res = await this.driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)', token);
        const latency = Date.now() - start;
        if (res.ok) {
          const info = await res.json();
          const email = info?.user?.emailAddress || getGoogleSession().email || '';
          const { folderId, folderUrl } = await this.ensureRootFolder(token);
          storageService.updateConfigDrive({
            sync_status: 'Conectado',
            google_account_email: email,
            drive_folder_id: folderId,
            drive_folder_url: folderUrl,
            error_message: undefined,
            last_sync_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
          }, true);
          return {
            success: true,
            message: `Conectado a Google Drive (${email}). Carpeta raíz: ${DRIVE_FOLDER_NAME}`,
            latencyMs: latency
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Error verificando acceso a Google Drive: ${err?.message || 'Error de red'}`,
          latencyMs: Date.now() - start
        };
      }
    }

    if (config.apps_script_url) {
      try {
        const res = await fetch(`${config.apps_script_url}?action=ping`, { method: 'GET', mode: 'cors' });
        const json = await res.json();
        const latency = Date.now() - start;
        if (json.status === 'success') {
          storageService.updateConfigDrive({ sync_status: 'Conectado', error_message: undefined }, true);
          return { success: true, message: `Conexión exitosa con Apps Script (${latency}ms).`, latencyMs: latency };
        }
      } catch (err: any) {
        return { success: false, message: `Error Apps Script: ${err.message}`, latencyMs: Date.now() - start };
      }
    }

    return {
      success: false,
      message: 'Inicia sesión con Google ("Conectar Google Drive") para habilitar lectura/escritura directa en Drive y Sheets.',
      latencyMs: Date.now() - start
    };
  }

  static async pushLineasToDrive(): Promise<{ success: boolean; message: string; count: number }> {
    const res = await this.syncModuleToDrive('LINEAS');
    return {
      success: res.success,
      message: res.message,
      count: res.count || storageService.getLineas().length
    };
  }

  static async pullLineasFromDrive(): Promise<{ success: boolean; message: string; updatedCount: number; conflicts: number }> {
    const token = getAccessToken();
    const config = storageService.getConfigDrive();
    if (!token) {
      return {
        success: false,
        message: 'Conecta tu cuenta de Google Drive para descargar cambios desde Sheets.',
        updatedCount: 0,
        conflicts: 0
      };
    }

    try {
      const sheetId = config.sheet_lineas_id;
      const metaRes = await this.driveFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
        token
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const tabTitle = meta?.sheets?.[0]?.properties?.title;
        if (tabTitle) {
          const range = encodeURIComponent(`'${String(tabTitle).replace(/'/g, "''")}'`);
          const valsRes = await this.driveFetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
            token
          );
          if (valsRes.ok) {
            const valsJson = await valsRes.json();
            const matrix: any[][] = valsJson.values || [];
            if (matrix.length > 1) {
              const headers = matrix[0].map((h: any) => String(h).trim());
              const rowObjs = matrix.slice(1).map(r => {
                const obj: Record<string, any> = {};
                headers.forEach((h, i) => {
                  obj[h] = r[i] ?? '';
                });
                return obj;
              });
              const imported = storageService.batchImportModule('LINEAS', rowObjs, 'merge');
              storageService.updateConfigDrive({
                last_sync_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                sync_status: 'Conectado'
              }, true);
              return {
                success: true,
                message: `Descargadas y actualizadas ${imported.count} líneas desde Google Sheets.`,
                updatedCount: imported.count,
                conflicts: 0
              };
            }
          }
        }
      }
      return {
        success: true,
        message: 'No se encontraron cambios nuevos en la hoja de Líneas.',
        updatedCount: storageService.getLineas().length,
        conflicts: 0
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al descargar líneas desde Drive: ${err?.message || 'Error'}`,
        updatedCount: 0,
        conflicts: 0
      };
    }
  }

  /**
   * Sincroniza Usuarios desde USUARIOS.XLSX (OAuth directo si está conectado, o endpoint servidor fallback)
   */
  static async syncUsuariosFromDrive(sheetId?: string): Promise<{
    success: boolean;
    message: string;
    total: number;
    addedCount: number;
    updatedCount: number;
    usuarios?: Usuario[];
  }> {
    const config = storageService.getConfigDrive();
    const targetSheet = sheetId || config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
    const token = getAccessToken();

    if (token) {
      try {
        const metaRes = await this.driveFetch(
          `https://www.googleapis.com/drive/v3/files/${targetSheet}?fields=id,name,mimeType,webViewLink`,
          token
        );
        if (metaRes.ok) {
          const meta = await metaRes.json();
          let rowObjs: Record<string, any>[] = [];
          if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const sMetaRes = await this.driveFetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${targetSheet}?fields=sheets.properties.title`,
              token
            );
            const sMeta = await sMetaRes.json();
            const tabTitle = sMeta?.sheets?.[0]?.properties?.title;
            if (tabTitle) {
              const range = encodeURIComponent(`'${String(tabTitle).replace(/'/g, "''")}'`);
              const valsRes = await this.driveFetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${targetSheet}/values/${range}`,
                token
              );
              const valsJson = await valsRes.json();
              const matrix: any[][] = valsJson.values || [];
              if (matrix.length > 1) {
                const headers = matrix[0].map((h: any) => String(h).trim());
                rowObjs = matrix.slice(1).map(r => {
                  const obj: Record<string, any> = {};
                  headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
                  return obj;
                });
              }
            }
          } else {
            const fileRes = await this.driveFetch(
              `https://www.googleapis.com/drive/v3/files/${targetSheet}?alt=media`,
              token
            );
            if (fileRes.ok) {
              const ab = await fileRes.arrayBuffer();
              const wb = XLSX.read(ab, { type: 'array' });
              const firstSheet = wb.SheetNames[0];
              if (firstSheet) {
                rowObjs = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' });
              }
            }
          }

          if (rowObjs.length > 0) {
            const imported = storageService.batchImportModule('USUARIOS', rowObjs, 'merge');
            storageService.updateConfigDrive({
              sheet_usuarios_id: targetSheet,
              sheet_usuarios_url: meta.webViewLink || `https://docs.google.com/spreadsheets/d/${targetSheet}/edit?rtpof=true`,
              last_sync_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
              sync_status: 'Conectado'
            }, true);
            return {
              success: true,
              message: `Sincronización directa desde Google Drive (USUARIOS.XLSX): ${imported.count} usuarios procesados.`,
              total: storageService.getUsuarios().length,
              addedCount: imported.count,
              updatedCount: 0,
              usuarios: storageService.getUsuarios()
            };
          }
        }
      } catch (err) {
        console.warn('[GoogleDriveService] Direct Drive user pull fallback to server:', err);
      }
    }

    try {
      const res = await fetch('/api/sync/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: targetSheet })
      });
      const data = await res.json();
      if (data.success && data.usuarios) {
        storageService.setUsuarios(data.usuarios);
        storageService.updateConfigDrive({
          sheet_usuarios_id: targetSheet,
          sheet_usuarios_url: data.sheet_url || `https://docs.google.com/spreadsheets/d/${targetSheet}/edit?rtpof=true`,
          last_sync_time: data.timestamp,
          sync_status: 'Conectado'
        }, true);
        return {
          success: true,
          message: data.message,
          total: data.total,
          addedCount: data.addedCount,
          updatedCount: data.updatedCount,
          usuarios: data.usuarios
        };
      }
      throw new Error(data.message || 'No se pudo sincronizar los usuarios.');
    } catch (err: any) {
      return {
        success: false,
        message: 'Error al sincronizar usuarios con Google Sheets: ' + err.message,
        total: storageService.getUsuarios().length,
        addedCount: 0,
        updatedCount: 0
      };
    }
  }

  /**
   * Registra/actualiza usuario en servidor (con contraseña) y dispara subida automática a Google Drive USUARIOS.XLSX
   */
  static async pushUsuarioToDrive(usuario: Usuario): Promise<{ success: boolean; message: string }> {
    const currentUser = storageService.getCurrentUser();
    try {
      const res = await fetch('/api/sync/usuarios/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, user: currentUser })
      });
      const data = await res.json();
      if (data.success && data.usuarios) {
        storageService.setUsuarios(data.usuarios);
      }

      if (getAccessToken()) {
        const driveRes = await this.syncModuleToDrive('USUARIOS');
        if (driveRes.success) {
          return {
            success: true,
            message: `Usuario @${usuario.username} guardado y sincronizado en Google Drive (USUARIOS.XLSX).`
          };
        }
      }

      this.markPendingModule('USUARIOS');
      return {
        success: true,
        message: `Usuario @${usuario.username} registrado en servidor. Conecta Google Drive para sincronizar USUARIOS.XLSX en la nube.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al sincronizar usuario con Drive: ${err.message}`
      };
    }
  }

  static triggerSampleConflict(codLinea: string) {
    const line = storageService.getLineaByCode(codLinea);
    if (!line) return;
    storageService.addConflicto({
      modulo: 'LÍNEAS',
      id_registro: line.id_linea,
      campo: 'NOMBRE',
      valor_local: line.nombre,
      valor_drive: line.nombre + ' [Editado directamente en Drive por Supervisor Operaciones]'
    });
  }

  static setAutoSync(intervalMinutes: number, callback?: () => void) {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (intervalMinutes > 0) {
      this.autoSyncTimer = setInterval(async () => {
        if (getAccessToken()) {
          await this.syncAllModulesToDrive();
        }
        if (callback) callback();
      }, intervalMinutes * 60 * 1000);
    }
  }
}

// Registrar manejador de auto-sincronización al cargar el servicio (evita dependencia circular en storageService)
storageService.registerDriveAutoSyncHandler((moduleKey) => {
  GoogleDriveService.autoSyncModule(moduleKey);
});
