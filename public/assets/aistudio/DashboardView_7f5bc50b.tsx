import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Zap,
  TowerControl as Tower,
  Activity,
  AlertTriangle,
  Flame,
  Scissors,
  Wrench,
  ShieldCheck,
  Camera,
  CloudCheck,
  Filter,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Termografia,
  Poda,
  Mantenimiento,
  DMSItem,
  ConfiguracionDrive
} from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardViewProps {
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  corona: EfectoCorona[];
  deficiencias: Deficiencia[];
  termografia: Termografia[];
  podas: Poda[];
  mantenimiento: Mantenimiento[];
  dms: DMSItem[];
  configDrive: ConfiguracionDrive;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lineas,
  estructuras,
  corona,
  deficiencias,
  termografia,
  podas,
  mantenimiento,
  dms,
  configDrive,
  selectedLine,
  onSelectLine,
  onNavigateTab
}) => {
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODAS');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('TODOS');

  // Filter datasets by selected line
  const filteredEstructuras = useMemo(() => {
    return selectedLine === 'TODAS' ? estructuras : estructuras.filter(e => e.cod_linea === selectedLine);
  }, [estructuras, selectedLine]);

  const filteredCorona = useMemo(() => {
    return selectedLine === 'TODAS' ? corona : corona.filter(c => c.cod_linea === selectedLine);
  }, [corona, selectedLine]);

  const filteredDeficiencias = useMemo(() => {
    let list = selectedLine === 'TODAS' ? deficiencias : deficiencias.filter(d => d.cod_linea === selectedLine);
    if (filterPrioridad !== 'TODAS') {
      list = list.filter(d => d.prioridad === filterPrioridad);
    }
    return list;
  }, [deficiencias, selectedLine, filterPrioridad]);

  const filteredTermografia = useMemo(() => {
    return selectedLine === 'TODAS' ? termografia : termografia.filter(t => t.cod_linea === selectedLine);
  }, [termografia, selectedLine]);

  const filteredPodas = useMemo(() => {
    return selectedLine === 'TODAS' ? podas : podas.filter(p => p.cod_linea === selectedLine);
  }, [podas, selectedLine]);

  const filteredDMS = useMemo(() => {
    return selectedLine === 'TODAS' ? dms : dms.filter(d => d.cod_linea === selectedLine);
  }, [dms, selectedLine]);

  // Key metrics
  const totalLineas = lineas.length;
  const totalEstructuras = filteredEstructuras.length;
  const totalCorona = filteredCorona.length;
  const coronaAlertas = filteredCorona.filter(c => c.fase_r_conteo > 100 || c.fase_s_conteo > 100 || c.fase_t_conteo > 100).length;

  const totalDeficiencias = filteredDeficiencias.length;
  const defPrioritarias = filteredDeficiencias.filter(d => d.prioridad === 'PRIORITARIO').length;
  const defPendientes = filteredDeficiencias.filter(d => d.estado !== 'Cerrada' && d.estado !== 'Corregida').length;
  const defCorregidas = filteredDeficiencias.filter(d => d.estado === 'Corregida' || d.estado === 'Cerrada').length;

  const totalTermografias = filteredTermografia.length;
  const termCriticas = filteredTermografia.filter(t => t.criticidad === 'Alerta' || t.criticidad === 'Emergencia').length;

  const totalPodas = filteredPodas.length;
  const totalArboles = filteredPodas.reduce((acc, p) => acc + (p.total_arboles || 0), 0);

  const totalDMS = filteredDMS.length;
  const dmsPendientes = filteredDMS.filter(d => d.estado === 'Pendiente' || d.estado === 'Asignada').length;
  const dmsLevantadas = filteredDMS.filter(d => d.estado === 'Levantada').length;
  const dmsCerradas = filteredDMS.filter(d => d.estado === 'Cerrada').length;

  // Chart 1: Corona UV - Top Photons structures
  const coronaChartData = useMemo(() => {
    // Show top 15 highest photon count structures
    const sorted = [...filteredCorona]
      .sort((a, b) => Math.max(b.fase_r_conteo, b.fase_s_conteo, b.fase_t_conteo) - Math.max(a.fase_r_conteo, a.fase_s_conteo, a.fase_t_conteo))
      .slice(0, 15);

    return {
      labels: sorted.map(c => `${c.cod_linea} P-${c.poste_n}`),
      datasets: [
        {
          label: 'Fase R (Fot/min)',
          data: sorted.map(c => c.fase_r_conteo),
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        },
        {
          label: 'Fase S (Fot/min)',
          data: sorted.map(c => c.fase_s_conteo),
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Fase T (Fot/min)',
          data: sorted.map(c => c.fase_t_conteo),
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [filteredCorona]);

  // Chart 2: Deficiencias por Prioridad (Solo Prioritario y No Prioritario)
  const deficienciasPrioridadData = useMemo(() => {
    const prioritarioCount = filteredDeficiencias.filter(d => d.prioridad === 'PRIORITARIO').length;
    const noPrioritarioCount = filteredDeficiencias.filter(d => d.prioridad === 'NO PRIORITARIO').length;

    return {
      labels: ['Prioritario', 'No Prioritario'],
      datasets: [
        {
          data: [prioritarioCount, noPrioritarioCount],
          backgroundColor: [
            'rgba(239, 68, 68, 0.85)',
            'rgba(59, 130, 246, 0.85)'
          ],
          borderColor: '#0f172a',
          borderWidth: 2
        }
      ]
    };
  }, [filteredDeficiencias]);


  // Chart 3: Especies de Árboles Podados
  const podasEspeciesData = useMemo(() => {
    const especies = {
      Algarrobo: filteredPodas.reduce((acc, p) => acc + (p.algarrobo || 0), 0),
      Palmera: filteredPodas.reduce((acc, p) => acc + (p.palmera || 0), 0),
      Ornamental: filteredPodas.reduce((acc, p) => acc + (p.ornamental || 0), 0),
      Tamarindo: filteredPodas.reduce((acc, p) => acc + (p.tamarindo || 0), 0),
      Ponceana: filteredPodas.reduce((acc, p) => acc + (p.ponceana || 0), 0),
      Otros: filteredPodas.reduce((acc, p) => acc + (p.otros || 0), 0)
    };
    return {
      labels: Object.keys(especies),
      datasets: [
        {
          label: 'Árboles Podados',
          data: Object.values(especies),
          backgroundColor: [
            'rgba(16, 185, 129, 0.85)',
            'rgba(14, 165, 233, 0.85)',
            'rgba(168, 85, 247, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(244, 63, 94, 0.85)',
            'rgba(100, 116, 139, 0.85)'
          ],
          borderColor: '#0f172a',
          borderWidth: 2
        }
      ]
    };
  }, [filteredPodas]);

  // Chart 4: Estado DMS
  const dmsStatusData = useMemo(() => {
    const pend = filteredDMS.filter(d => d.estado === 'Pendiente' || d.estado === 'Asignada').length;
    const lev = filteredDMS.filter(d => d.estado === 'Levantada' || d.estado === 'En Levantamiento').length;
    const cerr = filteredDMS.filter(d => d.estado === 'Cerrada').length;
    return {
      labels: ['Pendientes', 'En Levantamiento / Levantadas', 'Cerradas Conformes'],
      datasets: [
        {
          label: 'Casos DMS',
          data: [pend, lev, cerr],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderColor: '#0f172a',
          borderWidth: 2
        }
      ]
    };
  }, [filteredDMS]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Sync Info */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-4 lg:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300 border border-cyan-700/60">
                Línea Activa: {selectedLine}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Última Sincronización Drive: {configDrive.last_sync_time}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              Dashboard de Supervisión y Control Operativo
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-3xl">
              Datos consolidados en tiempo real sincronizados con Google Drive (Spreadsheet ID: <span className="font-mono text-cyan-300 text-xs">{configDrive.sheet_lineas_id}</span>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">Todas las Líneas ({lineas.length})</option>
              {lineas.map(l => (
                <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
              ))}
            </select>

            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODAS">Todas las Prioridades</option>
              <option value="PRIORITARIO">PRIORITARIO</option>
              <option value="NO PRIORITARIO">NO PRIORITARIO</option>
            </select>

          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Líneas */}
        <div
          onClick={() => onNavigateTab('lineas')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Líneas ST</span>
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 group-hover:scale-110 transition">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalLineas}</div>
          <div className="text-[10px] text-cyan-400 font-medium mt-1">60 kV y 33 kV Operativas</div>
        </div>

        {/* Estructuras */}
        <div
          onClick={() => onNavigateTab('estructuras')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estructuras</span>
            <div className="p-1.5 rounded-lg bg-blue-950 text-blue-400 group-hover:scale-110 transition">
              <Tower className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalEstructuras.toLocaleString()}</div>
          <div className="text-[10px] text-blue-400 font-medium mt-1">Madera, CAC y Celosía</div>
        </div>

        {/* Efecto Corona */}
        <div
          onClick={() => onNavigateTab('corona')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efecto Corona</span>
            <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 group-hover:scale-110 transition">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalCorona}</div>
          <div className="text-[10px] text-purple-400 font-medium mt-1">
            {coronaAlertas > 0 ? (
              <span className="text-amber-400 font-bold">{coronaAlertas} con descargas &gt;100 fot/m</span>
            ) : (
              'Mediciones UV en rango'
            )}
          </div>
        </div>

        {/* Deficiencias */}
        <div
          onClick={() => onNavigateTab('deficiencias')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Deficiencias</span>
            <div className="p-1.5 rounded-lg bg-red-950 text-red-400 group-hover:scale-110 transition">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalDeficiencias}</div>
          <div className="text-[10px] text-red-400 font-medium mt-1">
            {defPrioritarias} Prioritarias • {defPendientes} Pendientes
          </div>
        </div>

        {/* Podas y Arboles */}
        <div
          onClick={() => onNavigateTab('podas')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Podas / Árboles</span>
            <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 group-hover:scale-110 transition">
              <Scissors className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalArboles}</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">{totalPodas} actividades registradas</div>
        </div>

        {/* DMS */}
        <div
          onClick={() => onNavigateTab('dms')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Casos DMS</span>
            <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 group-hover:scale-110 transition">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalDMS}</div>
          <div className="text-[10px] text-amber-400 font-medium mt-1">
            {dmsLevantadas} Levantadas • {dmsCerradas} Cerradas
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Corona Multi-Phase Top Photons */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                Mediciones de Efecto Corona UV (Fotones/Minuto por Fases R, S, T)
              </h2>
              <p className="text-xs text-slate-400">
                Top estructuras con mayor nivel de conteo fotónico registradas (L-6657C y asociadas)
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('corona')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
            >
              Ver las 222 mediciones &rarr;
            </button>
          </div>
          <div className="h-64 sm:h-72">
            <Bar
              data={coronaChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#cbd5e1', font: { size: 11 } }
                  },
                  tooltip: {
                    callbacks: {
                      footer: (items) => {
                        const maxVal = Math.max(...items.map(i => Number(i.raw) || 0));
                        return maxVal > 100 ? 'ALERTA: Posible ionización/descarga' : 'Estado: Normal';
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    grid: { color: 'rgba(51, 65, 85, 0.4)' }
                  },
                  y: {
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    grid: { color: 'rgba(51, 65, 85, 0.4)' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 2: Deficiencias por Prioridad */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Deficiencias por Prioridad
              </h2>
              <button
                onClick={() => onNavigateTab('deficiencias')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Detalles
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribución de criticidad según norma de supervisión
            </p>
            <div className="h-52 flex items-center justify-center">
              <Doughnut
                data={deficienciasPrioridadData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#cbd5e1', font: { size: 11 } }
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-300">
            <span>Prioritarias: <strong className="text-red-400">{defPrioritarias}</strong></span>
            <span>Pendientes: <strong className="text-amber-400">{defPendientes}</strong></span>
            <span>Corregidas: <strong className="text-emerald-400">{defCorregidas}</strong></span>
          </div>
        </div>
      </div>

      {/* Row 2: Podas Species & DMS Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart 3: Especies Podadas */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scissors className="h-4 w-4 text-emerald-400" />
              Especies de Árboles Podados
            </h2>
            <button
              onClick={() => onNavigateTab('podas')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Registrar Poda
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Total de árboles despejados en franja de servidumbre: <strong className="text-emerald-300">{totalArboles}</strong>
          </p>
          <div className="h-52">
            <Bar
              data={podasEspeciesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#94a3b8', font: { size: 10 } } },
                  y: { ticks: { color: '#94a3b8', font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 4: Estado DMS */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Gestión y Ciclo de Vida DMS
            </h2>
            <button
              onClick={() => onNavigateTab('dms')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Importar / Cierre
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Estado de Distancias Mínimas de Seguridad observadas
          </p>
          <div className="h-52 flex items-center justify-center">
            <Doughnut
              data={dmsStatusData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { size: 10 } }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Termografía & Evidencias Resumen */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-400" />
              Resumen Termográfico y Evidencias
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Inspecciones de puntos calientes en subtransmisión
            </p>

            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Inspecciones Termográficas</div>
                  <div className="text-lg font-bold text-white">{totalTermografias} Registradas</div>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                  termCriticas > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {termCriticas} Alertas
                </span>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Repositorio Google Drive</div>
                  <div className="text-xs font-mono text-cyan-300 truncate max-w-[180px]">
                    SISTEMA_SUBTRANSMISION/
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('evidencias')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-600"
                >
                  Ver Evidencias
                </button>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Historial de Auditoría</div>
                  <div className="text-xs text-slate-300">Cambios registrados en tiempo real</div>
                </div>
                <button
                  onClick={() => onNavigateTab('auditoria')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-600"
                >
                  Auditoría
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400">
              Cumplimiento normativo y supervisión técnica OSINERGMIN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
