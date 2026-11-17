import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  Flame,
  Activity,
  Scissors,
  Wrench,
  ShieldCheck,
  History,
  Layers,
  Calendar
} from 'lucide-react';
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
  PuestaTierra
} from '../types';
import { ExcelService } from '../services/excelService';
import { storageService } from '../services/storageService';
import { getPostesForLine } from '../utils/structureUtils';

interface ReportesViewProps {
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  corona: EfectoCorona[];
  deficiencias: Deficiencia[];
  termografia: Termografia[];
  podas: Poda[];
  mantenimiento: Mantenimiento[];
  hidrolavado?: Hidrolavado[];
  dms: DMSItem[];
  levantamientos: LevantamientoDMS[];
  inspecciones: InspeccionCierreDMS[];
  auditoria: AuditoriaRegistro[];
  puestaTierra?: PuestaTierra[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
}

export const ReportesView: React.FC<ReportesViewProps> = ({
  lineas,
  estructuras,
  corona,
  deficiencias,
  termografia,
  podas,
  mantenimiento,
  hidrolavado = [],
  dms,
  levantamientos,
  inspecciones,
  auditoria,
  puestaTierra,
  currentUser,
  selectedLine,
  onSelectLine
}) => {
  const [selectedReport, setSelectedReport] = useState<string>('DEFICIENCIAS');
  const [filterPrioridad, setFilterPrioridad] = useState<'TODAS' | 'PRIORITARIO' | 'NO PRIORITARIO'>('TODAS');
  const [targetPoste, setTargetPoste] = useState<string>('');

  const availablePostes = useMemo(() => {
    return getPostesForLine(estructuras, selectedLine);
  }, [estructuras, selectedLine]);

  React.useEffect(() => {
    if (selectedLine === 'TODAS') {
      setTargetPoste('');
    } else if (availablePostes.length > 0 && (!targetPoste || !availablePostes.includes(targetPoste))) {
      setTargetPoste(availablePostes[0]);
    } else if (availablePostes.length === 0) {
      setTargetPoste('');
    }
  }, [availablePostes, selectedLine]);

  const patData = puestaTierra || storageService.getPuestaTierra();

  const REPORT_TYPES = [
    { id: 'DEFICIENCIAS', label: '1. Reporte de Deficiencias Técnicas' },
    { id: 'PUESTA_TIERRA', label: '2. Reporte de Medición de Puesta a Tierra (PAT)' },
    { id: 'TERMOGRAFIA', label: '3. Reporte de Termografía Infrarroja' },
    { id: 'CORONA', label: '4. Reporte de Efecto Corona (UV)' },
    { id: 'PODAS', label: '5. Reporte de Podas por Especie' },
    { id: 'MANTENIMIENTO', label: '6. Reporte de Mantenimiento' },
    { id: 'HIDROLAVADO', label: '7. Reporte de Hidrolavado de Aisladores' },
    { id: 'DMS', label: '8. Reporte de Infracciones DMS' },
    { id: 'LEVANTAMIENTOS_DMS', label: '9. Levantamiento de DMS' },
    { id: 'INSPECCIONES_CIERRE', label: '10. Inspecciones y Cierre DMS' },
    { id: 'CONTRATISTAS', label: '11. Actividades por Contratista' },
    { id: 'HISTORIAL_ESTRUCTURA', label: '12. Historial por Estructura' },
    { id: 'ACTIVIDADES_LINEA', label: '13. Actividades por Línea' },
    { id: 'AUDITORIA', label: '14. Historial de Auditoría' },
    { id: 'SINCRONIZACION', label: '15. Reporte de Sincronización' },
    { id: 'EVIDENCIAS_FALTANTES', label: '16. Evidencias Faltantes' }
  ];


  const handlePrint = () => {
    window.print();
  };

  const handleExportSelected = () => {
    switch (selectedReport) {
      case 'DEFICIENCIAS':
        ExcelService.exportDeficiencias(
          deficiencias
            .filter(d => selectedLine === 'TODAS' || d.cod_linea === selectedLine)
            .filter(d => {
              const normPrio = (d.prioridad === 'PRIORITARIO' || (d.prioridad as string) === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO';
              return filterPrioridad === 'TODAS' || normPrio === filterPrioridad;
            })
        );
        break;
      case 'PUESTA_TIERRA':
        ExcelService.exportPuestaTierra(
          patData
            .filter(p => selectedLine === 'TODAS' || p.cod_linea === selectedLine)
            .filter(p => filterPrioridad === 'TODAS' || p.prioridad === filterPrioridad)
        );
        break;
      case 'TERMOGRAFIA':
        ExcelService.exportTermografia(
          termografia.filter(t => selectedLine === 'TODAS' || t.cod_linea === selectedLine)
        );
        break;
      case 'CORONA':
        ExcelService.exportCorona(corona);
        break;
      case 'PODAS':
        ExcelService.exportPodas(podas);
        break;
      case 'MANTENIMIENTO':
        ExcelService.exportMantenimiento(mantenimiento);
        break;
      case 'HIDROLAVADO':
        ExcelService.exportHidrolavado(
          hidrolavado.filter(h => selectedLine === 'TODAS' || h.cod_linea === selectedLine)
        );
        break;
      case 'DMS':
      case 'LEVANTAMIENTOS_DMS':
      case 'INSPECCIONES_CIERRE':
        ExcelService.exportDMS(dms, levantamientos, inspecciones);
        break;
      case 'AUDITORIA':
        ExcelService.exportAuditoria(auditoria);
        break;
      default:
        ExcelService.exportLineas(lineas);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (No print) */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Centro de Reportes Oficiales</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {REPORT_TYPES.length} Tipos de Reportes
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generación de informes para gerencia, supervisión técnica OSINERGMIN y liquidación de contratistas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-cyan-400" />
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar (No print) */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Tipo de Reporte:</span>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-500"
            >
              {REPORT_TYPES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-white border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas las Líneas</option>
              {lineas.map(l => (
                <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
              ))}
            </select>
          </div>

          {(selectedReport === 'DEFICIENCIAS' || selectedReport === 'PUESTA_TIERRA') && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Prioridad:</span>
              <select
                value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value as any)}
                className="bg-slate-900 text-xs font-bold text-amber-300 border border-slate-700 rounded-lg px-3 py-1.5"
              >
                <option value="TODAS">Todas</option>
                <option value="PRIORITARIO">PRIORITARIO</option>
                <option value="NO PRIORITARIO">NO PRIORITARIO</option>
              </select>
            </div>
          )}


          {selectedReport === 'HISTORIAL_ESTRUCTURA' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Poste N°:</span>
              <select
                value={targetPoste}
                onChange={(e) => setTargetPoste(e.target.value)}
                className="bg-slate-900 text-xs text-cyan-300 font-mono font-bold border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
                disabled={selectedLine === 'TODAS'}
              >
                {selectedLine === 'TODAS' ? (
                  <option value="">-- Seleccione una línea primero --</option>
                ) : availablePostes.length === 0 ? (
                  <option value="">-- Sin postes en plantilla --</option>
                ) : (
                  <>
                    <option value="">-- Seleccionar Poste ({availablePostes.length}) --</option>
                    {availablePostes.map(p => (
                      <option key={p} value={p}>Poste {p}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Formatted Report Printable Sheet */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl print:bg-white print:text-black print:border-none print:p-0">
        {/* Report Official Document Header */}
        <div className="border-b-2 border-cyan-500 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 print:text-blue-800">
                SISTEMA WEB DE SUBTRANSMISIÓN ELÉCTRICA
              </div>
              <h2 className="text-xl font-black text-white print:text-black tracking-tight mt-0.5">
                {REPORT_TYPES.find(r => r.id === selectedReport)?.label}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-gray-600 font-mono">
              <div>Fecha: {new Date().toLocaleDateString('es-PE')}</div>
              <div>Hora: {new Date().toLocaleTimeString('es-PE')}</div>
              <div>Generado por: {currentUser.nombres} ({currentUser.rol})</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-300 print:text-gray-700 font-medium">
            Filtro de Línea: <strong className="text-cyan-300 print:text-black">{selectedLine}</strong>
            {targetPoste && <span> | Estructura: <strong className="text-cyan-300 print:text-black">{targetPoste}</strong></span>}
          </div>
        </div>

        {/* Report 1: Deficiencias Content */}
        {selectedReport === 'DEFICIENCIAS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">CÓDIGO</th>
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-3">TIPO DE DEFICIENCIA</th>
                  <th className="py-2 px-2">PRIORIDAD</th>
                  <th className="py-2 px-2">ESTADO</th>
                  <th className="py-2 px-2">RESPONSABLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {deficiencias
                  .filter(d => selectedLine === 'TODAS' || d.cod_linea === selectedLine)
                  .filter(d => {
                    const normPrio = (d.prioridad === 'PRIORITARIO' || (d.prioridad as string) === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO';
                    return filterPrioridad === 'TODAS' || normPrio === filterPrioridad;
                  })
                  .map(d => {
                    const isPrio = d.prioridad === 'PRIORITARIO' || (d.prioridad as string) === 'ALTO';
                    return (
                      <tr key={d.id_deficiencia} className="py-2">
                        <td className="py-2 px-2 font-mono text-cyan-300 print:text-black font-bold">{d.id_deficiencia}</td>
                        <td className="py-2 px-2 font-mono">{d.cod_linea}</td>
                        <td className="py-2 px-2 font-mono font-bold">{d.poste_n}</td>
                        <td className="py-2 px-3 max-w-sm">{d.tipo_deficiencia}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPrio
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {isPrio ? 'PRIORITARIO' : 'NO PRIORITARIO'}
                          </span>
                        </td>
                        <td className="py-2 px-2">{d.estado}</td>
                        <td className="py-2 px-2">{d.usuario_responsable}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 2: Medición de Puesta a Tierra (PAT) Content */}
        {selectedReport === 'PUESTA_TIERRA' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">ID PAT</th>
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-2">ESTRUCTURA</th>
                  <th className="py-2 px-2">MATERIAL</th>
                  <th className="py-2 px-2">FECHA</th>
                  <th className="py-2 px-2 text-right">RESISTENCIA (Ω)</th>
                  <th className="py-2 px-2 text-center">PRIORIDAD</th>
                  <th className="py-2 px-2">RESPONSABLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {patData
                  .filter(p => selectedLine === 'TODAS' || p.cod_linea === selectedLine)
                  .filter(p => filterPrioridad === 'TODAS' || p.prioridad === filterPrioridad)
                  .map(p => {
                    const isCrit = p.valor_resistencia_pat >= 5.0 || p.prioridad === 'PRIORITARIO';
                    return (
                      <tr key={p.id_pat} className="py-2">
                        <td className="py-2 px-2 font-mono text-cyan-300 print:text-black font-bold">{p.id_pat}</td>
                        <td className="py-2 px-2 font-mono">{p.cod_linea}</td>
                        <td className="py-2 px-2 font-mono font-bold">{p.poste_n}</td>
                        <td className="py-2 px-2">{p.tipo_estructura || '-'}</td>
                        <td className="py-2 px-2">{p.material_estructura || '-'}</td>
                        <td className="py-2 px-2">{p.fecha_medicion}</td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${isCrit ? 'text-red-400 font-black' : 'text-emerald-400'}`}>
                          {p.valor_resistencia_pat.toFixed(2)} Ω
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCrit
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}>
                            {isCrit ? 'PRIORITARIO (≥ 5 Ω)' : 'NO PRIORITARIO'}
                          </span>
                        </td>
                        <td className="py-2 px-2 truncate max-w-[140px]">{p.responsable || '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}


        {/* Report 3: Efecto Corona Content */}
        {selectedReport === 'CORONA' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-2">AISLADOR</th>
                  <th className="py-2 px-2">FASE R</th>
                  <th className="py-2 px-2">FASE S</th>
                  <th className="py-2 px-2">FASE T</th>
                  <th className="py-2 px-2">FECHA/HORA</th>
                  <th className="py-2 px-3">COMENTARIOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {corona
                  .filter(c => selectedLine === 'TODAS' || c.cod_linea === selectedLine)
                  .slice(0, 100)
                  .map(c => (
                    <tr key={c.id_corona} className="py-1.5">
                      <td className="py-1.5 px-2 font-mono font-bold text-cyan-300 print:text-black">{c.cod_linea}</td>
                      <td className="py-1.5 px-2 font-mono">{c.poste_n}</td>
                      <td className="py-1.5 px-2 capitalize">{c.tipo_aislador}</td>
                      <td className="py-1.5 px-2 font-mono font-bold">{c.fase_r_conteo}</td>
                      <td className="py-1.5 px-2 font-mono font-bold">{c.fase_s_conteo}</td>
                      <td className="py-1.5 px-2 font-mono font-bold">{c.fase_t_conteo}</td>
                      <td className="py-1.5 px-2">{c.fecha} {c.hora}</td>
                      <td className="py-1.5 px-3 truncate max-w-xs">{c.comentarios}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 4: Podas por Especie Content */}
        {selectedReport === 'PODAS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-2">FECHA</th>
                  <th className="py-2 px-2">ALGARROBO</th>
                  <th className="py-2 px-2">PALMERA</th>
                  <th className="py-2 px-2">ORNAMENTAL</th>
                  <th className="py-2 px-2">TAMARINDO</th>
                  <th className="py-2 px-2">PONCEANA</th>
                  <th className="py-2 px-2">OTROS</th>
                  <th className="py-2 px-2 font-bold text-emerald-400 print:text-black">TOTAL</th>
                  <th className="py-2 px-2">CONTRATISTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {podas
                  .filter(p => selectedLine === 'TODAS' || p.cod_linea === selectedLine)
                  .map(p => (
                    <tr key={p.id_poda} className="py-2">
                      <td className="py-2 px-2 font-mono font-bold text-cyan-300 print:text-black">{p.cod_linea}</td>
                      <td className="py-2 px-2 font-mono">{p.poste_n}</td>
                      <td className="py-2 px-2">{p.fecha_ejecucion}</td>
                      <td className="py-2 px-2 text-center">{p.algarrobo}</td>
                      <td className="py-2 px-2 text-center">{p.palmera}</td>
                      <td className="py-2 px-2 text-center">{p.ornamental}</td>
                      <td className="py-2 px-2 text-center">{p.tamarindo}</td>
                      <td className="py-2 px-2 text-center">{p.ponceana}</td>
                      <td className="py-2 px-2 text-center">{p.otros}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-400 print:text-black">{p.total_arboles}</td>
                      <td className="py-2 px-2">{p.contratista_responsable}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 7: Hidrolavado Content */}
        {selectedReport === 'HIDROLAVADO' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-2">FECHA</th>
                  <th className="py-2 px-2">MÉTODO</th>
                  <th className="py-2 px-2">AGUA (L)</th>
                  <th className="py-2 px-2">COND. (µS/cm)</th>
                  <th className="py-2 px-2">CONTAMINACIÓN</th>
                  <th className="py-2 px-2">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {hidrolavado
                  .filter(h => selectedLine === 'TODAS' || h.cod_linea === selectedLine)
                  .map(h => (
                    <tr key={h.id_hidrolavado} className="py-2">
                      <td className="py-2 px-2 font-mono font-bold text-cyan-300 print:text-black">{h.cod_linea}</td>
                      <td className="py-2 px-2 font-mono">{h.poste_n}</td>
                      <td className="py-2 px-2">{h.fecha_ejecucion}</td>
                      <td className="py-2 px-2">{h.metodo_lavado}</td>
                      <td className="py-2 px-2 font-mono">{h.agua_utilizada_litros}</td>
                      <td className="py-2 px-2 font-mono">{h.conductividad_agua_us}</td>
                      <td className="py-2 px-2">{h.nivel_contaminacion}</td>
                      <td className="py-2 px-2 font-bold">{h.estado}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 6: DMS Content */}
        {selectedReport === 'DMS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">CÓDIGO DMS</th>
                  <th className="py-2 px-2">LÍNEA</th>
                  <th className="py-2 px-2">POSTE</th>
                  <th className="py-2 px-3">INFRACCIÓN</th>
                  <th className="py-2 px-2">PRIORIDAD</th>
                  <th className="py-2 px-2">ORDEN SERVICIO</th>
                  <th className="py-2 px-2">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {dms
                  .filter(d => selectedLine === 'TODAS' || d.cod_linea === selectedLine)
                  .map(d => (
                    <tr key={d.id_dms} className="py-2">
                      <td className="py-2 px-2 font-mono font-bold text-amber-300 print:text-black">{d.codigo_dms}</td>
                      <td className="py-2 px-2 font-mono">{d.cod_linea}</td>
                      <td className="py-2 px-2 font-mono font-bold">{d.poste_n}</td>
                      <td className="py-2 px-3 max-w-sm">{d.descripcion}</td>
                      <td className="py-2 px-2 font-bold">{d.prioridad}</td>
                      <td className="py-2 px-2 font-mono">{d.orden_servicio}</td>
                      <td className="py-2 px-2 font-bold">{d.estado}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 10: Historial por Estructura */}
        {selectedReport === 'HISTORIAL_ESTRUCTURA' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 print:text-gray-700">
              Historial de intervenciones consolidadas para la estructura: <strong className="text-cyan-300 print:text-black">{selectedLine} - Poste {targetPoste || '(Escriba un número de poste arriba)'}</strong>
            </p>
            {targetPoste && (
              <div className="space-y-2">
                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
                  <span className="font-bold text-white">Estructura Base:</span> Línea {selectedLine}, Poste {targetPoste}.
                </div>
                {/* List matching deficiencias */}
                {deficiencias.filter(d => d.cod_linea === selectedLine && d.poste_n === targetPoste).map(d => (
                  <div key={d.id_deficiencia} className="p-2.5 bg-red-950/40 border border-red-800 rounded text-xs">
                    <span className="font-bold text-red-300">Deficiencia ({d.id_deficiencia}):</span> {d.tipo_deficiencia} - Estado: {d.estado} ({d.fecha_inspeccion})
                  </div>
                ))}
                {/* List matching corona */}
                {corona.filter(c => c.cod_linea === selectedLine && c.poste_n === targetPoste).map(c => (
                  <div key={c.id_corona} className="p-2.5 bg-purple-950/40 border border-purple-800 rounded text-xs">
                    <span className="font-bold text-purple-300">Efecto Corona ({c.fecha}):</span> Fases R={c.fase_r_conteo}, S={c.fase_s_conteo}, T={c.fase_t_conteo} fot/min. Conclusión: {c.comentarios}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Report 12: Auditoría */}
        {selectedReport === 'AUDITORIA' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-400 text-slate-400 print:text-gray-700 font-bold">
                  <th className="py-2 px-2">FECHA/HORA</th>
                  <th className="py-2 px-2">USUARIO</th>
                  <th className="py-2 px-2">ACCIÓN</th>
                  <th className="py-2 px-2">MÓDULO</th>
                  <th className="py-2 px-2">LÍNEA / POSTE</th>
                  <th className="py-2 px-3">VALORES NUEVOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {auditoria.slice(0, 50).map(a => (
                  <tr key={a.id_auditoria} className="py-1.5">
                    <td className="py-1.5 px-2 font-mono">{a.fecha} {a.hora}</td>
                    <td className="py-1.5 px-2 font-semibold">{a.usuario} ({a.rol})</td>
                    <td className="py-1.5 px-2 font-bold">{a.accion}</td>
                    <td className="py-1.5 px-2">{a.modulo}</td>
                    <td className="py-1.5 px-2 font-mono">{a.cod_linea} {a.estructura !== '-' ? `P-${a.estructura}` : ''}</td>
                    <td className="py-1.5 px-3 truncate max-w-sm text-slate-300 print:text-black">{a.valores_nuevos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 print:border-gray-300 flex items-center justify-between text-[11px] text-slate-500 print:text-gray-500">
          <div>Documento emitido electrónicamente desde Sistema Web de Subtransmisión.</div>
          <div>Zona Horaria: America/Lima (UTC-5)</div>
        </div>
      </div>
    </div>
  );
};
