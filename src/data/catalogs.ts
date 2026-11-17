import {
  Usuario,
  Deficiencia,
  Poda,
  Termografia,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  PuestaTierra,
  Mantenimiento,
  OrdenMantenimiento,
  TipoPosteDeficiencia,
  Contratista,
  Hidrolavado
} from '../types';

export const CATALOGO_DEFICIENCIAS_MADERA: string[] = [
  'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
  'Postes de madera requieren de instalación de refuerzos metálicos',
  'Estructura tipo H presenta fisuras en la parte inferior.',
  'Dados de concreto que protegen la base de los postes tipo H, se encuentran quebrados',
  'Se requiere embadurnar estructura de celosía',
  'Refuerzos metálicos instalados en la parte superior de los postes de madera presentan corrosión.',
  'Presencia de agujeros en las crucetas de madera. Sellar y reforzar las crucetas con rieles metálicos',
  'Presencia de agujeros de consideración en las crucetas de madera. Se deben de cambiar las crucetas.',
  'Refuerzos metálicos instalados en las crucetas de madera presentan corrosión.',
  'Presencia de agujeros en las riostras de madera tipo X.',
  'Riostras de madera tipo X presentan agujeros de consideración. Se deben de cambiar.',
  'Riostras metálicas en postes tipo H presentan corrosión.',
  'Se recomienda cambiar las varillas de retenidas en las estructuras que cumplen la función de ángulo o tipo vértice',
  'Se observa cables de retenidas destemplados.',
  'Se observa presencia de maleza que ha trepado por los cables de las retenidas hasta la parte superior de las estructuras.',
  'Cables de PAT cortados en la parte superior de los postes y crucetas de madera',
  'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
  'Se observa presencia de ramas de platanales cerca de los conductores. Se requiere podar a la brevedad. Nivel de criticidad medio',
  'Se observan cometas atrapadas en los aisladores de las estructuras.',
  'Bastidores metálicos instalados sobre las crucetas de madera, se encuentran mal instalados y propensos a caer sobre los conductores de aluminio.',
  'Se observa recorte de terreno cerca de las bases de las estructuras tipo H.',
  'Muretes de señalización de riesgo eléctrico se encuentran en mal estado. Presentan fisuras y corrosión.',
  'Carteles de código de línea y número de estructura se encuentran despintados y/o borrosos. Se deben de cambiar.',
  'Carteles de señalización de riesgo eléctrico se encuentran despintados y/o rotos. Se deben de cambiar.',
  'Se observan nidos de aves en las crucetas de madera.',
  'Aisladores poliméricos tipo suspensión presentan quemaduras por descargas eléctricas atmosféricas.',
  'Aisladores poliméricos tipo pin presentan quemaduras por descargas eléctricas atmosféricas.',
  'Se observa presencia de maleza y árboles en la base de las estructuras tipo H. Se requiere realizar limpieza y desbroce.'
];

export const CATALOGO_DEFICIENCIAS_CONCRETO: string[] = [
  'Se observa presencia de maleza y árboles en la base de las estructuras CAC. Se requiere realizar limpieza y desbroce.',
  'Postes CAC presentan fisuras longitudinales y/o transversales.',
  'Se observa recorte de terreno cerca de la base de los postes CAC.',
  'Torreta de F°G° instalada en la cabeza del poste CAC presenta corrosión.',
  'Retenidas no cuentan con canaletas de protección en la parte inferior.',
  'Cables de retenidas presentan corrosión en la parte inferior cerca al terreno.',
  'Cables de PAT cortados y/o desconectados en la base del poste CAC.',
  'Distancias mínimas de seguridad (DMS) de los conductores hacia el terreno o edificaciones no cumplen con el CNE.',
  'Se observa acercamiento de árboles de gran envergadura a la faja de servidumbre de la L-60kV. Requiere poda urgente.',
  'Estructura ubicada en zona de alto tránsito vehicular sin elementos de protección contra impactos (guardavías o muretes).',
  'Embadurnado de protección bituminosa en la base del poste CAC se encuentra deteriorado o reseco.'
];

export const CATALOGO_DEFICIENCIAS_CELOSIA: string[] = [
  'Elementos angulares de perfiles de acero de la torre presentan corrosión superficial a moderada.',
  'Falta de pernos de ajuste o pernos flojos en la estructura de celosía metálica.',
  'Presencia de maleza y vegetación densa dentro del cuadrilátero de la base de la torre de celosía.',
  'Pata de la torre presenta deformación mecánica o doblamiento de perfiles angulares por impacto externo.',
  'Placas de señalización de peligro y numeración de torre se encuentran ilegibles, oxidadas o ausentes.',
  'Puesta a tierra de torre desconectada o cable de cobre sustraído en una o más patas de la estructura.',
  'Dados de concreto de las cimentaciones de las patas de torre presentan desmoronamiento o fisuras expuestas.',
  'Dispositivos anti-escalamiento (púas/barreras) deteriorados o inexistentes en torre accesible al público.',
  'Aisladores de vidrio o porcelana en cadena presentan discos rotos, perforados o con alto nivel de polución.',
  'Amortiguadores de vibración (Stockbridge) caídos, desplazados o con cables deshilachados.',
  'Acercamiento crítico de vegetación a los conductores en vanos adyacentes a la torre de celosía.'
];

export const CATALOGO_DEFICIENCIAS_POR_TIPO: Record<TipoPosteDeficiencia, string[]> = {
  Madera: CATALOGO_DEFICIENCIAS_MADERA,
  Concreto: CATALOGO_DEFICIENCIAS_CONCRETO,
  Celosía: CATALOGO_DEFICIENCIAS_CELOSIA
};

// Default fallback for legacy compatibility
export const CATALOGO_DEFICIENCIAS: string[] = CATALOGO_DEFICIENCIAS_MADERA;

export const CATALOGO_SITUACIONES_CORONA: string[] = [
  'Operación normal',
  'Descargas parciales leves en cuello de aislador',
  'Descargas moderadas en aislador',
  'Efecto corona en grapa de suspensión',
  'Asimetría de conteo en Fase S',
  'Contaminación salina superficial',
  'Fisura micro-eléctrica en polimérico',
  'Puntos calientes simultáneos con termografía',
  'Descargas intensas con zumbido audible'
];

export const INITIAL_CONTRATISTAS: Contratista[] = [
  {
    id_contratista: 'CTR-001',
    razon_social: 'Consorcio Eléctrico del Norte S.A.C.',
    ruc: '20541234567',
    representante_legal: 'Ing. Marcos Peña Ramos',
    telefono: '+51 980 456 789',
    email: 'operaciones@cenorte.com.pe',
    especialidad: 'Mantenimiento Integral de Líneas y Estructuras',
    estado: 'Activo',
    actividades_asignadas: ['deficiencias', 'mantenimiento', 'hidrolavado', 'ordenes_om', 'dms', 'puesta_tierra'],
    lineas_asignadas: ['L-6657A', 'L-6657C', 'L-6560', 'L-6561'],
    fecha_registro: '2026-01-10'
  },
  {
    id_contratista: 'CTR-002',
    razon_social: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    ruc: '20601239871',
    representante_legal: 'Ing. Walter Grau Alama',
    telefono: '+51 990 654 321',
    email: 'contacto@spmgrau.pe',
    especialidad: 'Control de Vegetación, Podas y Desbroce de Servidumbre',
    estado: 'Activo',
    actividades_asignadas: ['podas', 'mantenimiento'],
    lineas_asignadas: ['L-6650', 'L-6652', 'L-6657C'],
    fecha_registro: '2026-01-15'
  },
  {
    id_contratista: 'CTR-003',
    razon_social: 'Electrotech del Norte E.I.R.L.',
    ruc: '20487654321',
    representante_legal: 'Ing. Jorge Luis Torres Benavides',
    telefono: '+51 963 852 741',
    email: 'contratista.electrotech@gmail.com',
    especialidad: 'Mediciones de Puesta a Tierra y Termografía Infrarroja',
    estado: 'Activo',
    actividades_asignadas: ['puesta_tierra', 'termografia', 'deficiencias'],
    lineas_asignadas: ['L-6601', 'L-6657C'],
    fecha_registro: '2026-02-01'
  }
];

export const INITIAL_USUARIOS: Usuario[] = [
  {
    id_usuario: 'USR-001',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Rivas',
    dni: '43981254',
    email: 'admin.subtransmision@empresa.com',
    telefono: '+51 984 551 223',
    username: 'admin_carlos',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-15',
    password: 'password123',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-002',
    nombres: 'Fernando',
    apellidos: 'Vargas Salazar',
    dni: '45129874',
    email: 'supervisor.vargas@empresa.com',
    telefono: '+51 971 334 890',
    username: 'sup_fernando',
    rol: 'Supervisor',
    estado: 'Activo',
    supervisor_responsable: 'Carlos Alberto Mendoza Rivas',
    lineas_asignadas: ['L-6601', 'L-6602', 'L-6603', 'L-6657A', 'L-6657C'],
    fecha_creacion: '2026-02-10',
    password: 'password123',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-003',
    nombres: 'Jorge Luis',
    apellidos: 'Torres Benavides',
    dni: '10458763',
    email: 'contratista.electrotech@gmail.com',
    telefono: '+51 963 852 741',
    username: 'cont_electrotech',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-003',
    contratista_nombre: 'Electrotech del Norte E.I.R.L.',
    supervisor_responsable: 'Fernando Vargas Salazar',
    lineas_asignadas: ['L-6601', 'L-6657C'],
    fecha_creacion: '2026-03-01',
    password: 'password123',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-004',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Vargas',
    dni: '42891045',
    email: 'admin.transmision@enosa.com.pe',
    telefono: '+51 969 123 456',
    username: 'admin',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-10',
    password: 'password123'
  },
  {
    id_usuario: 'USR-005',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Silva',
    dni: '09876543',
    email: 'cmendoza@enosa.com.pe',
    telefono: '+51 968 234 567',
    username: 'cmendoza',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6650', 'L-6652', 'L-6657A', 'L-6657B', 'L-6657C', 'L-6657D', 'L-6560', 'L-6561', 'L-6658B', 'L-6658C'],
    fecha_creacion: '2026-01-15',
    password: 'password123'
  },
  {
    id_usuario: 'USR-006',
    nombres: 'Roberto',
    apellidos: 'Díaz Flores',
    dni: '18234567',
    email: 'rdiaz@enosa.com.pe',
    telefono: '+51 972 345 678',
    username: 'rdiaz',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129', 'L-6654', 'L-6659', 'L-6758', 'L-6660', 'L-6663'],
    fecha_creacion: '2026-01-18',
    password: 'password123'
  },
  {
    id_usuario: 'USR-007',
    nombres: 'Marcos',
    apellidos: 'Peña Ramos',
    dni: '41234567',
    email: 'operaciones@cenorte.com.pe',
    telefono: '+51 980 456 789',
    username: 'cenorte',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-001',
    contratista_nombre: 'Consorcio Eléctrico del Norte S.A.C.',
    supervisor_responsable: 'Carlos Alberto Mendoza Silva',
    lineas_asignadas: ['L-6657A', 'L-6657C', 'L-6560', 'L-6561'],
    fecha_creacion: '2026-02-01',
    password: 'password123'
  },
  {
    id_usuario: 'USR-008',
    nombres: 'Walter',
    apellidos: 'Grau Alama',
    dni: '32198765',
    email: 'contacto@spmgrau.pe',
    telefono: '+51 990 654 321',
    username: 'spmgrau',
    rol: 'Contratista',
    estado: 'Activo',
    id_contratista: 'CTR-002',
    contratista_nombre: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    supervisor_responsable: 'Roberto Díaz Flores',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129'],
    fecha_creacion: '2026-02-05',
    password: 'password123'
  }
];

export const INITIAL_DEFICIENCIAS: Deficiencia[] = [
  {
    id_deficiencia: 'DEF-001',
    cod_linea: 'L-6657C',
    poste_n: '14',
    fecha_inspeccion: '2026-10-15',
    tipo_deficiencia: 'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
    descripcion: 'Se evidencian agujeros producidos por pájaros carpinteros en cabeza de poste.',
    prioridad: 'PRIORITARIO',
    evidencia_fotografica: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
    observaciones: 'Requiere instalación de cobertor y reforzado con abrazadera metálica.',
    usuario_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'En atención'
  },
  {
    id_deficiencia: 'DEF-002',
    cod_linea: 'L-6657C',
    poste_n: '46',
    fecha_inspeccion: '2026-10-18',
    tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
    descripcion: 'Puesta a tierra sulfatada con empalme artesanal sin conector tipo split bolt.',
    prioridad: 'PRIORITARIO',
    evidencia_fotografica: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
    observaciones: 'Reponer conductor de cobre de 35mm² y soldadura exotérmica.',
    usuario_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'Pendiente de revisión'
  },
  {
    id_deficiencia: 'DEF-003',
    cod_linea: 'L-6665A',
    poste_n: '33',
    fecha_inspeccion: '2026-10-20',
    tipo_deficiencia: 'Predios no cumplen con DMS e invaden la F.S.',
    descripcion: 'Construcción clandestina de vivienda de dos pisos dentro de la franja de servidumbre a 2.8m del conductor.',
    prioridad: 'PRIORITARIO',
    evidencia_fotografica: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    observaciones: 'Notificado a asesoría legal y fiscalización municipal.',
    usuario_responsable: 'Ing. Roberto Díaz Flores',
    estado: 'Registrada'
  },
  {
    id_deficiencia: 'DEF-004',
    cod_linea: 'L-129',
    poste_n: '28',
    fecha_inspeccion: '2026-10-10',
    tipo_deficiencia: 'Se observa presencia de ramas de platanales cerca de los conductores. Se requiere podar a la brevedad. Nivel de criticidad medio',
    descripcion: 'Cultivo de plátanos con hojas alcanzando la zona de guardia a menos de 1.5 metros.',
    prioridad: 'NO PRIORITARIO',
    evidencia_fotografica: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
    observaciones: 'Poda ejecutada conforme por cuadrilla.',
    usuario_responsable: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    estado: 'Corregida',
    fecha_cierre: '2026-10-22'
  }
];


export const INITIAL_TERMOGRAFIA: Termografia[] = [
  {
    id_termografia: 'TRM-001',
    cod_linea: 'L-6657C',
    poste_n: '7',
    tipo_armado: 'A',
    conductor_calibre: 'AAAC 240',
    conductor_n_fases: '3',
    nivel_tension: '60 kV',
    tipo_zona: 'Rural - Agrícola',
    temp_ambiente: 29.5,
    temp_max_componente: 54.2,
    emisividad: 0.95,
    delta_t: 24.7,
    hora: '11:45',
    fecha: '2026-10-12',
    componente_falla: 'Grapa de suspensión Fase T',
    comentario: 'Calentamiento localizado por falso contacto en perno de ajuste.',
    criticidad: 'Alerta',
    prioridad: 'PRIORITARIO',
    evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    inspector: 'Ing. Carlos Mendoza Silva'
  },
  {
    id_termografia: 'TRM-002',
    cod_linea: 'L-6665A',
    poste_n: '1',
    tipo_armado: 'AD',
    conductor_calibre: 'AAAC 240',
    conductor_n_fases: '3',
    nivel_tension: '60 kV',
    tipo_zona: 'Costa - Salina',
    temp_ambiente: 28.0,
    temp_max_componente: 31.2,
    emisividad: 0.95,
    delta_t: 3.2,
    hora: '10:15',
    fecha: '2026-10-16',
    componente_falla: 'Puente de paso Fase R',
    comentario: 'Temperatura en régimen nominal.',
    criticidad: 'Normal',
    prioridad: 'NO PRIORITARIO',
    evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    inspector: 'Ing. Roberto Díaz Flores'
  }
];

export const INITIAL_PODAS: Poda[] = [
  {
    id_poda: 'POD-001',
    cod_linea: 'L-6657C',
    poste_n: '12',
    tipo_armado: 'A',
    tipo_aislador: 'polimérico',
    nivel_tension_kv: '60',
    fecha_ejecucion: '2026-10-14',
    ubicacion_referencia: 'Km 18 Carretera Piura - Chulucanas',
    punto_inicial: 'Sum. 45091',
    punto_final: 'Sum. 45110',
    algarrobo: 6,
    palmera: 2,
    ornamental: 0,
    tamarindo: 1,
    ponceana: 0,
    otros: 3,
    total_arboles: 12,
    observaciones: 'Despeje de 4 metros perimetrales con respecto a conductores.',
    prioridad: 'PRIORITARIO',
    fotografias: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    ],
    contratista_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'Completada'
  },
  {
    id_poda: 'POD-002',
    cod_linea: 'L-129',
    poste_n: '35',
    tipo_armado: 'AD',
    tipo_aislador: 'polimérico',
    nivel_tension_kv: '33',
    fecha_ejecucion: '2026-10-21',
    ubicacion_referencia: 'Caserío San Isidro - Corrales',
    punto_inicial: 'Sum. 88120',
    punto_final: 'Sum. 88145',
    algarrobo: 10,
    palmera: 4,
    ornamental: 1,
    tamarindo: 0,
    ponceana: 2,
    otros: 0,
    total_arboles: 17,
    observaciones: 'Tala y poda de ramas secas con peligro de caída sobre línea.',
    prioridad: 'NO PRIORITARIO',
    fotografias: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    ],
    contratista_responsable: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    estado: 'Verificada'
  }
];

export const INITIAL_MANTENIMIENTO: Mantenimiento[] = [
  {
    id_mantenimiento: 'MNT-0001',
    cod_linea: 'L-6657C',
    poste_n: '14',
    fecha_ejecucion: '2026-10-19',
    tipo_mantenimiento: 'Correctivo',
    actividad_realizada: 'Instalación de refuerzos metálicos y abrazaderas en cabeza de poste de madera',
    orden_mantenimiento: 'OM-2026-001',
    observaciones: 'Refuerzo instalado conforme ante presencia de agujeros.',
    prioridad: 'PRIORITARIO',
    fotografias: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'],
    contratista_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'Finalizado'
  },
  {
    id_mantenimiento: 'MNT-0002',
    cod_linea: 'L-6561',
    poste_n: '39',
    fecha_ejecucion: '2026-10-25',
    tipo_mantenimiento: 'Correctivo',
    actividad_realizada: 'Mejoramiento de sistema de puesta a tierra con contrapesos y gel conductivo',
    orden_mantenimiento: 'OM-2026-002',
    observaciones: 'Reducción de resistencia de puesta a tierra a menos de 5 ohmios.',
    prioridad: 'PRIORITARIO',
    fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'],
    contratista_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'En Proceso'
  }
];

export const INITIAL_ORDENES_MANTENIMIENTO: OrdenMantenimiento[] = [
  {
    id_om: 'OM-ID-001',
    numero_om: 'OM-2026-001',
    fecha_inicio: '2026-10-18',
    fecha_ejecucion: '2026-10-22',
    estado: 'Subsanado',
    tipo_actividad: 'Deficiencias Técnicas',
    responsable: 'Consorcio Eléctrico del Norte',
    observaciones: 'Atención prioritaria de deficiencias estructurales en cabezas de postes de madera.',
    fecha_registro: '2026-10-18',
    registros_asociados: [
      {
        id_registro: 'DEF-001',
        cod_linea: 'L-6657C',
        poste_n: '14',
        descripcion: 'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
        prioridad: 'PRIORITARIO',
        tipo_actividad: 'Deficiencias Técnicas',
        estado_original: 'En atención'
      }
    ]
  },
  {
    id_om: 'OM-ID-002',
    numero_om: 'OM-2026-002',
    fecha_inicio: '2026-10-24',
    fecha_ejecucion: '2026-10-30',
    estado: 'Por subsanar',
    tipo_actividad: 'Puesta a Tierra',
    responsable: 'Consorcio Eléctrico del Norte',
    observaciones: 'Campaña de levantamiento de valores PAT mayores a 5.0 Ohmios en L-129 y L-6561.',
    fecha_registro: '2026-10-24',
    registros_asociados: [
      {
        id_registro: 'PAT-001',
        cod_linea: 'L-129',
        poste_n: '4',
        descripcion: 'Medición PAT 22.30 Ω superior al umbral admisible (5.0 Ω)',
        prioridad: 'PRIORITARIO',
        tipo_actividad: 'Puesta a Tierra',
        estado_original: 'Pendiente'
      },
      {
        id_registro: 'PAT-006',
        cod_linea: 'L-6561',
        poste_n: '39',
        descripcion: 'Medición PAT 11.25 Ω superior al umbral admisible (5.0 Ω)',
        prioridad: 'PRIORITARIO',
        tipo_actividad: 'Puesta a Tierra',
        estado_original: 'Pendiente'
      }
    ]
  },
  {
    id_om: 'OM-ID-003',
    numero_om: 'OM-2026-003',
    fecha_inicio: '2026-11-01',
    fecha_ejecucion: '2026-11-15',
    estado: 'Por subsanar',
    tipo_actividad: 'Control de Podas',
    responsable: 'Servicios de Poda y Mantenimiento Grau S.A.C.',
    observaciones: 'Poda programada de servidumbre en tramos de media densidad arbórea.',
    fecha_registro: '2026-11-01',
    prioridad: 'NO PRIORITARIO',
    registros_asociados: [
      {
        id_registro: 'POD-001',
        cod_linea: 'L-6657C',
        poste_n: '12',
        descripcion: 'Poda programada: 12 árboles en tramo rural',
        prioridad: 'NO PRIORITARIO',
        tipo_actividad: 'Control de Podas',
        estado_original: 'Programada'
      }
    ]
  },
  {
    id_om: 'OM-ID-004',
    numero_om: 'OM-2026-004',
    fecha_inicio: '2026-10-10',
    fecha_ejecucion: '2026-10-16',
    estado: 'Subsanado',
    tipo_actividad: 'Mantenimiento de Postes',
    responsable: 'Consorcio Eléctrico del Norte',
    observaciones: 'Mantenimiento preventivo rutinario de herrajes y retensado.',
    fecha_registro: '2026-10-10',
    prioridad: 'NO PRIORITARIO',
    registros_asociados: [
      {
        id_registro: 'MNT-0001',
        cod_linea: 'L-6657C',
        poste_n: '14',
        descripcion: 'Mantenimiento preventivo de crucetas y herrajes',
        prioridad: 'NO PRIORITARIO',
        tipo_actividad: 'Mantenimiento de Postes',
        estado_original: 'Finalizado'
      }
    ]
  }
];

export const INITIAL_DMS: DMSItem[] = [
  {
    id_dms: 'DMS-2026-001',
    cod_linea: 'L-6657C',
    poste_n: '24',
    codigo_dms: 'OSINERGMIN-PIU-0182',
    descripcion: 'Edificación invade franja de servidumbre a 2.45m del conductor más cercano en vano 24-25.',
    fecha_identificacion: '2026-09-12',
    prioridad: 'PRIORITARIO',
    fuente: 'OSINERGMIN',
    orden_servicio: 'OS-88491-2026',
    estado: 'En Levantamiento',
    observaciones: 'Se notificó a la municipalidad y se tramita modificación de traza o elevación de poste.',
    evidencias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
  },
  {
    id_dms: 'DMS-2026-002',
    cod_linea: 'L-6561',
    poste_n: '78',
    codigo_dms: 'OSINERGMIN-PIU-0199',
    descripcion: 'Cartel publicitario metálico instalado a 2.10m de fase inferior.',
    fecha_identificacion: '2026-09-20',
    prioridad: 'PRIORITARIO',
    fuente: 'Inspección Interna',
    orden_servicio: 'OS-88510-2026',
    estado: 'Levantada',
    observaciones: 'Panel retirado por la contratista. Pendiente de inspección de cierre.',
    evidencias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']
  }
];

export const INITIAL_LEVANTAMIENTOS: LevantamientoDMS[] = [
  {
    id_levantamiento: 'LEV-001',
    id_dms: 'DMS-2026-002',
    cod_linea: 'L-6561',
    poste_n: '78',
    fecha_ejecucion: '2026-10-18',
    descripcion_trabajo: 'Desmontaje de estructura metálica de publicidad no autorizada y reposición de señalética de seguridad.',
    orden_servicio: 'OS-88510-2026',
    fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80'],
    observaciones: 'Trabajo culminado sin incidentes, franja de servidumbre despejada a 6.5 metros.',
    contratista_responsable: 'Consorcio Eléctrico del Norte',
    estado: 'Registrado'
  }
];

export const INITIAL_INSPECCIONES_CIERRE: InspeccionCierreDMS[] = [];

const DRIVE_PHOTO_FOLDER = 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link';

export const INITIAL_PUESTA_TIERRA: PuestaTierra[] = [
  { id_pat: 'PAT-001', item: 1, cod_linea: 'L-129', poste_n: '4', utm_este: '544609', utm_norte: '9597877', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 22.30, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-002', item: 2, cod_linea: 'L-129', poste_n: '7', utm_este: '544969', utm_norte: '9597811', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 9.66, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-003', item: 3, cod_linea: 'L-129', poste_n: '17', utm_este: '546868', utm_norte: '9597998', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 15.85, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-004', item: 4, cod_linea: 'L-129', poste_n: '58', utm_este: '554669', utm_norte: '9600727', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 10.67, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-005', item: 5, cod_linea: 'L-129', poste_n: '59', utm_este: '554769', utm_norte: '9600827', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 15.91, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-006', item: 6, cod_linea: 'L-6561', poste_n: '39', utm_este: '532305', utm_norte: '9412699', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 11.25, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-007', item: 7, cod_linea: 'L-6561', poste_n: '44', utm_este: '532359', utm_norte: '9412065', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 1.07, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-008', item: 8, cod_linea: 'L-6561', poste_n: '46', utm_este: '532265', utm_norte: '9411709', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 1.54, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-009', item: 9, cod_linea: 'L-6561', poste_n: '47', utm_este: '532231', utm_norte: '9411508', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 2.08, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-010', item: 10, cod_linea: 'L-6561', poste_n: '67', utm_este: '531212', utm_norte: '9408321', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 1.23, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-011', item: 11, cod_linea: 'L-6561', poste_n: '74', utm_este: '531053', utm_norte: '9407479', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 8.79, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-012', item: 12, cod_linea: 'L-6561', poste_n: '75', utm_este: '531034', utm_norte: '9407433', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 6.94, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-013', item: 13, cod_linea: 'L-6561', poste_n: '76', utm_este: '531005', utm_norte: '9407369', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 9.49, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-014', item: 14, cod_linea: 'L-6561', poste_n: '77', utm_este: '530978', utm_norte: '9407300', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 1.58, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-015', item: 15, cod_linea: 'L-6561', poste_n: '78', utm_este: '530896', utm_norte: '9407116', tipo_estructura: 'Angulo', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 2.30, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-016', item: 16, cod_linea: 'L-6561', poste_n: '79', utm_este: '530709', utm_norte: '9407061', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 0.25, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-017', item: 17, cod_linea: 'L-6561', poste_n: '80', utm_este: '530541', utm_norte: '9407011', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 24.60, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-018', item: 18, cod_linea: 'L-6561', poste_n: '81', utm_este: '530395', utm_norte: '9406968', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 53.00, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-019', item: 19, cod_linea: 'L-6561', poste_n: '95', utm_este: '528801', utm_norte: '9404857', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 25.30, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-020', item: 20, cod_linea: 'L-6561', poste_n: '122', utm_este: '526296', utm_norte: '9402747', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 6.22, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-021', item: 21, cod_linea: 'L-6650', poste_n: '5', utm_este: '534060', utm_norte: '9428553', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 12.64, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-022', item: 22, cod_linea: 'L-6657A', poste_n: '2', utm_este: '533509', utm_norte: '9429007', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Set-23', valor_resistencia_pat: 3.77, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-023', item: 23, cod_linea: 'L-6657C', poste_n: '31', utm_este: '549720', utm_norte: '9428123', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 22.36, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-024', item: 24, cod_linea: 'L-6657C', poste_n: '39', utm_este: '551549', utm_norte: '9428675', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-23', valor_resistencia_pat: 23.18, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-025', item: 25, cod_linea: 'L-6659', poste_n: '6', utm_este: '488449', utm_norte: '9437547', tipo_estructura: 'Anclaje', material_estructura: 'CAC', fecha_medicion: 'Set-22', valor_resistencia_pat: 25.02, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-026', item: 26, cod_linea: 'L-6659', poste_n: '8', utm_este: '488268', utm_norte: '9437319', tipo_estructura: 'Angulo', material_estructura: 'CAC', fecha_medicion: 'Set-22', valor_resistencia_pat: 11.07, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-027', item: 27, cod_linea: 'L-6659', poste_n: '17', utm_este: '487304', utm_norte: '9436539', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Set-22', valor_resistencia_pat: 23.78, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-028', item: 28, cod_linea: 'L-6662', poste_n: '90', utm_este: '535310', utm_norte: '9456942', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 24.60, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-029', item: 29, cod_linea: 'L-6662', poste_n: '91', utm_este: '535477', utm_norte: '9456981', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 22.36, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-030', item: 30, cod_linea: 'L-6662', poste_n: '92', utm_este: '535563', utm_norte: '9457002', tipo_estructura: 'CD', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 23.45, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-031', item: 31, cod_linea: 'L-6662', poste_n: '93', utm_este: '535622', utm_norte: '9456977', tipo_estructura: 'Anclaje', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 24.63, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-032', item: 32, cod_linea: 'L-6665A', poste_n: '4', utm_este: '544726', utm_norte: '9597466', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 9.90, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-033', item: 33, cod_linea: 'L-6665A', poste_n: '7', utm_este: '545459', utm_norte: '9597353', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 1.12, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-034', item: 34, cod_linea: 'L-6665A', poste_n: '10', utm_este: '546119', utm_norte: '9597405', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 18.33, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-035', item: 35, cod_linea: 'L-6665A', poste_n: '77', utm_este: '562795', utm_norte: '9603163', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 6.11, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-036', item: 36, cod_linea: 'L-6665A', poste_n: '1 (DT)', utm_este: '562590', utm_norte: '9603372', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 3.05, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-037', item: 37, cod_linea: 'L-6698', poste_n: '128', utm_este: '535605', utm_norte: '9456633', tipo_estructura: 'Angulo', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 7.59, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-038', item: 38, cod_linea: 'L-6698', poste_n: '129', utm_este: '535677', utm_norte: '9456732', tipo_estructura: 'Angulo', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 3.68, prioridad: 'NO PRIORITARIO', alerta_deficiencia: false, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-039', item: 39, cod_linea: 'L-6665A', poste_n: '11', utm_este: '564346', utm_norte: '9605551', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 14.51, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-040', item: 40, cod_linea: 'L-6766', poste_n: '15', utm_este: '564811', utm_norte: '9606308', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 23.90, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-041', item: 41, cod_linea: 'L-6766', poste_n: '16', utm_este: '564901', utm_norte: '9606441', tipo_estructura: 'Alineamiento', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 5.34, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-042', item: 42, cod_linea: 'L-6698', poste_n: '67', utm_este: '533453', utm_norte: '9444565', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 5.91, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-043', item: 43, cod_linea: 'L-6698', poste_n: '68', utm_este: '533474', utm_norte: '9444806', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 21.83, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-044', item: 44, cod_linea: 'L-6698', poste_n: '78', utm_este: '533579', utm_norte: '9447060', tipo_estructura: 'Alineamiento', material_estructura: 'CAC', fecha_medicion: 'Ag -22', valor_resistencia_pat: 9.05, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-045', item: 45, cod_linea: 'L-6665A', poste_n: '12', utm_este: '546781', utm_norte: '9597775', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 24.96, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' },
  { id_pat: 'PAT-046', item: 46, cod_linea: 'L-6665A', poste_n: '11', utm_este: '546456', utm_norte: '9597586', tipo_estructura: 'Anclaje', material_estructura: 'Madera', fecha_medicion: 'Set-25', valor_resistencia_pat: 16.28, prioridad: 'PRIORITARIO', alerta_deficiencia: true, evidencia_url: DRIVE_PHOTO_FOLDER, responsable: 'Consorcio Eléctrico del Norte' }
];

export const INITIAL_HIDROLAVADO: Hidrolavado[] = [
  {
    id_hidrolavado: 'HID-001',
    cod_linea: 'L-6657C',
    poste_n: '21',
    tipo_armado: 'A',
    tipo_aislador: 'Polimérico',
    nivel_tension_kv: '60',
    fecha_ejecucion: '2026-10-22',
    metodo_lavado: 'En Caliente (Línea Energizada)',
    agua_utilizada_litros: 180,
    conductividad_agua_us: 18,
    presion_psi: 650,
    nivel_contaminacion: 'Crítico (Salino)',
    prioridad: 'PRIORITARIO',
    estado: 'Completado',
    contratista_responsable: 'Consorcio Eléctrico del Norte S.A.C.',
    orden_mantenimiento: 'OM-2026-014',
    observaciones: 'Lavado a alta presión de aisladores poliméricos con agua desmineralizada (< 50 µS/cm) por acumulación salina costera.',
    fotografias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
  },
  {
    id_hidrolavado: 'HID-002',
    cod_linea: 'L-6561',
    poste_n: '45',
    tipo_armado: 'H',
    tipo_aislador: 'Porcelana',
    nivel_tension_kv: '60',
    fecha_ejecucion: '2026-10-25',
    metodo_lavado: 'En Frío (Línea Desenergizada)',
    agua_utilizada_litros: 220,
    conductividad_agua_us: 24,
    presion_psi: 580,
    nivel_contaminacion: 'Alto',
    prioridad: 'NO PRIORITARIO',
    estado: 'Verificado',
    contratista_responsable: 'Consorcio Eléctrico del Norte S.A.C.',
    orden_mantenimiento: 'OM-2026-018',
    observaciones: 'Limpieza integral de cadenas de suspensión y herrajes en zona agrícola.',
    fotografias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']
  }
];


