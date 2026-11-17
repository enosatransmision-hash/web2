import React, { useState, useMemo } from 'react';
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
  Filter,
  CheckCircle,
  Clock,
  PlayCircle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Shield,
  Thermometer,
  TreePine,
  AlertCircle,
  Gauge,
  Sparkles,
  Layers,
  Check,
  ChevronRight,
  ClipboardList,
  Droplets
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
  ConfiguracionDrive,
  PuestaTierra,
  OrdenMantenimiento,
  Prioridad
} from '../types';

interface DashboardViewProps {
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  corona: EfectoCorona[];
  deficiencias: Deficiencia[];
  puestaTierra: PuestaTierra[];
  termografia: Termografia[];
  podas: Poda[];
  mantenimiento: Mantenimiento[];
  hidrolavado?: Hidrolavado[];
  ordenesMantenimiento?: OrdenMantenimiento[];
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
  puestaTierra = [],
  termografia = [],
  podas = [],
  mantenimiento = [],
  hidrolavado = [],
  ordenesMantenimiento = [],
  dms = [],
  configDrive,
  selectedLine,
  onSelectLine,
  onNavigateTab
}) => {
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODAS');

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

  const filteredPuestaTierra = useMemo(() => {
    return selectedLine === 'TODAS' ? puestaTierra : puestaTierra.filter(p => p.cod_linea === selectedLine);
  }, [puestaTierra, selectedLine]);

  const filteredTermografia = useMemo(() => {
    return selectedLine === 'TODAS' ? termografia : termografia.filter(t => t.cod_linea === selectedLine);
  }, [termografia, selectedLine]);

  const filteredPodas = useMemo(() => {
    return selectedLine === 'TODAS' ? podas : podas.filter(p => p.cod_linea === selectedLine);
  }, [podas, selectedLine]);

  const filteredMantenimiento = useMemo(() => {
    return selectedLine === 'TODAS' ? mantenimiento : mantenimiento.filter(m => m.cod_linea === selectedLine);
  }, [mantenimiento, selectedLine]);

  const filteredHidrolavado = useMemo(() => {
    return selectedLine === 'TODAS' ? hidrolavado : hidrolavado.filter(h => h.cod_linea === selectedLine);
  }, [hidrolavado, selectedLine]);

  const filteredDMS = useMemo(() => {
    return selectedLine === 'TODAS' ? dms : dms.filter(d => d.cod_linea === selectedLine);
  }, [dms, selectedLine]);

  // General KPIs
  const totalLineas = lineas.length;
  const totalEstructuras = filteredEstructuras.length;
  const totalCorona = filteredCorona.length;
  const coronaAlertas = filteredCorona.filter(c => c.prioridad === 'PRIORITARIO' || (c.fase_r_conteo || 0) > 100 || (c.fase_s_conteo || 0) > 100 || (c.fase_t_conteo || 0) > 100).length;

  const totalDeficiencias = filteredDeficiencias.length;
  const defPrioritarias = filteredDeficiencias.filter(d => d.prioridad === 'PRIORITARIO').length;
  const defPendientes = filteredDeficiencias.filter(d => d.estado !== 'Cerrada' && d.estado !== 'Corregida').length;

  // --- 1. PUESTAS A TIERRA METRICS & DISTRIBUTIONS ---
  const totalPAT = filteredPuestaTierra.length;
  const patConforme = filteredPuestaTierra.filter(p => p.valor_resistencia_pat <= 10.0).length;
  const patAlerta = filteredPuestaTierra.filter(p => p.valor_resistencia_pat > 10.0 && p.valor_resistencia_pat <= 20.0).length;
  const patCritico = filteredPuestaTierra.filter(p => p.valor_resistencia_pat > 20.0).length;

  const avgResistenciaPAT = useMemo(() => {
    if (totalPAT === 0) return 0;
    const sum = filteredPuestaTierra.reduce((acc, p) => acc + (p.valor_resistencia_pat || 0), 0);
    return Number((sum / totalPAT).toFixed(2));
  }, [filteredPuestaTierra, totalPAT]);

  // Resistance Ranges for PAT distribution chart
  const patDistribution = useMemo(() => {
    const range1 = filteredPuestaTierra.filter(p => p.valor_resistencia_pat < 5).length;
    const range2 = filteredPuestaTierra.filter(p => p.valor_resistencia_pat >= 5 && p.valor_resistencia_pat <= 10).length;
    const range3 = filteredPuestaTierra.filter(p => p.valor_resistencia_pat > 10 && p.valor_resistencia_pat <= 20).length;
    const range4 = filteredPuestaTierra.filter(p => p.valor_resistencia_pat > 20).length;
    return [
      { range: '< 5 Ω (Óptimo)', count: range1, color: 'bg-emerald-500', barColor: '#10B981', textColor: 'text-emerald-400' },
      { range: '5 - 10 Ω (Conforme)', count: range2, color: 'bg-cyan-500', barColor: '#06B6D4', textColor: 'text-cyan-400' },
      { range: '10 - 20 Ω (Alerta)', count: range3, color: 'bg-amber-500', barColor: '#F59E0B', textColor: 'text-amber-400' },
      { range: '> 20 Ω (Crítico)', count: range4, color: 'bg-rose-500', barColor: '#F43F5E', textColor: 'text-rose-400' }
    ];
  }, [filteredPuestaTierra]);

  // Top 5 Critical Groundings (Highest resistance)
  const topCriticalPAT = useMemo(() => {
    return [...filteredPuestaTierra]
      .sort((a, b) => b.valor_resistencia_pat - a.valor_resistencia_pat)
      .slice(0, 5);
  }, [filteredPuestaTierra]);

  // --- 2. TERMOGRAFÍA INFRARROJA METRICS & DISTRIBUTIONS ---
  const totalTermografias = filteredTermografia.length;
  const termNormal = filteredTermografia.filter(t => t.criticidad === 'Normal' || t.delta_t < 10).length;
  const termAlerta = filteredTermografia.filter(t => t.criticidad === 'Alerta' || (t.delta_t >= 10 && t.delta_t <= 35)).length;
  const termEmergencia = filteredTermografia.filter(t => t.criticidad === 'Emergencia' || t.delta_t > 35).length;

  const maxDeltaT = useMemo(() => {
    if (totalTermografias === 0) return 0;
    return Math.max(...filteredTermografia.map(t => t.delta_t || 0));
  }, [filteredTermografia, totalTermografias]);

  const maxTempComponente = useMemo(() => {
    if (totalTermografias === 0) return 0;
    return Math.max(...filteredTermografia.map(t => t.temp_max_componente || 0));
  }, [filteredTermografia, totalTermografias]);

  // Top hotspots by delta_t
  const topHotspots = useMemo(() => {
    return [...filteredTermografia]
      .sort((a, b) => (b.delta_t || 0) - (a.delta_t || 0))
      .slice(0, 4);
  }, [filteredTermografia]);

  // Component breakdown for Thermography
  const termComponents = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTermografia.forEach(t => {
      const comp = t.componente_falla || 'Otros';
      map[comp] = (map[comp] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTermografia]);

  // --- 3. CONTROL DE PODAS METRICS ---
  const totalPodas = filteredPodas.length;
  const totalArboles = filteredPodas.reduce((acc, p) => acc + (p.total_arboles || 0), 0);
  const podasCompletadas = filteredPodas.filter(p => p.estado === 'Completada' || p.estado === 'Verificada').length;
  const podasEnEjecucion = filteredPodas.filter(p => p.estado === 'En Ejecución').length;
  const podasProgramadas = filteredPodas.filter(p => p.estado === 'Programada').length;

  // Species count
  const speciesData = useMemo(() => {
    const s = {
      Algarrobo: 0,
      Palmera: 0,
      Ornamental: 0,
      Tamarindo: 0,
      Ponceana: 0,
      Otros: 0
    };
    filteredPodas.forEach(p => {
      s.Algarrobo += p.algarrobo || 0;
      s.Palmera += p.palmera || 0;
      s.Ornamental += p.ornamental || 0;
      s.Tamarindo += p.tamarindo || 0;
      s.Ponceana += p.ponceana || 0;
      s.Otros += p.otros || 0;
    });
    return Object.entries(s);
  }, [filteredPodas]);

  const maxSpeciesCount = Math.max(1, ...speciesData.map(([, v]) => v));

  // --- 4. MANTENIMIENTO STATUS METRICS & DONUT ---
  const totalMantenimientos = filteredMantenimiento.length;
  const mantProgramado = filteredMantenimiento.filter(m => m.estado === 'Programado').length;
  const mantEnProceso = filteredMantenimiento.filter(m => m.estado === 'En Proceso').length;
  const mantFinalizado = filteredMantenimiento.filter(m => m.estado === 'Finalizado').length;
  const mantAprobado = filteredMantenimiento.filter(m => m.estado === 'Aprobado').length;

  const mantSlices = [
    { label: 'Aprobado', count: mantAprobado, color: '#10B981', textColor: 'text-emerald-400', bg: 'bg-emerald-500' },
    { label: 'Finalizado', count: mantFinalizado, color: '#3B82F6', textColor: 'text-blue-400', bg: 'bg-blue-500' },
    { label: 'En Proceso', count: mantEnProceso, color: '#F59E0B', textColor: 'text-amber-400', bg: 'bg-amber-500' },
    { label: 'Programado', count: mantProgramado, color: '#06B6D4', textColor: 'text-cyan-400', bg: 'bg-cyan-500' }
  ];

  // SVG Donut calculation helper
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  // --- 5. DMS METRICS ---
  const totalDMS = filteredDMS.length;
  const dmsPendientes = filteredDMS.filter(d => d.estado === 'Pendiente' || d.estado === 'Asignada').length;
  const dmsLevantadas = filteredDMS.filter(d => d.estado === 'Levantada').length;
  const dmsCerradas = filteredDMS.filter(d => d.estado === 'Cerrada').length;

  // --- 6. CORONA MEASUREMENTS ---
  const topCorona = useMemo(() => {
    return [...filteredCorona]
      .sort((a, b) => Math.max(b.fase_r_conteo || 0, b.fase_s_conteo || 0, b.fase_t_conteo || 0) - Math.max(a.fase_r_conteo || 0, a.fase_s_conteo || 0, a.fase_t_conteo || 0))
      .slice(0, 6);
  }, [filteredCorona]);

  const maxCoronaPhotons = useMemo(() => {
    let max = 150;
    topCorona.forEach(c => {
      max = Math.max(max, c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0);
    });
    return max;
  }, [topCorona]);

  // --- 7. ÓRDENES DE MANTENIMIENTO (OM) COMPUTATIONS ---
  const getOMPriority = (om: OrdenMantenimiento): Prioridad => {
    if (om.prioridad) return om.prioridad;
    const hasPrioritario = (om.registros_asociados || []).some(r => r.prioridad === 'PRIORITARIO');
    return hasPrioritario ? 'PRIORITARIO' : 'NO PRIORITARIO';
  };

  const filteredOM = useMemo(() => {
    if (selectedLine === 'TODAS') return ordenesMantenimiento;
    return ordenesMantenimiento.filter(om => 
      (om.registros_asociados || []).some(r => r.cod_linea === selectedLine) ||
      (om.observaciones && om.observaciones.includes(selectedLine))
    );
  }, [ordenesMantenimiento, selectedLine]);

  const totalOM = filteredOM.length;
  const omSubsanadas = useMemo(() => filteredOM.filter(o => o.estado === 'Subsanado'), [filteredOM]);
  const omPorSubsanar = useMemo(() => filteredOM.filter(o => o.estado === 'Por subsanar'), [filteredOM]);
  const omPrioritarias = useMemo(() => filteredOM.filter(o => getOMPriority(o) === 'PRIORITARIO'), [filteredOM]);
  const omNoPrioritarias = useMemo(() => filteredOM.filter(o => getOMPriority(o) === 'NO PRIORITARIO'), [filteredOM]);

  const pctSubsanadas = totalOM > 0 ? Number(((omSubsanadas.length / totalOM) * 100).toFixed(1)) : 0;
  const pctPorSubsanar = totalOM > 0 ? Number(((omPorSubsanar.length / totalOM) * 100).toFixed(1)) : 0;
  const pctPrioritarias = totalOM > 0 ? Number(((omPrioritarias.length / totalOM) * 100).toFixed(1)) : 0;
  const pctNoPrioritarias = totalOM > 0 ? Number(((omNoPrioritarias.length / totalOM) * 100).toFixed(1)) : 0;

  // 2x2 Matrix cross lists
  const omPrioPorSubsanar = useMemo(() => 
    filteredOM.filter(o => getOMPriority(o) === 'PRIORITARIO' && o.estado === 'Por subsanar'), 
    [filteredOM]
  );
  const omPrioSubsanada = useMemo(() => 
    filteredOM.filter(o => getOMPriority(o) === 'PRIORITARIO' && o.estado === 'Subsanado'), 
    [filteredOM]
  );
  const omNoPrioPorSubsanar = useMemo(() => 
    filteredOM.filter(o => getOMPriority(o) === 'NO PRIORITARIO' && o.estado === 'Por subsanar'), 
    [filteredOM]
  );
  const omNoPrioSubsanada = useMemo(() => 
    filteredOM.filter(o => getOMPriority(o) === 'NO PRIORITARIO' && o.estado === 'Subsanado'), 
    [filteredOM]
  );

  // Quick filter for the interactive OM list panel
  const [quickOMFilter, setQuickOMFilter] = useState<'TODAS' | 'POR_SUBSANAR' | 'SUBSANADAS' | 'PRIORITARIAS' | 'NO_PRIORITARIAS'>('TODAS');

  const displayedOMList = useMemo(() => {
    switch (quickOMFilter) {
      case 'POR_SUBSANAR':
        return omPorSubsanar;
      case 'SUBSANADAS':
        return omSubsanadas;
      case 'PRIORITARIAS':
        return omPrioritarias;
      case 'NO_PRIORITARIAS':
        return omNoPrioritarias;
      default:
        return filteredOM;
    }
  }, [quickOMFilter, omPorSubsanar, omSubsanadas, omPrioritarias, omNoPrioritarias, filteredOM]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Dashboard General de Subtransmisión</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión integral de actividades, mediciones de campo, podas, termografía y estado operativo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Filtrar por Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="TODAS">Todas las Líneas ({lineas.length})</option>
              {lineas.map((l) => (
                <option key={l.id_linea} value={l.cod_linea}>
                  {l.cod_linea} - {l.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (11 Quick Navigation Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3">
        {/* Líneas */}
        <div
          onClick={() => onNavigateTab('lineas')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Líneas</span>
            <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-white">{totalLineas}</div>
          <div className="text-[10px] text-cyan-400 font-medium truncate mt-0.5">60 y 33 kV</div>
        </div>

        {/* Estructuras */}
        <div
          onClick={() => onNavigateTab('estructuras')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Estructuras</span>
            <div className="p-1 rounded-lg bg-blue-950 text-blue-400">
              <Tower className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-white">{totalEstructuras.toLocaleString()}</div>
          <div className="text-[10px] text-blue-400 font-medium truncate mt-0.5">Postes / Torres</div>
        </div>

        {/* Puestas a Tierra (PAT) - NEW KPI */}
        <div
          onClick={() => onNavigateTab('puesta_tierra')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-emerald-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">P. Tierra</span>
            <div className="p-1 rounded-lg bg-emerald-950 text-emerald-400">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400">{totalPAT}</div>
          <div className="text-[10px] text-emerald-300/80 font-medium truncate mt-0.5">
            Ø {avgResistenciaPAT} Ω • {patCritico} &gt;20Ω
          </div>
        </div>

        {/* Termografía Infrarroja - NEW KPI */}
        <div
          onClick={() => onNavigateTab('termografia')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-rose-500/30 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-rose-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Termografía</span>
            <div className="p-1 rounded-lg bg-rose-950 text-rose-400">
              <Thermometer className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-400">{totalTermografias}</div>
          <div className="text-[10px] text-rose-300/80 font-medium truncate mt-0.5">
            {termEmergencia} Emerg. • ΔT {maxDeltaT.toFixed(1)}°
          </div>
        </div>

        {/* Control Podas - NEW KPI */}
        <div
          onClick={() => onNavigateTab('podas')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-lime-500/30 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-lime-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-lime-300">Podas</span>
            <div className="p-1 rounded-lg bg-lime-950 text-lime-400">
              <Scissors className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-lime-400">{totalArboles}</div>
          <div className="text-[10px] text-lime-300/80 font-medium truncate mt-0.5">
            Árboles • {totalPodas} tramos
          </div>
        </div>

        {/* Mantenimiento */}
        <div
          onClick={() => onNavigateTab('mantenimiento')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-cyan-500/40 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-cyan-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Mantenim.</span>
            <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400">
              <Wrench className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-cyan-300">{totalMantenimientos}</div>
          <div className="text-[10px] text-cyan-400 font-medium truncate mt-0.5">
            {mantFinalizado + mantAprobado} Ejecutados
          </div>
        </div>

        {/* Efecto Corona */}
        <div
          onClick={() => onNavigateTab('corona')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-purple-500/30 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Corona UV</span>
            <div className="p-1 rounded-lg bg-purple-950 text-purple-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-300">{totalCorona}</div>
          <div className="text-[10px] text-purple-400 font-medium truncate mt-0.5">
            {coronaAlertas} Alertas
          </div>
        </div>

        {/* Deficiencias */}
        <div
          onClick={() => onNavigateTab('deficiencias')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Deficiencias</span>
            <div className="p-1 rounded-lg bg-red-950 text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-white">{totalDeficiencias}</div>
          <div className="text-[10px] text-red-400 font-medium truncate mt-0.5">
            {defPrioritarias} Prioritarias
          </div>
        </div>

        {/* DMS */}
        <div
          onClick={() => onNavigateTab('dms')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Casos DMS</span>
            <div className="p-1 rounded-lg bg-amber-950 text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-white">{totalDMS}</div>
          <div className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
            {dmsLevantadas + dmsCerradas} Resueltas
          </div>
        </div>

        {/* Órdenes OM - Nueva Tarjeta KPI Superior */}
        <div
          onClick={() => onNavigateTab('ordenes_om')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/40 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-indigo-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Órdenes OM</span>
            <div className="p-1 rounded-lg bg-indigo-950 text-indigo-400">
              <ClipboardList className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-300">{totalOM}</div>
          <div className="text-[10px] text-indigo-300/80 font-medium truncate mt-0.5">
            {omSubsanadas.length} Subs. • {omPrioritarias.length} Prior.
          </div>
        </div>

        {/* Hidrolavado - Nueva Tarjeta KPI */}
        <div
          onClick={() => onNavigateTab('hidrolavado')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 rounded-2xl p-3.5 shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ring-1 ring-sky-500/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Hidrolav.</span>
            <div className="p-1 rounded-lg bg-sky-950 text-sky-400">
              <Droplets className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-sky-300">{filteredHidrolavado.length}</div>
          <div className="text-[10px] text-sky-300/80 font-medium truncate mt-0.5">
            {filteredHidrolavado.filter(h => h.metodo_lavado.includes('Caliente')).length} En Caliente
          </div>
        </div>
      </div>

      {/* SECTION 1: ESTADO DE MANTENIMIENTO DE LÍNEAS (REQUESTED CORE CHART) */}
      <div className="bg-slate-800/90 border border-cyan-500/40 rounded-2xl p-5 shadow-xl ring-1 ring-cyan-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/70 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Estado de los Mantenimientos de Líneas
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold">
                  {totalMantenimientos} Órdenes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Distribución del ciclo de vida de mantenimiento: Programado, En Proceso, Finalizado y Aprobado
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('mantenimiento')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition self-start sm:self-auto cursor-pointer"
          >
            <span>Ver Órdenes de Mantenimiento</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* SVG Donut Chart */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-center gap-6 p-2">
            <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="text-slate-800"
                  strokeWidth="18"
                  stroke="currentColor"
                  fill="transparent"
                />
                {totalMantenimientos > 0 &&
                  mantSlices.map((slice, index) => {
                    const percent = (slice.count / totalMantenimientos) * 100;
                    const strokeDasharray = `${(percent * circumference) / 100} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent * circumference) / 100);
                    accumulatedPercent += percent;

                    if (slice.count === 0) return null;

                    return (
                      <circle
                        key={index}
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={slice.color}
                        strokeWidth="18"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-500"
                      />
                    );
                  })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{totalMantenimientos}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Órdenes</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 w-full sm:w-auto">
              {mantSlices.map((slice) => {
                const pct = totalMantenimientos > 0 ? Math.round((slice.count / totalMantenimientos) * 100) : 0;
                return (
                  <div key={slice.label} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${slice.bg}`} />
                      <span className="text-slate-300 font-medium">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className={`font-bold ${slice.textColor}`}>{slice.count}</span>
                      <span className="text-[11px] text-slate-500">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress & Breakdown */}
          <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl p-4 border border-slate-700/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Avance General de Órdenes de Mantenimiento
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {totalMantenimientos > 0 ? Math.round(((mantFinalizado + mantAprobado) / totalMantenimientos) * 100) : 0}% Ejecutado
              </span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {totalMantenimientos > 0 && (
                <>
                  <div style={{ width: `${(mantAprobado / totalMantenimientos) * 100}%` }} className="bg-emerald-500" title={`Aprobado: ${mantAprobado}`} />
                  <div style={{ width: `${(mantFinalizado / totalMantenimientos) * 100}%` }} className="bg-blue-500" title={`Finalizado: ${mantFinalizado}`} />
                  <div style={{ width: `${(mantEnProceso / totalMantenimientos) * 100}%` }} className="bg-amber-500" title={`En Proceso: ${mantEnProceso}`} />
                  <div style={{ width: `${(mantProgramado / totalMantenimientos) * 100}%` }} className="bg-cyan-500" title={`Programado: ${mantProgramado}`} />
                </>
              )}
            </div>

            {/* Maintenance by Type Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Preventivo</div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {filteredMantenimiento.filter(m => m.tipo_mantenimiento === 'Preventivo').length}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Correctivo</div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {filteredMantenimiento.filter(m => m.tipo_mantenimiento === 'Correctivo').length}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Predictivo</div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {filteredMantenimiento.filter(m => m.tipo_mantenimiento === 'Predictivo').length}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Emergencia</div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {filteredMantenimiento.filter(m => m.tipo_mantenimiento === 'Emergencia').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: ÓRDENES DE MANTENIMIENTO (OM) — ESTADO Y PRIORIDAD */}
      <div className="bg-slate-800/90 border border-indigo-500/40 rounded-2xl p-5 shadow-xl ring-1 ring-indigo-500/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/70 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Órdenes de Mantenimiento (OM) — Estado y Prioridad
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {totalOM} Registradas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento integral del ciclo resolutivo, avance por estado y clasificación de criticidad técnica operativa.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('ordenes_om')}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <span>Ir al Módulo de Órdenes OM</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 4 Tarjetas de Métricas Directas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Subsanadas */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 shadow-md ring-1 ring-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Subsanadas</span>
              <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{omSubsanadas.length}</span>
              <span className="text-xs font-bold text-emerald-400">{pctSubsanadas}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctSubsanadas}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Órdenes resueltas conforme y validadas en campo
            </p>
          </div>

          {/* Por subsanar */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 shadow-md ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Por subsanar</span>
              <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{omPorSubsanar.length}</span>
              <span className="text-xs font-bold text-amber-400">{pctPorSubsanar}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctPorSubsanar}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Órdenes pendientes o en curso de atención técnica
            </p>
          </div>

          {/* Prioritarias */}
          <div className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-4 shadow-md ring-1 ring-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Prioritarias</span>
              <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{omPrioritarias.length}</span>
              <span className="text-xs font-bold text-rose-400">{pctPrioritarias}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctPrioritarias}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Criticidad técnica alta con riesgo para la continuidad
            </p>
          </div>

          {/* No Prioritarias */}
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 shadow-md ring-1 ring-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">No Prioritarias</span>
              <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{omNoPrioritarias.length}</span>
              <span className="text-xs font-bold text-cyan-400">{pctNoPrioritarias}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctNoPrioritarias}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Mantenimientos regulares y preventivos en programación
            </p>
          </div>
        </div>

        {/* Gráficos Circulares Interactivos (SVG Donuts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Donut 1: Distribución por Estado */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0 flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800"
                  strokeWidth="12"
                  fill="transparent"
                />
                {totalOM > 0 ? (
                  <>
                    {/* Segmento Por subsanar (Fondo ambar) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-amber-500"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray="251.327"
                      strokeDashoffset="0"
                    />
                    {/* Segmento Subsanadas (Frente verde) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-emerald-500 transition-all duration-500"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(omSubsanadas.length / totalOM) * 251.327} 251.327`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-700"
                    strokeWidth="12"
                    fill="transparent"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white">{pctSubsanadas}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Subsanadas</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Distribución por Estado</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Progreso global de resolución de órdenes de mantenimiento
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-200 font-medium">Subsanadas</span>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">
                    {omSubsanadas.length} ({pctSubsanadas}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-200 font-medium">Por subsanar</span>
                  </div>
                  <span className="font-bold text-amber-400 font-mono">
                    {omPorSubsanar.length} ({pctPorSubsanar}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Donut 2: Distribución por Prioridad */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0 flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800"
                  strokeWidth="12"
                  fill="transparent"
                />
                {totalOM > 0 ? (
                  <>
                    {/* Segmento No Prioritarias (Fondo cian) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-cyan-500"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray="251.327"
                      strokeDashoffset="0"
                    />
                    {/* Segmento Prioritarias (Frente carmesí) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-rose-500 transition-all duration-500"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(omPrioritarias.length / totalOM) * 251.327} 251.327`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-700"
                    strokeWidth="12"
                    fill="transparent"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-rose-400">{pctPrioritarias}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Criticidad Activa</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Distribución por Prioridad</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Índice de criticidad técnica sobre el total de órdenes de trabajo
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/40 border border-rose-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-200 font-medium">Prioritarias</span>
                  </div>
                  <span className="font-bold text-rose-400 font-mono">
                    {omPrioritarias.length} ({pctPrioritarias}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/40 border border-cyan-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span className="text-slate-200 font-medium">No Prioritarias</span>
                  </div>
                  <span className="font-bold text-cyan-400 font-mono">
                    {omNoPrioritarias.length} ({pctNoPrioritarias}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matriz Cruzada 2×2 (Estado × Prioridad) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Matriz Cruzada 2×2: Estado × Prioridad</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Segmentación operativa para focalizar cuadrantes de alta criticidad y despachos de mantenimiento.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuadrante 1: 🚨 Prioritaria • Por subsanar */}
            <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/50 rounded-xl p-4 shadow-lg ring-1 ring-rose-500/20">
              <div className="flex items-center justify-between pb-2 border-b border-rose-900/40 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <div>
                    <h4 className="text-xs font-bold text-rose-300">Prioritaria • Por subsanar</h4>
                    <p className="text-[10px] text-slate-400">Intervención Urgente Requerida</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white font-mono shadow-sm">
                  {omPrioPorSubsanar.length} OM
                </span>
              </div>
              <p className="text-[11px] text-rose-200/80 mb-3 leading-snug">
                Órdenes críticas que requieren atención prioritaria inmediata para prevenir anomalías o cortes de suministro.
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {omPrioPorSubsanar.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-2 text-center bg-slate-950/40 rounded-lg">
                    Sin órdenes críticas pendientes. ¡Excelente!
                  </div>
                ) : (
                  omPrioPorSubsanar.slice(0, 4).map(om => (
                    <div
                      key={om.id_om}
                      onClick={() => onNavigateTab('ordenes_om')}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-rose-900/30 hover:border-rose-500/60 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-400">{om.numero_om}</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                          {om.tipo_actividad}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {om.registros_asociados?.length || 0} reg.
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cuadrante 2: ✅ Prioritaria • Subsanada */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-xl p-4 shadow-lg ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">Prioritaria • Subsanada</h4>
                    <p className="text-[10px] text-slate-400">Alta Criticidad Concluida</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white font-mono shadow-sm">
                  {omPrioSubsanada.length} OM
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 mb-3 leading-snug">
                Órdenes de alta criticidad concluidas con éxito y verificadas conforme a las especificaciones técnicas.
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {omPrioSubsanada.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-2 text-center bg-slate-950/40 rounded-lg">
                    No hay órdenes prioritarias concluidas aún.
                  </div>
                ) : (
                  omPrioSubsanada.slice(0, 4).map(om => (
                    <div
                      key={om.id_om}
                      onClick={() => onNavigateTab('ordenes_om')}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-emerald-900/30 hover:border-emerald-500/60 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">{om.numero_om}</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                          {om.tipo_actividad}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {om.registros_asociados?.length || 0} reg.
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cuadrante 3: ⏳ No Prioritaria • Por subsanar */}
            <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-4 shadow-lg ring-1 ring-amber-500/20">
              <div className="flex items-center justify-between pb-2 border-b border-amber-900/40 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏳</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">No Prioritaria • Por subsanar</h4>
                    <p className="text-[10px] text-slate-400">Programación Regular en Curso</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-600 text-white font-mono shadow-sm">
                  {omNoPrioPorSubsanar.length} OM
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 mb-3 leading-snug">
                Mantenimientos preventivos o regulares pendientes de atención según cronograma de operaciones.
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {omNoPrioPorSubsanar.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-2 text-center bg-slate-950/40 rounded-lg">
                    Sin órdenes regulares pendientes.
                  </div>
                ) : (
                  omNoPrioPorSubsanar.slice(0, 4).map(om => (
                    <div
                      key={om.id_om}
                      onClick={() => onNavigateTab('ordenes_om')}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-amber-900/30 hover:border-amber-500/60 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{om.numero_om}</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                          {om.tipo_actividad}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {om.registros_asociados?.length || 0} reg.
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cuadrante 4: 🎯 No Prioritaria • Subsanada */}
            <div className="bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-xl p-4 shadow-lg ring-1 ring-cyan-500/20">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-900/40 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <div>
                    <h4 className="text-xs font-bold text-cyan-300">No Prioritaria • Subsanada</h4>
                    <p className="text-[10px] text-slate-400">Mantenimiento Ordinario al Día</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-600 text-white font-mono shadow-sm">
                  {omNoPrioSubsanada.length} OM
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/80 mb-3 leading-snug">
                Mantenimientos regulares concluidos a tiempo, normalizados y archivados conforme al plan anual.
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {omNoPrioSubsanada.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-2 text-center bg-slate-950/40 rounded-lg">
                    Sin órdenes regulares subsanadas registradas.
                  </div>
                ) : (
                  omNoPrioSubsanada.slice(0, 4).map(om => (
                    <div
                      key={om.id_om}
                      onClick={() => onNavigateTab('ordenes_om')}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-cyan-900/30 hover:border-cyan-500/60 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400">{om.numero_om}</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                          {om.tipo_actividad}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {om.registros_asociados?.length || 0} reg.
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel y Filtro Rápido de Órdenes */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Panel y Filtro Rápido de Órdenes ({displayedOMList.length})
              </h3>
            </div>

            {/* Filtros Interactivos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setQuickOMFilter('TODAS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  quickOMFilter === 'TODAS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Todas ({totalOM})
              </button>
              <button
                onClick={() => setQuickOMFilter('POR_SUBSANAR')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  quickOMFilter === 'POR_SUBSANAR'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                Por subsanar ({omPorSubsanar.length})
              </button>
              <button
                onClick={() => setQuickOMFilter('SUBSANADAS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  quickOMFilter === 'SUBSANADAS'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                }`}
              >
                Subsanadas ({omSubsanadas.length})
              </button>
              <button
                onClick={() => setQuickOMFilter('PRIORITARIAS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  quickOMFilter === 'PRIORITARIAS'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                }`}
              >
                Prioritarias ({omPrioritarias.length})
              </button>
              <button
                onClick={() => setQuickOMFilter('NO_PRIORITARIAS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  quickOMFilter === 'NO_PRIORITARIAS'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                }`}
              >
                No Prioritarias ({omNoPrioritarias.length})
              </button>
            </div>
          </div>

          {/* Vista previa de las órdenes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/70 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">N° ORDEN</th>
                  <th className="px-3 py-2.5">ACTIVIDAD TÉCNICA</th>
                  <th className="px-3 py-2.5 text-center">ESTADO</th>
                  <th className="px-3 py-2.5 text-center">PRIORIDAD</th>
                  <th className="px-3 py-2.5 text-center">REGISTROS</th>
                  <th className="px-3 py-2.5">VIGENCIA</th>
                  <th className="px-3 py-2.5 text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayedOMList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                      No se encontraron órdenes de mantenimiento con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  displayedOMList.map(om => {
                    const prio = getOMPriority(om);
                    return (
                      <tr key={om.id_om} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-cyan-300">
                          {om.numero_om}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-200">
                          {om.tipo_actividad}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            om.estado === 'Subsanado'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}>
                            {om.estado === 'Subsanado' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {om.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            prio === 'PRIORITARIO'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                          }`}>
                            {prio === 'PRIORITARIO' ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                            {prio}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold text-[11px] border border-slate-700">
                            {om.registros_asociados?.length || 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                          {om.fecha_inicio} al {om.fecha_ejecucion}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => onNavigateTab('ordenes_om')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-bold transition cursor-pointer shadow-sm"
                            title="Abrir orden en módulo de Órdenes de Mantenimiento"
                          >
                            <span>Abrir</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: PUESTAS A TIERRA & TERMOGRAFÍA INFRARROJA (USER REQUESTED) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PUESTAS A TIERRA (PAT) CARD */}
        <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between ring-1 ring-emerald-500/10">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Medición de Puestas a Tierra (PAT)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                      {totalPAT} Registros
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Control de resistividad de puesta a tierra (CNE Suministro: objetivo &le; 10 &Omega;)
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('puesta_tierra')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver PAT</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick KPI stats row */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Resistencia Promedio</div>
                <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{avgResistenciaPAT} Ω</div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">&le; 10 Ω (Conforme)</div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{patConforme}</div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">&gt; 20 Ω (Crítico)</div>
                <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{patCritico}</div>
              </div>
            </div>

            {/* Resistance distribution bars */}
            <div className="space-y-2.5 mb-5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Distribución por Rangos de Resistencia Óhmica
              </span>
              {patDistribution.map(item => {
                const pct = totalPAT > 0 ? Math.round((item.count / totalPAT) * 100) : 0;
                return (
                  <div key={item.range} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.range}</span>
                      <span className="font-mono">
                        <strong className={item.textColor}>{item.count}</strong>{' '}
                        <span className="text-slate-500 text-[11px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full ${item.color} rounded-full transition-all duration-300`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Critical Grounding Structures */}
            <div>
              <span className="text-xs font-bold text-slate-300 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Estructuras Críticas con Mayor Resistencia
                </span>
                <span className="text-[10px] text-rose-400 font-semibold">Requieren Mantenimiento / Químico</span>
              </span>
              <div className="space-y-1.5">
                {topCriticalPAT.slice(0, 3).map(p => (
                  <div
                    key={p.id_pat}
                    onClick={() => onNavigateTab('puesta_tierra')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 text-xs cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {p.cod_linea} P-{p.poste_n}
                      </span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[140px] sm:max-w-none">
                        {p.material_estructura || 'Madera'} • {p.tipo_estructura || 'Alineamiento'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {p.valor_resistencia_pat.toFixed(2)} Ω
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                        ALERTA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Cumplimiento Normativo (&le; 10 Ω):</span>
            <span className="font-mono font-bold text-emerald-400">
              {totalPAT > 0 ? Math.round((patConforme / totalPAT) * 100) : 0}% en rango ideal
            </span>
          </div>
        </div>

        {/* TERMOGRAFÍA INFRARROJA CARD */}
        <div className="bg-slate-800/90 border border-rose-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between ring-1 ring-rose-500/10">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/50">
                  <Thermometer className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Inspección Termográfica Infrarroja
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                      {totalTermografias} Puntos
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cálculo de gradiente térmico (&Delta;T = T<sub>componente</sub> - T<sub>ambiente</sub>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('termografia')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Termografía</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick KPI stats row */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">&Delta;T Máximo</div>
                <div className="text-xl font-black text-rose-400 font-mono mt-0.5">+{maxDeltaT.toFixed(1)} °C</div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Temp. Máx Comp.</div>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{maxTempComponente.toFixed(1)} °C</div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Emergencias (&gt;35°C)</div>
                <div className="text-xl font-black text-rose-500 font-mono mt-0.5">{termEmergencia}</div>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal (&lt;10°C)
                </div>
                <div className="text-base font-extrabold text-white mt-1">{termNormal}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Alerta (10-35°C)
                </div>
                <div className="text-base font-extrabold text-white mt-1">{termAlerta}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Emergencia (&gt;35°C)
                </div>
                <div className="text-base font-extrabold text-white mt-1">{termEmergencia}</div>
              </div>
            </div>

            {/* Hotspots List */}
            <div>
              <span className="text-xs font-bold text-slate-300 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-rose-400" />
                  Puntos Calientes (Hotspots) Detectados
                </span>
                <span className="text-[10px] text-slate-400">Gradiente &Delta;T y Componente</span>
              </span>
              <div className="space-y-1.5">
                {topHotspots.map((t, idx) => (
                  <div
                    key={`${t.id_termografia}-${idx}`}
                    onClick={() => onNavigateTab('termografia')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 text-xs cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {t.cod_linea} P-{t.poste_n}
                      </span>
                      <span className="text-slate-300 font-medium truncate max-w-[150px] sm:max-w-none">
                        {t.componente_falla}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-mono">
                        T: {t.temp_max_componente}°C
                      </span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        t.criticidad === 'Emergencia' || (t.delta_t || 0) > 35
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : t.criticidad === 'Alerta' || (t.delta_t || 0) >= 10
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        &Delta;T +{t.delta_t}°C
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Criterio IEEE 510 / CIGRE:</span>
            <span>&Delta;T &gt; 10°C requiere revisión • &gt; 35°C acción inmediata</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: CONTROL DE PODAS Y DESPEJE DE SERVIDUMBRE (USER REQUESTED) */}
      <div className="bg-slate-800/90 border border-lime-500/30 rounded-2xl p-5 shadow-xl ring-1 ring-lime-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/70 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-lime-600 to-emerald-600 text-white shadow-md shadow-lime-600/30">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Control de Podas y Tala en Franja de Servidumbre
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-950 text-lime-300 border border-lime-700 font-semibold">
                  {totalArboles} Árboles Intervenidos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Despeje de vegetación para prevención de descargas por acercamiento y contacto con conductores energizados
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('podas')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-600 hover:bg-lime-500 text-slate-950 text-xs font-bold shadow-md shadow-lime-600/30 transition self-start sm:self-auto cursor-pointer"
          >
            <span>Ver Módulo de Podas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Species distribution */}
          <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl p-4 border border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <TreePine className="h-4 w-4 text-lime-400" />
                Desglose de Árboles Podados/Talados por Especie
              </span>
              <span className="text-xs text-lime-300 font-mono font-bold">
                {totalArboles} Total
              </span>
            </div>

            <div className="space-y-2.5">
              {speciesData.map(([specie, count]) => {
                const pct = totalArboles > 0 ? Math.round((count / totalArboles) * 100) : 0;
                return (
                  <div key={specie} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                        {specie}
                      </span>
                      <span className="font-mono">
                        <strong className="text-lime-400 font-bold">{count}</strong>{' '}
                        <span className="text-slate-500 text-[11px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${(count / maxSpeciesCount) * 100}%` }}
                        className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Podas Status & Summary */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tramos Atendidos</div>
                <div className="text-2xl font-black text-white mt-1">{totalPodas}</div>
                <div className="text-[10px] text-lime-400 mt-0.5">Zonas de servidumbre</div>
              </div>
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tasa de Ejecución</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {totalPodas > 0 ? Math.round((podasCompletadas / totalPodas) * 100) : 0}%
                </div>
                <div className="text-[10px] text-emerald-300 mt-0.5">Completadas / Verificadas</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2 text-xs">
              <div className="text-xs font-bold text-slate-200">Estado de Planes de Despeje:</div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completadas / Verificadas:</span>
                <span className="font-mono font-bold text-emerald-400">{podasCompletadas}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> En Ejecución:</span>
                <span className="font-mono font-bold text-amber-400">{podasEnEjecucion}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Programadas:</span>
                <span className="font-mono font-bold text-cyan-400">{podasProgramadas}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              💡 <strong>Distancia de seguridad:</strong> Se garantiza el despeje perimetral reglamentario mínimo de 4 a 6 metros entre las copas de árboles y los conductores de 60 kV.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: EFECTO CORONA UV & DEFICIENCIAS & DMS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Corona Multi-Phase Top Photons */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  Mediciones de Efecto Corona UV (Top Fotones por Fase)
                </h2>
                <p className="text-xs text-slate-400">
                  Estructuras con mayor nivel de conteo fotónico registradas (Cámara UV DayCor)
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('corona')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Ver todas &rarr;
              </button>
            </div>

            {/* SVG Bar Chart for Corona */}
            <div className="mt-4 space-y-3">
              {topCorona.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No hay mediciones registradas para los filtros activos.
                </div>
              ) : (
                topCorona.map((c) => {
                  const maxVal = Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0);
                  const isAlert = maxVal > 100 || c.prioridad === 'PRIORITARIO';
                  return (
                    <div key={c.id_corona} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">
                          {c.cod_linea} P-{c.poste_n}
                          {isAlert && <span className="ml-2 text-[10px] text-amber-400 font-sans font-bold">⚠️ ALERTA</span>}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          R: <strong className="text-red-400">{c.fase_r_conteo || 0}</strong> • S: <strong className="text-blue-400">{c.fase_s_conteo || 0}</strong> • T: <strong className="text-emerald-400">{c.fase_t_conteo || 0}</strong> fot/min
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
                        <div style={{ width: `${((c.fase_r_conteo || 0) / maxCoronaPhotons) * 100}%` }} className="bg-red-500 rounded-full transition-all" />
                        <div style={{ width: `${((c.fase_s_conteo || 0) / maxCoronaPhotons) * 100}%` }} className="bg-blue-500 rounded-full transition-all" />
                        <div style={{ width: `${((c.fase_t_conteo || 0) / maxCoronaPhotons) * 100}%` }} className="bg-emerald-500 rounded-full transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fase R</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Fase S</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Fase T</span>
            </div>
            <span>Límite de Alerta: &gt;100 fot/min</span>
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
                className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Detalles &rarr;
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribución de criticidad según norma de supervisión
            </p>

            {/* Donut representation */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r={radius} className="text-slate-800" strokeWidth="18" stroke="currentColor" fill="transparent" />
                  {totalDeficiencias > 0 && (
                    <>
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#EF4444"
                        strokeWidth="18"
                        strokeDasharray={`${(defPrioritarias / totalDeficiencias) * circumference} ${circumference}`}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#06B6D4"
                        strokeWidth="18"
                        strokeDasharray={`${((totalDeficiencias - defPrioritarias) / totalDeficiencias) * circumference} ${circumference}`}
                        strokeDashoffset={-((defPrioritarias / totalDeficiencias) * circumference)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-white">{totalDeficiencias}</span>
                  <span className="text-[10px] text-slate-400 uppercase">Deficiencias</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Prioritarias:</span>
              <strong className="text-red-400 font-mono font-bold">{defPrioritarias}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> No Prioritarias:</span>
              <strong className="text-cyan-400 font-mono font-bold">{totalDeficiencias - defPrioritarias}</strong>
            </div>
            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span>Pendientes de atención:</span>
              <span className="text-amber-400 font-mono font-bold">{defPendientes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
