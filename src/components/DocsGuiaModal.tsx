import React, { useState } from 'react';
import {
  FileCode,
  X,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Terminal,
  Cloud,
  Layers,
  FolderTree
} from 'lucide-react';

interface DocsGuiaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsGuiaModal: React.FC<DocsGuiaModalProps> = ({ isOpen, onClose }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'GUIA' | 'SCRIPT' | 'ARQUITECTURA'>('GUIA');

  if (!isOpen) return null;

  const appsScriptCode = `/**
 * SISTEMA WEB PARA EL REGISTRO Y CONTROL DE ACTIVIDADES EN LÍNEAS DE SUBTRANSMISIÓN
 * Backend en Google Apps Script para sincronización con Google Drive y Google Sheets
 */

var CONFIG = {
  SPREADSHEET_ID: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
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

    if (action === 'syncLineas') {
      result = syncLineasToSheet(data.lineas, data.usuario);
    } else if (action === 'subirEvidencia') {
      result = guardarArchivoDrive(data.cod_linea, data.poste_n, data.tipo_actividad, data.nombre_archivo, data.base64_data);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Documentación y Puesta en Marcha (VS Code & Google Cloud)</h2>
              <p className="text-xs text-slate-400">Guía de instalación, configuración de Google Drive / Sheets y despliegue del Apps Script</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation tabs inside modal */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 mb-4">
          <button
            onClick={() => setActiveTab('GUIA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'GUIA' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guía de Puesta en Marcha (22 Pasos)
          </button>
          <button
            onClick={() => setActiveTab('SCRIPT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SCRIPT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>CódigoServidor.gs</span>
          </button>
          <button
            onClick={() => setActiveTab('ARQUITECTURA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ARQUITECTURA' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>Estructura de Carpetas Drive</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 pr-2 text-xs space-y-4 text-slate-300">
          {activeTab === 'GUIA' && (
            <div className="space-y-4">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <Terminal className="h-4 w-4" /> 1. Ejecución en Visual Studio Code
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>Abre la carpeta del proyecto en <strong>Visual Studio Code</strong>.</li>
                  <li>Abre la terminal integrada (<kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Ctrl + `</kbd>).</li>
                  <li>Ejecuta <code className="bg-slate-900 px-1 rounded text-cyan-300">npm install</code> para restaurar dependencias.</li>
                  <li>Ejecuta <code className="bg-slate-900 px-1 rounded text-cyan-300">npm run dev</code> para iniciar el servidor de desarrollo en <code className="text-emerald-400">http://localhost:3000</code>.</li>
                  <li>No se requiere MySQL, XAMPP ni servidores SQL locales. Todos los datos operan sobre Google Sheets y Google Drive.</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <Cloud className="h-4 w-4" /> 2. Conexión con Google Drive y Google Sheets
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    El ID del archivo oficial de líneas configurado por defecto es:
                    <code className="bg-slate-900 text-cyan-300 font-mono px-2 py-0.5 rounded block my-1">
                      1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y
                    </code>
                  </li>
                  <li>Para modificarlo o cambiar la hoja, haz clic en el icono de engranaje (⚙️) en la barra superior.</li>
                  <li>Se admite sincronización bidireccional automática cada 15 minutos o sincronización manual con el botón "Actualizar desde Drive".</li>
                  <li>Para proteger contra sobreescrituras silenciosas, el sistema incluye detector de conflictos con resolución lado a lado.</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <FileCode className="h-4 w-4" /> 3. Despliegue de Google Apps Script (CódigoServidor.gs)
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>Ingresa a <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">script.google.com</a> y crea un nuevo proyecto.</li>
                  <li>Copia el contenido de la pestaña <strong>CódigoServidor.gs</strong>.</li>
                  <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                  <li>Tipo: <em>Aplicación Web</em> | Ejecutar como: <em>Yo</em> | Acceso: <em>Cualquier usuario</em>.</li>
                  <li>Copia la URL generada y pégala en la Configuración de Google Drive del sistema.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'SCRIPT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">Archivo: /apps-script/CódigoServidor.gs</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  {copiedScript ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedScript ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-96">
                {appsScriptCode}
              </pre>
            </div>
          )}

          {activeTab === 'ARQUITECTURA' && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="text-cyan-400 font-bold mb-2">SISTEMA_SUBTRANSMISION/ (Google Drive)</div>
              <div>├── 01_LINEAS/ &rarr; Registro_Lineas.xlsx (ID: 1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y)</div>
              <div>├── 02_ESTRUCTURAS/ &rarr; Registro_Estructuras.xlsx (1087 postes)</div>
              <div>├── 03_USUARIOS/ &rarr; Usuarios.xlsx (Roles RBAC)</div>
              <div>├── 04_DEFICIENCIAS/ &rarr; Registro_Deficiencias.xlsx (28 tipos normalizados)</div>
              <div>├── 05_TERMOGRAFIA/ &rarr; Registro_Termografia.xlsx (Delta T y puntos calientes)</div>
              <div>├── 06_EFECTO_CORONA/ &rarr; Registro_Efecto_Corona.xlsx (222 mediciones UV R, S, T)</div>
              <div>├── 07_PODAS/ &rarr; Registro_Podas.xlsx (Conteo por especie: Algarrobo, Palmera, etc.)</div>
              <div>├── 08_MANTENIMIENTO/ &rarr; Registro_Mantenimiento.xlsx</div>
              <div>├── 09_DMS/ &rarr; Registro_DMS.xlsx, Levantamiento_DMS.xlsx, Inspecciones_Cierre.xlsx</div>
              <div>├── 10_EVIDENCIAS/ &rarr; [LINEA] / [ESTRUCTURA] / [ACTIVIDAD] / fotos</div>
              <div>├── 11_AUDITORIA/ &rarr; Historial_Modificaciones.xlsx (Zona America/Lima)</div>
              <div>└── 12_REPORTES/ &rarr; Informes emitidos y exportados</div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
