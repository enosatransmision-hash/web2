/**
 * SISTEMA WEB PARA EL REGISTRO Y CONTROL DE ACTIVIDADES EN LÍNEAS DE SUBTRANSMISIÓN
 * Backend en Google Apps Script para sincronización con Google Drive y Google Sheets
 * 
 * Instrucciones de despliegue:
 * 1. Abre Google Drive y crea un nuevo proyecto de Google Apps Script (script.google.com).
 * 2. Copia todo este contenido en el archivo Código.gs.
 * 3. Configura el ID de la hoja de cálculo principal de líneas en CONFIG.SPREADSHEET_ID.
 * 4. Haz clic en "Implementar" > "Nueva implementación".
 * 5. Selecciona tipo "Aplicación web".
 * 6. Ejecutar como: "Yo" (tu cuenta de Google).
 * 7. Quién tiene acceso: "Cualquier usuario" (o usuarios de tu organización).
 * 8. Copia la URL de la aplicación web y pégala en la configuración del sistema web.
 */

var CONFIG = {
  // Hoja oficial de líneas de subtransmisión
  SPREADSHEET_ID: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
  // Hoja oficial de usuarios (USUARIOS.XLSX)
  SPREADSHEET_USUARIOS_ID: '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX',
  // Nombre de la carpeta raíz en Google Drive
  ROOT_FOLDER_NAME: 'SISTEMA_SUBTRANSMISION',
  TIMEZONE: 'America/Lima'
};

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    var response = {};

    if (action === 'ping') {
      response = { status: 'success', message: 'Servicio Apps Script Activo', timestamp: new Date() };
    } else if (action === 'getLineas') {
      response = { status: 'success', data: readSheetData(CONFIG.SPREADSHEET_ID, 'LINEAS') };
    } else if (action === 'getUsuarios') {
      response = { status: 'success', data: readSheetData(CONFIG.SPREADSHEET_USUARIOS_ID) };
    } else if (action === 'getEstructuras') {
      var codLinea = e.parameter.cod_linea || '';
      response = { status: 'success', data: readEstructuras(codLinea) };
    } else if (action === 'getAllData') {
      response = {
        status: 'success',
        lineas: readSheetData(CONFIG.SPREADSHEET_ID, 'LINEAS'),
        usuarios: readSheetData(CONFIG.SPREADSHEET_USUARIOS_ID),
        estructuras: readEstructuras(''),
        timestamp: new Date()
      };
    } else {
      response = { status: 'error', message: 'Acción GET desconocida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result = {};

    switch (action) {
      case 'syncLineas':
        result = syncLineasToSheet(data.lineas, data.usuario);
        break;

      case 'syncUsuarios':
        result = syncUsuariosToSheet(data.usuarios, data.usuario);
        break;

      case 'updateUsuario':
        result = updateSingleUsuarioInSheet(data.usuario);
        break;

      case 'syncEstructuras':
        result = syncEstructurasToSheet(data.estructuras, data.usuario);
        break;

      case 'registrarAuditoria':
        result = registrarAuditoria(data.registro);
        break;

      case 'subirEvidencia':
        result = guardarArchivoDrive(data.cod_linea, data.poste_n, data.tipo_actividad, data.nombre_archivo, data.base64_data);
        break;

      case 'guardarActividad':
        result = guardarRegistroActividad(data.modulo, data.registro, data.usuario);
        break;

      default:
        result = { status: 'error', message: 'Acción POST no reconocida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Lee datos de una hoja y retorna arreglo de objetos
 */
function readSheetData(spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) return [];
  
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = String(values[i][j]);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Sincroniza líneas a la hoja de Google Sheets
 */
function syncLineasToSheet(lineasList, usuario) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheets()[0]; // Primera hoja
  
  var headers = ['ID_LINEA', 'COD_LINEA', 'NOMBRE', 'TIPO_SISTEMA', 'TENSION_NOM', 'NODO_SALIDA', 'NODO_LLEGADA', 'CELDA_SALIDA', 'CELDA_LLEGADA', 'ESTADO'];
  var output = [headers];

  for (var i = 0; i < lineasList.length; i++) {
    var l = lineasList[i];
    output.push([
      l.id_linea || ('LIN-' + (i + 1)),
      String(l.cod_linea),
      l.nombre || '',
      l.tipo_sistema || 'I',
      String(l.tension_nom || '60'),
      l.nodo_salida || '',
      l.nodo_llegada || '',
      l.celda_salida || '',
      l.celda_llegada || '',
      l.estado || 'Activo'
    ]);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, output.length, headers.length).setValues(output);

  registrarAuditoria({
    usuario: usuario || 'Sistema',
    rol: 'Administrador',
    accion: 'SINCRONIZACION',
    modulo: 'LÍNEAS',
    id_registro: 'TODO',
    cod_linea: 'ALL',
    estructura: '-',
    valores_anteriores: 'N/A',
    valores_nuevos: 'Sincronizadas ' + lineasList.length + ' líneas',
    origen: 'Web',
    resultado: 'Exitoso'
  });

  return { status: 'success', total_sincronizados: lineasList.length };
}

/**
 * Guarda evidencia fotográfica en carpetas organizadas en Google Drive
 * Estructura: SISTEMA_SUBTRANSMISION / [LINEA] / [ESTRUCTURA] / [ACTIVIDAD] / archivo.jpg
 */
function guardarArchivoDrive(codLinea, posteN, tipoActividad, nombreArchivo, base64Data) {
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
  var lineFolder = getOrCreateFolder(rootFolder, codLinea || 'GENERAL');
  var structFolder = getOrCreateFolder(lineFolder, 'POSTE_' + (posteN || '0'));
  var actFolder = getOrCreateFolder(structFolder, tipoActividad || 'VARIOS');

  var contentType = 'image/jpeg';
  if (nombreArchivo.toLowerCase().endsWith('.png')) contentType = 'image/png';
  
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, contentType, nombreArchivo);
  var file = actFolder.createFile(blob);

  // Generar enlace seguro para visualización
  var fileId = file.getId();
  var fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';

  return {
    status: 'success',
    file_id: fileId,
    file_url: fileUrl,
    file_name: nombreArchivo
  };
}

/**
 * Registra entradas en la hoja Historial_Modificaciones
 */
function registrarAuditoria(registro) {
  try {
    var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
    var auditFolder = getOrCreateFolder(rootFolder, '11_AUDITORIA');
    var files = auditFolder.getFilesByName('Historial_Modificaciones');
    var ss;
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Historial_Modificaciones');
      DriveApp.getFileById(ss.getId()).moveTo(auditFolder);
      var sheetInit = ss.getSheets()[0];
      sheetInit.setName('Auditoria');
      sheetInit.appendRow([
        'ID_AUDITORIA', 'USUARIO', 'ROL', 'FECHA', 'HORA', 'ACCION',
        'MODULO', 'ID_REGISTRO', 'COD_LINEA', 'ESTRUCTURA',
        'VALORES_ANTERIORES', 'VALORES_NUEVOS', 'ORIGEN', 'RESULTADO'
      ]);
    }

    var sheet = ss.getSheets()[0];
    var now = new Date();
    var fechaStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    var horaStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'HH:mm:ss');

    sheet.appendRow([
      'AUD-' + Utilities.getUuid().substring(0, 8),
      registro.usuario || 'Anónimo',
      registro.rol || 'N/A',
      fechaStr,
      horaStr,
      registro.accion || 'OPERACION',
      registro.modulo || 'GENERAL',
      registro.id_registro || '-',
      registro.cod_linea || '-',
      registro.estructura || '-',
      registro.valores_anteriores || '-',
      registro.valores_nuevos || '-',
      registro.origen || 'Web',
      registro.resultado || 'Exitoso'
    ]);

    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Sincroniza lista completa de usuarios con la hoja USUARIOS.XLSX
 */
function syncUsuariosToSheet(usuariosList, ejecutadoPor) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_USUARIOS_ID);
    var sheet = ss.getSheets()[0];
    
    var headers = [
      'ID', 'NOMBRES', 'APELLIDOS', 'DOCUMENTO', 'EMAIL', 'TELEFONO',
      'USERNAME', 'ROL', 'ESTADO', 'SUPERVISOR_RESPONSABLE',
      'LINEAS_ASIGNADAS', 'FECHA_CREACION', 'ULTIMA_ACTUALIZACION'
    ];
    
    var output = [headers];
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    
    for (var i = 0; i < usuariosList.length; i++) {
      var u = usuariosList[i];
      var lineasStr = Array.isArray(u.lineas_asignadas) ? (u.lineas_asignadas.includes('*') ? '*' : u.lineas_asignadas.join(', ')) : String(u.lineas_asignadas || '*');
      output.push([
        u.id_usuario || ('USR-' + String(i + 1)),
        u.nombres || '',
        u.apellidos || '',
        u.dni || '',
        u.email || '',
        u.telefono || '',
        u.username || '',
        u.rol || 'Contratista',
        u.estado || 'Activo',
        u.supervisor_responsable || '',
        lineasStr,
        u.fecha_creacion || nowStr.split(' ')[0],
        u.ultima_actualizacion || nowStr
      ]);
    }
    
    sheet.clearContents();
    sheet.getRange(1, 1, output.length, headers.length).setValues(output);
    return { status: 'success', message: 'Sincronizados ' + usuariosList.length + ' usuarios en USUARIOS.XLSX' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Actualiza o añade un usuario específico en USUARIOS.XLSX
 */
function updateSingleUsuarioInSheet(usuario) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_USUARIOS_ID);
    var sheet = ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    var lineasStr = Array.isArray(usuario.lineas_asignadas) ? (usuario.lineas_asignadas.includes('*') ? '*' : usuario.lineas_asignadas.join(', ')) : String(usuario.lineas_asignadas || '*');

    var foundRow = -1;
    for (var r = 1; r < values.length; r++) {
      var curUser = String(values[r][6] || '').toLowerCase().trim();
      var curId = String(values[r][0] || '').trim();
      if (curUser === String(usuario.username).toLowerCase().trim() || curId === String(usuario.id_usuario).trim()) {
        foundRow = r + 1; // 1-indexed
        break;
      }
    }

    var rowData = [
      usuario.id_usuario,
      usuario.nombres,
      usuario.apellidos || '',
      usuario.dni || '',
      usuario.email || '',
      usuario.telefono || '',
      usuario.username,
      usuario.rol,
      usuario.estado || 'Activo',
      usuario.supervisor_responsable || '',
      lineasStr,
      usuario.fecha_creacion || nowStr.split(' ')[0],
      nowStr
    ];

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return { status: 'success', message: 'Usuario ' + usuario.username + ' actualizado en USUARIOS.XLSX' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}
