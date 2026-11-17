import React, { useState, useMemo } from 'react';
import {
  Camera,
  Search,
  Filter,
  ExternalLink,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle,
  Eye,
  Plus
} from 'lucide-react';
import { EvidenciaFotografica, LineaSubtransmision, Usuario } from '../types';
import { storageService } from '../services/storageService';

interface EvidenciasViewProps {
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const EvidenciasView: React.FC<EvidenciasViewProps> = ({
  lineas,
  currentUser,
  selectedLine,
  onSelectLine,
  onOpenPhoto
}) => {
  const [selectedActivity, setSelectedActivity] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample and recorded photographic evidences
  const defaultEvidencias: EvidenciaFotografica[] = useMemo(() => [
    {
      id_evidencia: 'EVI-001',
      id_actividad: 'DEF-001',
      tipo_actividad: 'Deficiencia',
      cod_linea: 'L-6657C',
      poste_n: '14',
      drive_file_id: 'DRV_FILE_01',
      enlace_drive: 'https://drive.google.com/file/d/DRV_FILE_01/view',
      tipo_foto: 'Antes',
      fecha_registro: '2026-10-15 11:20:00',
      usuario_responsable: 'Consorcio Eléctrico del Norte',
      descripcion: 'Agujero por aves en parte superior de poste de madera tipo H.',
      url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80'
    },
    {
      id_evidencia: 'EVI-002',
      id_actividad: 'COR-0001',
      tipo_actividad: 'Efecto Corona',
      cod_linea: 'L-6657C',
      poste_n: '1',
      drive_file_id: 'DRV_FILE_02',
      enlace_drive: 'https://drive.google.com/file/d/DRV_FILE_02/view',
      tipo_foto: 'UV_Corona',
      fecha_registro: '2026-10-16 11:26:00',
      usuario_responsable: 'Equipo UV',
      descripcion: 'Captura con cámara UV de cuello de aislador polimérico (44 fot/min).',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'
    },
    {
      id_evidencia: 'EVI-003',
      id_actividad: 'TRM-001',
      tipo_actividad: 'Termografía',
      cod_linea: 'L-6657C',
      poste_n: '7',
      drive_file_id: 'DRV_FILE_03',
      enlace_drive: 'https://drive.google.com/file/d/DRV_FILE_03/view',
      tipo_foto: 'Termograma',
      fecha_registro: '2026-10-12 11:45:00',
      usuario_responsable: 'Ing. Carlos Mendoza',
      descripcion: 'Termograma con punto caliente de 54.2°C en grapa Fase T.',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
    },
    {
      id_evidencia: 'EVI-004',
      id_actividad: 'POD-001',
      tipo_actividad: 'Poda',
      cod_linea: 'L-6657C',
      poste_n: '12',
      drive_file_id: 'DRV_FILE_04',
      enlace_drive: 'https://drive.google.com/file/d/DRV_FILE_04/view',
      tipo_foto: 'Después',
      fecha_registro: '2026-10-14 16:30:00',
      usuario_responsable: 'Consorcio Eléctrico del Norte',
      descripcion: 'Franja de servidumbre despejada tras poda de algarrobos y palmeras.',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    },
    {
      id_evidencia: 'EVI-005',
      id_actividad: 'DMS-002',
      tipo_actividad: 'DMS',
      cod_linea: 'L-6561',
      poste_n: '78',
      drive_file_id: 'DRV_FILE_05',
      enlace_drive: 'https://drive.google.com/file/d/DRV_FILE_05/view',
      tipo_foto: 'Antes',
      fecha_registro: '2026-09-20 10:00:00',
      usuario_responsable: 'Ing. Carlos Mendoza',
      descripcion: 'Cartel publicitario instalado a 2.10m de conductores sin respetar DMS.',
      url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'
    }
  ], []);

  const allEvidencias = useMemo(() => {
    return [...defaultEvidencias, ...storageService.getEvidencias()];
  }, [defaultEvidencias]);

  const filteredList = useMemo(() => {
    return allEvidencias.filter(e => {
      const matchLine = selectedLine === 'TODAS' || e.cod_linea === selectedLine;
      const matchAct = selectedActivity === 'TODAS' || e.tipo_actividad === selectedActivity;
      const matchSearch =
        e.poste_n.includes(searchTerm) ||
        e.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.usuario_responsable.toLowerCase().includes(searchTerm.toLowerCase());

      return matchLine && matchAct && matchSearch;
    });
  }, [allEvidencias, selectedLine, selectedActivity, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Repositorio de Evidencias Fotográficas en Google Drive</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {filteredList.length} archivos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Estructura Drive: SISTEMA_SUBTRANSMISION / [LINEA] / [POSTE] / [ACTIVIDAD] / fotos
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Línea:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-cyan-300 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas las Líneas</option>
              {lineas.map(l => (
                <option key={l.id_linea} value={l.cod_linea}>{l.cod_linea} - {l.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Módulo / Actividad:</span>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
            >
              <option value="TODAS">Todas las Actividades</option>
              <option value="Deficiencia">Deficiencias</option>
              <option value="Efecto Corona">Efecto Corona (UV)</option>
              <option value="Termografía">Termografía</option>
              <option value="Poda">Podas</option>
              <option value="DMS">DMS</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por poste, descripción..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Grid of Photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            No se encontraron evidencias fotográficas para los filtros seleccionados.
          </div>
        ) : (
          filteredList.map((ev) => (
            <div
              key={ev.id_evidencia}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg group hover:border-cyan-500/50 transition flex flex-col justify-between"
            >
              <div>
                {/* Image Preview with Hover Action */}
                <div className="relative h-44 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => onOpenPhoto && onOpenPhoto(ev.url, `${ev.cod_linea} P-${ev.poste_n} - ${ev.tipo_actividad}`)}>
                  <img
                    src={ev.url}
                    alt={ev.descripcion}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 border border-slate-700">
                      {ev.cod_linea} P-{ev.poste_n}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/90 text-blue-300 border border-blue-800">
                      {ev.tipo_actividad}
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700 font-mono">
                    {ev.tipo_foto}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3.5">
                  <p className="text-xs text-slate-200 line-clamp-2 font-medium mb-2">
                    {ev.descripcion}
                  </p>
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <div>Responsable: <strong className="text-slate-300">{ev.usuario_responsable}</strong></div>
                    <div>Fecha: {ev.fecha_registro}</div>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="p-3 pt-0 border-t border-slate-700/50 mt-2 flex items-center justify-between text-xs">
                <button
                  onClick={() => onOpenPhoto && onOpenPhoto(ev.url, `${ev.cod_linea} P-${ev.poste_n}`)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ampliar</span>
                </button>

                <a
                  href={ev.enlace_drive || 'https://drive.google.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-400 hover:text-white"
                  title="Abrir en Google Drive"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Google Drive</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
