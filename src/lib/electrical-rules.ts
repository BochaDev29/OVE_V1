// electrical-rules.ts - Motor de Ingeniería OVE (Versión 3.1 - CSV Integration)
// Cumple con: AEA 90364-7-770, 771 y Res. 54/2018 (Córdoba)
// Soporta carga de datos desde CSV con sistema de fallback robusto

import csvLoader, { CSVData } from './csv-loader';

// === DEFINICIÓN DE TIPOS Y ESTRUCTURAS ===

export type ComponentNature = 'relevado' | 'proyectado';

export interface LineLink {
  method: string;            // Código IRAM (B1, B2, D1, etc.)
  length: number;            // Longitud real en metros
  material: 'Cu' | 'Al';
  section: number;           // Sección en mm²
  groupingCount: number;     // Cantidad de circuitos agrupados
  ambientTemp: number;       // Temperatura ambiente (°C)
  conduitMaterial: 'PVC' | 'Metal'; // Material de canalización
  conduitDiameter?: string;  // Diámetro de cañería (NUEVO)
  notes?: string;            // Detalles de la instalación de la línea (NUEVO)
  sourcePhase?: 'R' | 'S' | 'T';  // 🆕 Fase de alimentación (para tableros 220V desde padre 380V)
  sourceProtectionId?: string;    // 🆕 ID de la protección del tablero padre que alimenta esta línea
  iz?: number;               // Corriente admisible determinada por tablas
  vdrop?: number;            // Caída de tensión en este tramo (%)
  nature?: ComponentNature;  // 🆕 Naturaleza: relevado o proyectado
}

// === Protección de Cabecera ===
export interface ProtectionHeader {
  id: string;                          // UUID único
  name: string;                        // Nombre descriptivo (ej: "PIA Fase R")
  type: 'PIA' | 'ID';                  // Tipo de protección
  rating: number;                      // Amperaje (10, 16, 20, 25, 32, 40, 63)
  poles: '2P' | '4P';                  // Polos
  phase?: 'R' | 'S' | 'T' | 'RST';    // Fase(s) que protege
  curve?: 'B' | 'C' | 'D';             // Curva de disparo (solo PIA)
  sensitivity?: '30mA' | '300mA';      // Sensibilidad (solo ID)
  breakingCapacity?: '3kA' | '4.5kA' | '6kA' | '10kA'; // Poder de corte

  // 🆕 NUEVO: Jerarquía de protecciones
  parentProtectionId?: string;         // ID de la protección que alimenta a esta (ej: ID alimentado por PIA)
  nature?: ComponentNature;            // 🆕 Naturaleza: relevado o proyectado
}

export interface PanelPhysicalData {
  locationRef?: string;      // Ej: "Pasillo PB", "Gabinete bajo pilar"
  height?: number;           // Altura de montaje (m)
  groundingLocation?: string; // Ej: "Jardín frontal", "Bajo vereda"
  details?: string;          // Detalles adicionales (NUEVO)
}

export interface Panel {
  id: string;
  name: string;
  type: 'TP' | 'TSG' | 'TS';  // TP: Tablero Principal, TSG: Tablero Seccional General, TS: Tablero Seccional
  parentId?: string;
  voltage: '220V' | '380V';
  phase?: 'R' | 'S' | 'T' | 'RST';
  feederDistance: number;    // Legacy, se reemplazará por incomingLine.length
  installationType: 'Embutido' | 'Exterior' | 'Cielorraso' | 'Enterrado';
  results?: PanelCalculationResult;
  nature?: ComponentNature;  // 🆕 Naturaleza: relevado o proyectado

  // === ÁRBOL DE DISTRIBUCIÓN (NUEVO V3) ===
  physicalData?: PanelPhysicalData;
  incomingLine?: LineLink;
  preexistingVDrop?: number; // Para proyectos que inician en TSG (Edificios)
  isOrigin?: boolean;        // Identifica si este panel es el EntryPoint del proyecto

  // Propiedades Legacy (Mantener para compatibilidad mientras se migra)

  // Propiedades de Línea Principal (LP) y Circuito Seccional (CS) (NUEVO V2)
  mainLine?: {
    section: number;
    material: 'Cu' | 'Al';
    method: string;
  };
  sectionalLine?: {
    section: number;
    material: 'Cu' | 'Al';
    method: string;
  };

  protections?: {
    headers: ProtectionHeader[];         // Array de protecciones de cabecera (V3)

    // Legacy support (V2)
    hasPIA?: boolean;
    piaRating?: number;
    piaPoles?: '2P' | '4P';
    hasID?: boolean;
    idPoles?: '2P' | '4P';
    mainHeaderType?: 'PIA' | 'ID';
  };

  // === NUEVO V3: Sistema de Puesta a Tierra ===
  grounding?: {
    hasPAT: boolean;           // ¿Este tablero tiene conexión a jabalina?
    patType?: 'PAT_SIMPLE' | 'PAT_REFORZADO' | 'PAT_EDIFICIO';  // Tipo de PAT
    patResistance?: number;    // Resistencia de PAT medida (Ohms)
    conduitDiameter?: string;  // Diámetro de cañería para PAT (ej: "Ø 19mm")
    method?: string;           // Método de instalación (B1, B2, D1, etc.)

    // 🆕 Materiales Normativos (para documentación técnica)
    materials?: {
      cablePAT?: {
        section: number;       // Sección del cable PAT (mm²) - Mínimo 4mm²
        standard: string;      // Normativa (IRAM NM 247-3)
        color: string;         // Verde-Amarillo
      };
      tomacable?: {
        hasCompliantClamp: boolean;  // ¿Tiene tomacable IRAM 2343?
        standard: string;              // IRAM 2343
      };
      jabalina?: {
        hasCompliantRod: boolean;    // ¿Tiene jabalina IRAM 2309?
        standard: string;              // IRAM 2309
      };
      inspectionBox?: {
        hasBox: boolean;               // ¿Tiene caja de inspección?
        material: string;              // PVC con tapa removible
      };
    };
  };

  enclosure?: {
    mountingType: 'embutido' | 'sobrepuesto';  // Tipo de montaje
    ipRating: 'IP20' | 'IP40' | 'IP41' | 'IP44' | 'IP54' | 'IP55' | 'IP65';  // Grado de protección
    modules?: number;          // Cantidad de módulos/polos (4, 8, 12, 16, 24)
    material?: 'plastico' | 'metalico' | 'PVC-doble aislacion' | 'Chapa-doble aislacion';  // Material del gabinete
  };

  // === NUEVO V3: Derivaciones ===
  derivations?: {
    hasDerivationBar: boolean;  // ¿Tiene bornera de derivación?
    outputCount?: number;       // Cantidad de salidas desde este tablero
  };

  // Campos para instalaciones existentes (Res. 54/2018)
  existingPIA?: {
    amperes: number;
    poles: '2P' | '4P';
  };
  existingID?: {
    amperes: number;
    sensitivity: '30mA' | '300mA';
  };

  // 🆕 Soporte para validaciones de circuitos en Step 3
  circuits?: CircuitSummary[];
}

export type CEspSubtype = 'ACU' | 'MBTF' | 'APM' | 'ATE' | 'MBTS' | 'ITE' | 'OCE' | 'AVP';

export interface SpecialLoad {
  id: string;
  name: string;
  type: CEspSubtype | 'TUE';
  value: number;
  unit: 'VA' | 'W';
  bocas?: number;
  tension?: '220V' | '380V';
  // 🆕 Soporte Trifásico
  isThreePhase?: boolean;  // true = circuito trifásico (4 hilos R-S-T-N)
  nature?: ComponentNature; // 🆕 Naturaleza: relevado o proyectado
}

export interface EnvironmentCalculation {
  id: string;
  name: string;
  width?: number;
  length?: number;
  surface: number;
  lights: number;
  regularOutlets: number;
  specialLoads?: SpecialLoad[];
  panelId: string;
  assignedIugCircuit?: string;
  assignedTugCircuit?: string;
  specialOutlets?: number;
  customName?: string;

  // Campos para instalaciones RELEVADAS (Auditoría)
  bocasLuzRelevado?: number;    // Bocas de luz RELEVADAS (ya existentes)
  bocasLuzProyectado?: number;  // Bocas de luz PROYECTADAS (nuevas)
  bocasTomasRelevado?: number;  // Bocas de tomas RELEVADAS
  bocasTomasProyectado?: number; // Bocas de tomas PROYECTADAS

  // Legacy (para retrocompatibilidad)
  bocasLuz?: number;        // Bocas de luz (25 VA c/u)
  bocasTomas?: number;      // Bocas de tomas (240 VA c/u)
  cargasEspeciales?: number; // Cargas especiales en VA

  // Campos V2: Relevamiento y Diagnóstico
  estado?: 'existente' | 'a_reemplazar' | 'nuevo'; // Estado del circuito/elemento
  observacionesTecnicas?: string; // Notas de relevamiento/diagnóstico
  breakerInfo?: string;          // Protección existente (Ej: C16)
  cableInfo?: string;            // Conductor existente (Ej: 2.5mm²)
  hasPAT?: boolean;              // ¿Tiene puesta a tierra?
  hasPE?: boolean;               // ¿Tiene cable de protección (Verde-Amarillo)?
  tipoSuperficie?: 'cubierta' | 'semicubierta'; // Para cálculo de SLA
  specialLightsIUE?: number;     // 🆕 Bocas de iluminación especial (IUE)
}

// --- DATOS CSV: PMU Habitacional (AEA 770) ---

export interface HabitacionalPMUData extends CSVData {
  grado: string;
  ambiente: string;
  area_min: number;
  area_max: number;
  long_min: number;
  long_max: number;
  iug_base: number;
  iug_m2_step: number;
  iug_long_step: number;
  tug_base: number;
  tug_m2_step: number;
  tug_long_step: number;
  tug_min: number;
  observaciones: string;
}

export interface ProjectConfig {
  // === NUEVOS CAMPOS V2 (Jerarquía de 2 Niveles) ===
  regimenUso?: 'habitacional' | 'comercial' | 'industrial';
  estadoObra?: 'nueva' | 'existente' | 'modificacion' | 'provisoria';
  creationMode?: 'flash' | 'complete' | 'regulated'; // 🆕 Source of truth for Dashboard
  aclaracionInmueble?: string; // Para todos los regímenes (Ej: "Cabaña", "Carnicería", "Taller mecánico")

  // === CAMPOS LEGACY (Mantener para compatibilidad hacia atrás) ===
  clientName: string;
  destination: 'vivienda' | 'departamento' | 'departamento_ph' | 'comercio' | 'oficina' | 'local' | 'industria' | 'medico' | 'inflamable' | 'publica_concurrencia' | 'provisorio_obra' | 'especial';
  projectType: 'nueva' | 'existente'; // Deprecado, usar estadoObra
  surfaceArea: number;
  voltage: '220V' | '380V';
  panels: Panel[];
  selectedVariantIndex?: number;

  // === CONFIGURACIÓN DE ORIGEN (NUEVO V3) ===
  entryPoint?: 'METER' | 'TSG'; // METER para Casas, TSG para Departamentos
  preexistingVDrop?: number;    // Caída de tensión que ya trae el edificio

  // Campos de certificación ERSeP
  workType?: 'budget_certification' | 'final_certification';
  certificationScope?: 'complete' | 'user_only' | 'connection_point';
  certificateType?: string;
  supplyOrigin?: 'acometida' | 'sectional';
  includesPillar?: boolean;
  acometidaType?: string; // Deprecado, usar acometida.tipo
  insulationClass?: 'Clase I' | 'Clase II';
  feederDistance?: number;
  installationType?: 'Embutido' | 'Exterior' | 'Cielorraso' | 'Enterrado';

  // === NUEVOS CAMPOS: Acometida y Pilar (ET-21) ===
  acometida?: {
    tipo: string;              // Código desde tipos_acometidas.csv
    longitud: number;          // metros
    seccion?: number;          // mm² (para instalaciones existentes)
    material?: 'Cu' | 'Al';
    observaciones?: string;
    nature?: ComponentNature;  // 🆕 Naturaleza: relevado o proyectado

    // 🆕 PAT de Servicio (solo para Clase I - acometidas antiguas metálicas)
    servicePAT?: {
      required: boolean;           // true si la acometida es Clase I
      section?: number;             // Sección del cable PAT de servicio (mm²)
      resistance?: number;          // Resistencia medida (Ω)
      hasJabalina?: boolean;        // true si tiene jabalina instalada
      materials?: {
        cablePAT?: {
          section: number;
          standard: string;
          color: string;
        };
        jabalina?: {
          hasCompliantRod: boolean;
          standard: string;
        };
        tomacable?: {
          hasCompliantClamp: boolean;
          standard: string;
        };
      };
    };
  };

  pilar?: {
    tipo: string;              // Código desde tipos_pilares.csv
    cantidadMedidores?: number;
    ubicacion?: string;
    distanciaAEdificio?: number; // metros
    tienePAT?: boolean;
    observaciones?: string;
    nature?: ComponentNature;  // 🆕 Naturaleza: relevado o proyectado
  };

  // === NUEVO CAMPO: Medidor (M) ===
  medidor?: {
    distanciaATP: number;      // Distancia del Medidor al Tablero Principal (debe ser < 2m según AEA 770)
  };

  // Preferencias de materiales (temporal - se reemplazará por sistema por tramos)
  materialPreferences?: {
    brandBreakers?: string;
    brandCables?: string;
    pipeType?: string;
  };

  // Detalles del propietario
  ownerDetail: {
    dniCuit: string;
    street: string;
    address?: string;
    number: string;
    floor?: string;
    apartment?: string;
    tower?: string;
    city: string;
    province?: string;
    zipCode?: string;
    catastro?: string;
  };
  clientPhone?: string;

  // Campos específicos para INDUSTRIA (AEA 771.8.VII)
  perimeter?: number;           // Perímetro en metros
  luminaireHeight?: number;     // Altura de luminarias en metros
  hasFlammableMaterials?: boolean;  // Riesgo BE2/BE3

  // Campo V2: Intención del proyecto
  intent?: 'certification' | 'survey'; // Certificación o Relevamiento/Diagnóstico

  // Campo V3: Inventario de Circuitos (generado en Step 2, usado en Step 3)
  circuitInventory?: CircuitInventory;

  // Campo V4: Inventario extendido para Taller CAD (generado en Step 3)
  circuitInventoryForCAD?: CircuitInventoryItemForCAD[];
}

export interface CircuitSummary {
  id: string;
  panelId: string;
  type: string;
  description: string;
  bocas: number;
  power: number;
  ib: number;
  cable: string;
  breaker: string;

  // Caída de tensión (%)
  voltageDropLocal?: number;        // Caída en el tramo CT (Tablero → Boca)
  voltageDropAccumulated?: number;  // Caída acumulada desde M hasta el tablero
  voltageDropTotal?: number;        // Caída total (M → Boca) = acumulada + local

  // Warnings normativos
  warnings?: string[];  // Alertas críticas (ej: excede 3% en iluminación)

  // 🆕 Soporte para líneas terminales
  terminalLine?: {
    section: number;
    material: 'Cu' | 'Al';
    method: string;
  };
}

export interface PanelCalculationResult {
  totalPower: number;
  current: number;
  suggestedCable: string;
  suggestedBreaker: string;
  suggestedDifferential: string;
  voltageDropLocal: number;
  voltageDropAccumulated: number;
  circuits: CircuitSummary[];
}

export interface ProjectCalculation {
  grade: string;
  totalBocas: number;
  totalDPMS: number;
  totalKW: number;
  panels: Record<string, PanelCalculationResult>;
  alerts: string[];
  warnings: string[];
}

// === INVENTARIO DE CIRCUITOS (para reorganización de Steps) ===

/**
 * Representa un circuito individual en el inventario
 * Generado en Step 2 (Ambientes) y asignado en Step 3 (Tableros)
 */
export interface CircuitInventoryItem {
  id: string;                    // Ej: "IUG-1", "TUG-2", "ACU-COCINA"
  type: string;                  // "IUG", "TUG", "ACU", "APM", etc.
  description: string;           // "Iluminación Cocina + Baño"
  bocas: number;                 // Cantidad de bocas
  power: number;                 // Potencia en VA
  ib: number;                    // Corriente de proyecto (A)
  cable: string;                 // Sección calculada (Ej: "2.5mm²")
  breaker: string;               // Protección calculada (Ej: "2x16A")
  environments: string[];        // IDs de ambientes que incluye
  panelId?: string;              // 🆕 Compatibilidad con CircuitSummary
  assignedPanelId?: string;
  isAssigned: boolean;           // true si está asignado a un tablero
  voltage?: '220V' | '380V';     // Tensión del circuito (para especiales)
  notes?: string;                // Observaciones de instalación (NUEVO)

  // 🆕 Soporte Trifásico (V1)
  isThreePhase?: boolean;        // true = circuito trifásico (4 hilos R-S-T-N), false/undefined = monofásico
  assignedPhase?: 'R' | 'S' | 'T' | 'RST';  // Fase asignada para balanceo
  assignedHeaderId?: string;  // 🆕 ID de la protección de cabecera asignada
  conduitDiameter?: string;    // Diámetro de cañería (Ej: "19mm")

  nature?: ComponentNature;
  bocasLuz?: number;
  bocasTomas?: number;
  warnings?: string[];

  // 🆕 Soporte para líneas terminales
  terminalLine?: {
    section: number;
    material: 'Cu' | 'Al';
    method: string;
    conduitDiameter?: string;
    averageLength?: number;
  };
}

/**
 * Inventario completo de circuitos del proyecto
 * Se genera al finalizar Step 2 y se usa en Step 3
 */
export interface CircuitInventory {
  circuits: CircuitInventoryItem[];
  totalCircuits: number;
  assignedCircuits: number;
  orphanCircuits: number;
}

/**
 * Versión extendida de CircuitInventoryItem para el Taller CAD
 * Incluye todos los atributos necesarios para generar capas automáticas
 * y heredar propiedades eléctricas al dibujar
 */
export interface CircuitInventoryItemForCAD {
  // Identificación
  id: string;                 // "{panelId}-{designation}" Ej: "TP-IUG-1"
  panelId: string;
  panelName: string;
  designation: string;        // "IUG-1", "TUG-2", "ACU-1"
  type: string;               // "IUG", "TUG", "ACU", etc.
  description?: string;

  // Naturaleza (REL/PROY)
  nature: ComponentNature;    // 'proyectado' | 'relevado'

  // Cable
  cable: {
    section: number;          // Sección en mm²
    type: string;             // 'TW', 'THW', 'IRAM NM-247-3'
    conductors: number;       // Cantidad de conductores (2, 3, 4)
    material: 'Cu' | 'Al';    // Material
  };

  // Protección
  protection: {
    rating: number;           // Amperaje (10, 16, 20, 25, 32, 40, 63)
    type: string;             // '1P', '2P', '4P'
    curve: string;            // 'B', 'C', 'D'
    breakingCapacity?: string; // '3kA', '4.5kA', '6kA', '10kA'
  };

  // Conduit (Cañería)
  conduit: {
    size: string;             // Diámetro: "Ø 19mm", "Ø 25mm"
    method: string;           // Método IRAM: "B1", "B2", "D1", etc.
    type: string;             // 'PVC', 'Metal'
    material?: 'PVC' | 'Metal';
  };

  // Panel padre
  panel: {
    id: string;
    name: string;
    type: 'TP' | 'TSG' | 'TS';
    voltage: '220V' | '380V';
  };
}
// === VALIDACIONES CONDICIONALES ===

/**
 * Reglas de validación según tipo de instalación
 * Permite adaptar requisitos según estadoObra (nueva/existente/provisoria)
 */
export interface ValidationRules {
  requireCAD: boolean;              // ¿Requiere dibujo CAD completo?
  requirePAT: boolean;              // ¿Requiere Puesta a Tierra?
  requireDifferential: boolean;     // ¿Requiere Protección Diferencial?
  requirePhotos: boolean;           // ¿Requiere fotos de verificación?
  requireChecklist: boolean;        // ¿Requiere checklist Res.54/2018?
  allowIncompleteDrawing: boolean;  // ¿Permite plano simplificado?
  minDifferentialSensitivity: '30mA' | '300mA';  // Sensibilidad mínima diferencial
}

/**
 * Obtiene las reglas de validación según el tipo de instalación
 * @param config - Configuración del proyecto
 * @returns Reglas de validación aplicables
 */
export function getValidationRules(config: ProjectConfig): ValidationRules {
  const rules: ValidationRules = {
    requireCAD: true,
    requirePAT: true,
    requireDifferential: true,
    requirePhotos: false,
    requireChecklist: false,
    allowIncompleteDrawing: false,
    minDifferentialSensitivity: '30mA'
  };

  // Determinar estado de la obra (usar campo nuevo o legacy)
  const estadoObra = config.estadoObra || config.projectType;

  // Determinar provincia (Córdoba = ERSEP, Otras = Solo AEA)
  const province = config.ownerDetail?.province || 'Córdoba';
  const isCordoba = province === 'Córdoba';

  // INSTALACIÓN EXISTENTE
  if (estadoObra === 'existente') {
    rules.requireCAD = false;           // Plano opcional/simplificado
    rules.requirePhotos = true;         // Fotos obligatorias
    rules.requireChecklist = isCordoba; // Checklist SOLO para Córdoba (ERSEP)
    rules.allowIncompleteDrawing = true; // Permitir plano básico
    // PAT y Diferencial siguen siendo obligatorios
  }

  // INSTALACIÓN PROVISORIA (Obra)
  if (estadoObra === 'provisoria') {
    rules.requireDifferential = true;   // Siempre obligatorio
    rules.minDifferentialSensitivity = '30mA';  // Más sensible para obra
    rules.requirePAT = true;            // PAT obligatoria
    rules.allowIncompleteDrawing = true; // Plano simplificado OK
  }

  // INSTALACIÓN NUEVA
  if (estadoObra === 'nueva') {
    rules.requireCAD = true;            // Plano completo obligatorio
    rules.requirePhotos = false;        // Fotos opcionales
    rules.requireChecklist = false;     // No aplica checklist
    rules.allowIncompleteDrawing = false; // Plano debe estar completo
  }

  // MODIFICACIÓN
  if (estadoObra === 'modificacion') {
    rules.requireCAD = true;            // Plano de la modificación
    rules.requirePhotos = true;         // Fotos del estado previo
    rules.requireChecklist = false;     // No aplica checklist completo
  }

  return rules;
}

/**
 * Valida un paso específico del wizard
 * @param step Número de paso (1-4)
 * @param config Configuración del proyecto
 * @param environments Array de ambientes (opcional, para paso 2)
 * @returns Array de mensajes de validación (errores y advertencias)
 */
export function validateWizardStep(
  step: number,
  config: ProjectConfig,
  environments?: EnvironmentCalculation[]
): Array<{ type: 'error' | 'warning'; message: string; field?: string }> {
  const messages: Array<{ type: 'error' | 'warning'; message: string; field?: string }> = [];

  switch (step) {
    case 1: // Datos Generales
      if (!config.clientName || config.clientName.trim() === '') {
        messages.push({
          type: 'error',
          message: 'El nombre del cliente es obligatorio',
          field: 'clientName'
        });
      }

      if (!config.ownerDetail?.street || config.ownerDetail.street.trim() === '') {
        messages.push({
          type: 'error',
          message: 'La dirección de la obra es obligatoria',
          field: 'street'
        });
      }

      if (!config.ownerDetail?.province) {
        messages.push({
          type: 'warning',
          message: 'Provincia no especificada (se usará Córdoba por defecto)'
        });
      }

      if (!config.estadoObra && !config.projectType) {
        messages.push({
          type: 'warning',
          message: 'Tipo de instalación no especificado'
        });
      }
      break;

    case 2: // Ambientes
      if (!environments || environments.length === 0) {
        messages.push({
          type: 'error',
          message: 'Debes definir al menos un ambiente'
        });
      }

      const totalArea = environments?.reduce((sum, env) => sum + (env.surface || 0), 0) || 0;
      if (totalArea === 0) {
        messages.push({
          type: 'error',
          message: 'La superficie total no puede ser 0'
        });
      }

      environments?.forEach(env => {
        const totalBocas = (env.lights || 0) + (env.regularOutlets || 0) + (env.specialOutlets || 0);
        if (totalBocas === 0) {
          messages.push({
            type: 'warning',
            message: `Ambiente "${env.name}" no tiene bocas asignadas`
          });
        }

        if (env.surface && env.surface < 5) {
          messages.push({
            type: 'warning',
            message: `Ambiente "${env.name}" tiene superficie muy pequeña (${env.surface}m²)`
          });
        }
      });
      break;

    case 3: // Circuitos
      // 🔧 VALIDACIÓN OBSOLETA - En V1 la PAT se configura en panel.grounding
      // La validación de PAT se realiza a nivel de panel, no a nivel de config global
      // if (!config.pat || config.pat.resistance === undefined) {
      //   messages.push({
      //     type: 'error',
      //     message: 'Debes definir la Puesta a Tierra (PAT)'
      //   });
      // }

      // Validar Diferencial
      const hasDifferential = config.panels?.some(p =>
        Array.isArray(p.protections?.headers) && p.protections.headers.some(prot => prot.type === 'ID')
      );
      if (!hasDifferential) {
        messages.push({
          type: 'error',
          message: 'Debes incluir al menos una Protección Diferencial (ID)'
        });
      }

      // Validar selectividad
      config.panels?.forEach(panel => {
        if (!Array.isArray(panel.protections?.headers)) return;

        const differential = panel.protections.headers.find(p => p.type === 'ID');
        const mainPIA = panel.protections.headers.find(p => p.type === 'PIA');

        if (differential && mainPIA && differential.rating < mainPIA.rating) {
          messages.push({
            type: 'warning',
            message: `Panel "${panel.name}": Diferencial (${differential.rating}A) menor que PIA (${mainPIA.rating}A) - Revisar selectividad`
          });
        }
      });

      // Validar circuitos sin bocas
      config.panels?.forEach(panel => {
        panel.circuits?.forEach(circuit => {
          if (!circuit.outlets || circuit.outlets.length === 0) {
            messages.push({
              type: 'warning',
              message: `Circuito "${circuit.name}" no tiene bocas asignadas`
            });
          }
        });
      });
      break;

    case 4: // Cómputo
      // Solo advertencias, no errores críticos
      break;
  }

  return messages;
}

// === CONSTANTES NORMATIVAS ===

// --- DATOS CSV: Grados de Electrificación ---

interface ElectrificationGradeData extends CSVData {
  destino: string;
  grado: string;
  superficie_min: number;
  superficie_max: number;
  normativa: string;
}

// FALLBACK: Valores hardcodeados (se usan si CSV falla)
// FALLBACK_ELECTRIFICATION_GRADES removido - ahora se carga desde grados_electrificacion.csv

// Datos cargados desde CSV (se llenan al inicializar)
let LOADED_ELECTRIFICATION_GRADES: ElectrificationGradeData[] = [];

// --- DATOS CSV: Tipos de Circuitos y Líneas ---

interface CircuitTypeData extends CSVData {
  tipo_circuito: string;
  designacion: string;
  sigla: string;
  max_bocas: number;
  max_proteccion_a: number;
  seccion_min_mm2: number;
  seccion_min_tri_mm2: number;
  aplica_fs: string;  // NUEVO: 'Sí' o 'No' - Indica si aplica factor de simultaneidad
  permite_vivienda: string;
  permite_comercio: string;
  permite_industria: string;
  permite_publica_concurrencia: string;
  permite_transitorio: string;
  requiere_nueva: string;
  requiere_existente: string;
  calculo_auto: string;
  observaciones: string;
  normativa: string;
}

// FALLBACK_CIRCUIT_TYPES removido - ahora se carga desde tipos_circuitos_lineas.csv

export let LOADED_CIRCUIT_TYPES: CircuitTypeData[] = [];

// --- DATOS CSV: Tipos de Acometidas ---

export interface AcometidaType extends CSVData {
  codigo: string;
  descripcion: string;
  tipo_instalacion: string;
  material: string;
  seccion_min_mono_mm2: number;
  seccion_min_tri_mm2: number;
  metodo_instalacion: string;
  requiere_pilar: string;
  max_longitud_m: number;
  clase: 'I' | 'II';  // Clase I = metálica (requiere PAT Servicio), Clase II = doble aislación
  normativa: string;
  observaciones: string;
}

export let LOADED_ACOMETIDAS: AcometidaType[] = [];

export function getAcometidaTypes(): AcometidaType[] {
  return LOADED_ACOMETIDAS;
}

export function getPropertyDestinations(): PropertyDestinationData[] {
  return LOADED_PROPERTY_DESTINATIONS;
}

// --- DATOS CSV: Requisitos de Certificación ---

interface CertificationRequirementData extends CSVData {
  tipo_tramite: string;
  codigo_tramite: string;
  normativa_aplicable: string;
  requiere_pmu: string;
  requiere_calculo_dpms: string;
  requiere_unifilar: string;
  requiere_fotos_verif: string;
  requiere_plano_ubicacion: string;
  requiere_memoria_tecnica: string;
  requiere_acreditacion_existente: string;
  permite_vivienda: string;
  permite_comercio: string;
  permite_industria: string;
  permite_publica_concurrencia: string;
  factor_simultaneidad: number;
  motor_calculo: string;
  descripcion: string;
  observaciones: string;
}

// FALLBACK_CERTIFICATION_REQUIREMENTS removido - ahora se carga desde requisitos_certificacion.csv

let LOADED_CERTIFICATION_REQUIREMENTS: CertificationRequirementData[] = [];

// --- DATOS CSV: Destinos de Inmueble ---

interface PropertyDestinationData extends CSVData {
  codigo_destino: string;
  nombre_destino: string;
  categoria: string;
  requiere_categoria_profesional: number;
  max_potencia_cat3_kw: number;
  normativa_base: string;
  descripcion: string;
  observaciones: string;
}

// FALLBACK_PROPERTY_DESTINATIONS removido - ahora se carga desde destinos_inmueble.csv

let LOADED_PROPERTY_DESTINATIONS: PropertyDestinationData[] = [];

// --- DATOS CSV: PMU Industrial (AEA 771.8) ---

export interface IndustrialPMUData extends CSVData {
  grado: string;
  altura_min: number;
  altura_max: number;
  m2_por_boca_iug: number;
  m_perimetro_por_boca_tug: number;
  m_perimetro_por_boca_tue: number;
  bocas_min_iug: number;
  bocas_min_tug: number;
  bocas_min_tue: number;
}

// FALLBACK_INDUSTRIAL_PMU removido - ahora se carga desde pmu_industrial.csv

let LOADED_INDUSTRIAL_PMU: IndustrialPMUData[] = [];

// --- DATOS CSV: PMU Habitacional (AEA 770) ---
export let LOADED_HABITACIONAL_PMU: HabitacionalPMUData[] = [];
// FALLBACK_HABITACIONAL_PMU removido - ahora se carga desde pmu_habitacional.csv

// --- DATOS CSV: Variantes de Circuitos Habitacionales (AEA 770) ---

export interface HabitacionalCircuitVariantData extends CSVData {
  grado: string;
  variante_index: number;
  total_circuitos: number;
  iug: number;
  tug: number;
  tue: number;
  libre: number;
  descripcion: string;
}

// FALLBACK_HABITACIONAL_VARIANTS removido - ahora se carga desde variantes_circuitos_habitacional.csv


export let LOADED_HABITACIONAL_VARIANTS: HabitacionalCircuitVariantData[] = [];

// --- DATOS CSV: Variantes de Circuitos Industriales (AEA 771.8) ---

export interface CircuitVariantData extends CSVData {
  grado: string;
  variante_index: number;
  total_circuitos: number;
  iug: number;
  tug: number;
  iue: number;
  tue: number;
  descripcion: string;
}

// FALLBACK_CIRCUIT_VARIANTS removido - ahora se carga desde variantes_circuitos_industria.csv

export let LOADED_CIRCUIT_VARIANTS: CircuitVariantData[] = [];

// --- DATOS CSV: Tablas Iz (IRAM) ---

export interface IzTableData extends CSVData {
  norma: string;
  metodo: string;
  tension: string;
  seccion_mm2: number;
  iz_a: number;
  observaciones: string;
}

// FALLBACK_IZ_TABLES removido - ahora se carga desde tablas_iz.csv


export let LOADED_IZ_TABLES: IzTableData[] = [];

// === CONSTANTES DE INGENIERÍA: FACTORES DE CORRECCIÓN ===

const GROUPING_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.7,
  4: 0.65,
  5: 0.6,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.5
};

const TEMP_CORRECTION_AIR: Record<number, number> = {
  10: 1.29, 15: 1.25, 20: 1.22, 25: 1.18, 30: 1.15, 35: 1.1, 40: 1.0, 45: 0.91, 50: 0.82, 55: 0.71, 60: 0.58
};

const TEMP_CORRECTION_GROUND: Record<number, number> = {
  10: 1.1, 15: 1.05, 20: 1.03, 25: 1.0, 30: 0.96, 35: 0.92, 40: 0.88, 45: 0.84, 50: 0.8
};

/**
 * Obtiene el factor de agrupamiento según cantidad de circuitos
 */
export function getGroupingFactor(count: number): number {
  if (count <= 1) return 1.0;
  if (count >= 9) return 0.5;
  return GROUPING_FACTORS[count] || 1.0;
}

/**
 * Obtiene el factor de corrección por temperatura
 */
export function getTempCorrectionFactor(temp: number, method: string): number {
  const isGround = method.toLowerCase().includes('enterrado') || method === 'D1' || method === 'D2';
  const table = isGround ? TEMP_CORRECTION_GROUND : TEMP_CORRECTION_AIR;

  // Buscar el valor más cercano en la tabla
  const temps = Object.keys(table).map(Number).sort((a, b) => a - b);
  let closestTemp = temps[0];
  for (const t of temps) {
    if (Math.abs(t - temp) < Math.abs(closestTemp - temp)) {
      closestTemp = t;
    }
  }
  return table[closestTemp] || 1.0;
}

/**
 * Obtiene la intensidad admisible (Iz) de un cable según sección, método de instalación y factores
 * Realiza el cálculo Iz = Iz_tabla * f_agrupamiento * f_temperatura
 *
 * @param link - Configuración de la línea (método, sección, agrupamiento, temp)
 * @param voltage - Tensión de la línea ('220V' o '380V')
 * @returns Intensidad admisible final corregida
 */
export function calculateIz(link: LineLink, voltage: '220V' | '380V'): number {
  const izTables = LOADED_IZ_TABLES.length > 0 ? LOADED_IZ_TABLES : [];  // CSV carga desde tablas_iz.csv

  // Debug inicial
  console.log(`🔍 Calcz Start: Method='${link.method}', Section=${link.section}, Voltage='${voltage}'`);

  // Mapear método a norma/metodo de tabla
  let norma = 'IRAM_NM_247-3';
  let metodo = link.method || 'B1';

  // 1. Normalización de método (Intento de extraer código B1, D1, etc.)
  let metodoClean = metodo.trim();

  // Si el string es algo como "B1 - Embutido", extraer "B1"
  const parts = metodoClean.split(' - ');
  if (parts.length > 1 && parts[0].length <= 3) {
    metodoClean = parts[0];
  }

  // 2. Lógica de selección de norma
  if (metodoClean === 'D1' || metodoClean === 'D2') {
    norma = 'IRAM_2178';
    metodo = metodoClean;
  } else if (metodoClean.toLowerCase().includes('enterrado')) {
    norma = 'IRAM_2178';
    metodo = 'D1'; // Enterrado genérico -> D1
  } else if (metodoClean === 'B1') {
    norma = 'IRAM_NM_247-3';
    metodo = metodoClean;
  } else if (metodoClean === 'B2') {
    norma = 'IRAM_2178'; // B2 usa IRAM_2178, no IRAM_NM_247-3
    metodo = metodoClean;
  }

  // Debug normalización
  // Debug: Mostrar primeros registros para verificar formato
  if (izTables.length > 0) {
    const sample = izTables.slice(0, 5);
    console.log(`🔍 Sample CSV data (first 5 rows):`, sample);
    console.log(`🔍 Looking for: Norma=${norma}, Metodo=${metodo}, Tension=${voltage}, Seccion=${link.section}`);

    // 🔧 DEBUG ADICIONAL: Ver cuántos registros coinciden con norma/metodo/tension
    const matchingEntries = izTables.filter(d =>
      d.norma === norma && d.metodo === metodo && d.tension === voltage
    );
    console.log(`🔍 Entries matching Norma/Metodo/Tension: ${matchingEntries.length}`, matchingEntries);
  }

  const entry = izTables.find(d => {
    // Comparación robusta con conversión explícita de tipos
    const matchNorma = d.norma === norma;
    const matchMetodo = d.metodo === metodo;

    // 🔧 FIX CRÍTICO: Normalizar tensión para comparación
    // El CSV loader convierte "220V" a número 220, así que normalizamos ambos valores
    const normalizeTension = (val: string | number): number => {
      if (typeof val === 'number') return val;
      return parseInt(String(val).replace('V', ''));
    };
    const tensionDb = normalizeTension(d.tension);
    const tensionSearch = normalizeTension(voltage);
    const matchTension = tensionDb === tensionSearch;

    // 🔧 FIX CRÍTICO: Asegurar conversión numérica explícita
    // CSV puede retornar strings, necesitamos números para comparar
    const seccionDb = parseFloat(String(d.seccion_mm2));
    const seccionLink = parseFloat(String(link.section));
    const matchSeccion = !isNaN(seccionDb) && !isNaN(seccionLink) && Math.abs(seccionDb - seccionLink) < 0.01;

    // Debug detallado para TODOS los registros que casi coinciden
    if (matchNorma && matchMetodo && matchTension) {
      console.log(`🔍 Match parcial encontrado:`, {
        norma: d.norma,
        metodo: d.metodo,
        tension: d.tension,
        tension_normalized: tensionDb,
        search_tension_normalized: tensionSearch,
        seccion_csv: d.seccion_mm2,
        seccion_csv_type: typeof d.seccion_mm2,
        seccion_link: link.section,
        seccion_link_type: typeof link.section,
        seccionDb,
        seccionLink,
        matchSeccion,
        diff: Math.abs(seccionDb - seccionLink)
      });
    }

    return matchNorma && matchMetodo && matchTension && matchSeccion;
  });

  if (!entry) {
    console.warn(`⚠️ Iz NO encontrado. Buscando: Norma=${norma}, Metodo=${metodo}, Tension=${voltage}, Seccion=${link.section}`);
    console.warn(`   Tables source: ${LOADED_IZ_TABLES.length > 0 ? 'CSV' : 'FALLBACK'} (${izTables.length} rows)`);
    return 0;
  }

  const baseIz = Number(entry.iz_a);
  console.log(`✅ Iz Found: ${baseIz}A`);

  // Solo aplicar factor de agrupamiento (fg)
  // El factor de temperatura (ft) NO se aplica porque las tablas CSV
  // ya contienen valores a las temperaturas de referencia correctas
  const fg = getGroupingFactor(link.groupingCount || 1);

  const correctedIz = baseIz * fg;
  console.log(`🔧 Correction Factors: fg=${fg}, baseIz=${baseIz}A → correctedIz=${correctedIz.toFixed(1)}A`);

  return correctedIz;
}

// Suprimido duplicado de LOADED_IZ_TABLES

// === MOTOR DE INGENIERÍA: COORDINACIÓN Y VALIDACIÓN NORMATIVA ===

/**
 * Resultado de la validación de coordinación cable-protección
 */
export interface CoordinationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    condition1: boolean; // Ib ≤ In
    condition2: boolean; // In ≤ Iz
    condition3: boolean; // Iz ≥ 1.45 × In
  };
}

/**
 * Verifica la coordinación correcta entre cable y protección según IEC 60364-4-43
 * 
 * Condiciones normativas:
 * 1. Ib ≤ In (la corriente de proyecto no debe exceder la nominal del dispositivo)
 * 2. In ≤ Iz (la protección debe ser menor o igual a la admisible del cable)
 * 3. Iz ≥ 1.45 × In (el cable debe soportar sobrecarga antes del disparo térmico)
 * 
 * @param ib - Corriente de proyecto (diseño) en Amperes
 * @param in_ - Corriente nominal de la protección (PIA) en Amperes
 * @param iz - Corriente admisible del cable en Amperes
 * @returns Objeto con validación y mensajes
 */
export function checkCoordination(ib: number, in_: number, iz: number): CoordinationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Condición 1: Ib ≤ In
  const cond1 = ib <= in_;
  if (!cond1) {
    errors.push(`Corriente de proyecto (${ib.toFixed(1)}A) excede la protección (${in_}A). Riesgo de disparo intempestivo.`);
  }

  // Condición 2: In ≤ Iz
  const cond2 = in_ <= iz;
  if (!cond2) {
    errors.push(`Protección (${in_}A) excede capacidad del cable (${iz.toFixed(1)}A). Cable insuficiente - PELIGRO.`);
  }

  // Condición 3: Iz ≥ 1.45 × In (protección contra sobrecarga según IEC 60364-4-43)
  const cond3 = iz >= 1.45 * in_;
  if (!cond3) {
    warnings.push(`Cable (${iz.toFixed(1)}A) puede sobrecalentarse antes del disparo térmico. Mínimo recomendado: ${(1.45 * in_).toFixed(1)}A.`);
  }

  const isValid = cond1 && cond2; // Condición 3 es warning, no error crítico

  return {
    isValid,
    errors,
    warnings,
    details: {
      condition1: cond1,
      condition2: cond2,
      condition3: cond3
    }
  };
}

/**
 * Verifica la cadena completa de protecciones desde la raíz hasta el circuito
 * Valida que cada protección padre sea >= que todas sus hijas
 * 
 * REGLAS:
 * - PIA protege CABLES: debe ser <= Iz del cable y <= PIA padre
 * - ID protege PERSONAS: debe ser >= PIA (detecta fugas de corriente)
 * - Regla: ID >= In(PIA), pero PIA hijo <= PIA padre
 * 
 * @param circuitBreaker - Amperaje del breaker del circuito terminal
 * @param assignedHeader - Protección directamente asignada al circuito
 * @param allHeaders - Todas las protecciones del tablero
 * @returns Resultado de validación de la cadena
 */
export function checkProtectionChain(
  circuitBreaker: number,
  assignedHeader: ProtectionHeader | undefined,
  allHeaders: ProtectionHeader[]
): CoordinationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!assignedHeader) {
    // Sin protección asignada - esto ya se maneja en otro lugar
    return {
      isValid: true,
      errors: [],
      warnings: [],
      details: { condition1: true, condition2: true, condition3: true }
    };
  }

  // Construir cadena de protecciones desde el circuito hasta la raíz
  const chain: ProtectionHeader[] = [assignedHeader];
  let current = assignedHeader;

  while (current.parentProtectionId) {
    const parent = allHeaders.find(h => h.id === current.parentProtectionId);
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }

  // Validar que cada protección en la cadena sea >= circuito
  chain.forEach((protection, index) => {
    if (protection.rating < circuitBreaker) {
      const position = index === 0 ? 'directa' : `nivel ${index + 1}`;
      errors.push(
        `Protección ${protection.name} (${protection.rating}A, ${position}) es menor que el circuito (${circuitBreaker}A). PELIGRO: Disparo intempestivo.`
      );
    }
  });

  // Validar relación hijo-padre según tipo de protección
  for (let i = 0; i < chain.length - 1; i++) {
    const child = chain[i];
    const parent = chain[i + 1];

    // REGLA 1: PIA hijo <= PIA padre (protección de cables)
    if (child.type === 'PIA' && parent.type === 'PIA') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (PIA ${child.rating}A) excede a su PIA padre ${parent.name} (${parent.rating}A). Cable desprotegido.`
        );
      }
    }

    // REGLA 2: ID >= PIA padre (protección de personas - CORRECTO)
    // Si ID > PIA, está bien porque el ID protege personas, no cables
    // Solo advertir si ID < PIA (subcalibrado)
    else if (child.type === 'ID' && parent.type === 'PIA') {
      if (child.rating < parent.rating) {
        errors.push(
          `${child.name} (ID ${child.rating}A) es menor que su PIA padre ${parent.name} (${parent.rating}A). ID debe ser >= PIA.`
        );
      }
      // Si ID >= PIA, está correcto - no generar error
    }

    // REGLA 3: PIA hijo <= ID padre (el ID ya validó la PIA anterior)
    else if (child.type === 'PIA' && parent.type === 'ID') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (PIA ${child.rating}A) excede a su ID padre ${parent.name} (${parent.rating}A). Coordinación incorrecta.`
        );
      }
    }

    // REGLA 4: ID hijo <= ID padre (poco común pero posible)
    else if (child.type === 'ID' && parent.type === 'ID') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (ID ${child.rating}A) excede a su ID padre ${parent.name} (${parent.rating}A). Coordinación incorrecta.`
        );
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    details: {
      condition1: isValid,
      condition2: isValid,
      condition3: isValid
    }
  };
}

/**
 * Valida la jerarquía de protecciones sin necesidad de circuitos asignados
 * Verifica que las relaciones padre-hijo sean correctas según tipo de protección
 * 
 * @param headers - Todas las protecciones del tablero
 * @returns Resultado de validación de la jerarquía
 */
export function validateProtectionHierarchy(headers: ProtectionHeader[]): CoordinationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  headers.forEach(child => {
    if (!child.parentProtectionId) return; // Es raíz, no validar

    const parent = headers.find(h => h.id === child.parentProtectionId);
    if (!parent) return; // Padre no encontrado

    // REGLA 1: PIA hijo <= PIA padre (protección de cables)
    if (child.type === 'PIA' && parent.type === 'PIA') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (PIA ${child.rating}A) excede a su PIA padre ${parent.name} (${parent.rating}A). Cable desprotegido.`
        );
      }
    }

    // REGLA 2: ID >= PIA padre (protección de personas - CORRECTO)
    else if (child.type === 'ID' && parent.type === 'PIA') {
      if (child.rating < parent.rating) {
        errors.push(
          `${child.name} (ID ${child.rating}A) es menor que su PIA padre ${parent.name} (${parent.rating}A). ID debe ser >= PIA.`
        );
      }
      // Si ID >= PIA, está correcto - no generar error
    }

    // REGLA 3: PIA hijo <= ID padre
    else if (child.type === 'PIA' && parent.type === 'ID') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (PIA ${child.rating}A) excede a su ID padre ${parent.name} (${parent.rating}A). Coordinación incorrecta.`
        );
      }
    }

    // REGLA 4: ID hijo <= ID padre
    else if (child.type === 'ID' && parent.type === 'ID') {
      if (child.rating > parent.rating) {
        errors.push(
          `${child.name} (ID ${child.rating}A) excede a su ID padre ${parent.name} (${parent.rating}A). Coordinación incorrecta.`
        );
      }
    }
  });

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    details: {
      condition1: isValid,
      condition2: isValid,
      condition3: isValid
    }
  };
}

/**
 * Resultado del cálculo de caída de tensión
 */
export interface VoltageDropResult {
  local: number;           // Caída en el último tramo (%)
  accumulated: number;     // Caída acumulada desde origen (%)
  total: number;           // Caída total = accumulated + local (%)
  path: string[];          // Ruta del árbol (ej: ["M", "TP", "TSG"])
  exceedsLimit: boolean;   // true si supera 3% (iluminación) o 5% (fuerza)
  limitType: 'lighting' | 'power';
  limitValue: number;      // 3% o 5% según tipo
}

/**
 * Calcula la caída de tensión acumulativa desde el origen hasta un punto del árbol
 * 
 * Fórmulas:
 * - Monofásico: ΔV% = (2 × L × Ib) / (γ × S × V) × 100
 * - Trifásico:  ΔV% = (√3 × L × Ib) / (γ × S × V) × 100
 * 
 * Donde:
 * - L: longitud del tramo (m)
 * - Ib: corriente de proyecto (A)
 * - γ: conductividad (Cu: 56 m/Ω·mm², Al: 35 m/Ω·mm²)
 * - S: sección del cable (mm²)
 * - V: tensión nominal (220 o 380)
 * 
 * @param config - Configuración del proyecto (para detectar EntryPoint)
 * @param panelId - ID del panel destino
 * @param ib - Corriente de proyecto del circuito (A)
 * @param circuitType - Tipo de circuito ('IUG' para iluminación, otro para fuerza)
 * @returns Objeto con caída local, acumulada y total
 */
export function calculateDetailedVoltageDrop(
  config: ProjectConfig,
  panelId: string,
  ib: number,
  circuitType: 'IUG' | 'TUG' | string = 'TUG'
): VoltageDropResult {
  const panels = config.panels || [];
  const path: string[] = [];
  let accumulatedDrop = 0;

  // 1. Detectar punto de origen (EntryPoint)
  const entryPoint = config.entryPoint || 'METER';
  if (entryPoint === 'TSG') {
    // Departamentos: iniciar con caída preexistente del edificio
    accumulatedDrop = config.preexistingVDrop || 0;
    path.push('Edificio');
  } else {
    // Casas: iniciar desde Medidor
    path.push('M');
  }

  // 2. Construir ruta desde origen hasta panelId
  const targetPanel = panels.find(p => p.id === panelId);
  if (!targetPanel) {
    return {
      local: 0,
      accumulated: accumulatedDrop,
      total: accumulatedDrop,
      path,
      exceedsLimit: false,
      limitType: circuitType === 'IUG' ? 'lighting' : 'power',
      limitValue: circuitType === 'IUG' ? 3 : 5
    };
  }

  // Construir jerarquía hacia arriba
  const hierarchy: Panel[] = [];
  let current: Panel | undefined = targetPanel;
  while (current) {
    hierarchy.unshift(current);
    current = panels.find(p => p.id === current?.parentId);
  }

  // 3. Calcular caída de tensión por cada tramo
  for (const panel of hierarchy) {
    path.push(panel.name || panel.type);

    // Obtener datos de la línea (incomingLine o legacy feederDistance)
    const line = panel.incomingLine || {
      method: panel.installationType || 'Embutido',
      length: panel.feederDistance || 0,
      material: 'Cu' as 'Cu' | 'Al',
      section: panel.mainLine?.section || panel.sectionalLine?.section || 2.5,
      groupingCount: 1,
      ambientTemp: 40,
      conduitMaterial: 'PVC' as 'PVC' | 'Metal'
    };

    const L = line.length;
    const S = line.section;
    const gamma = line.material === 'Cu' ? 56 : 35; // conductividad m/(Ω·mm²)
    const V = parseInt(panel.voltage.replace('V', '')); // 220 o 380

    // Fórmula de caída de tensión
    let drop = 0;
    if (panel.voltage === '380V' && (!panel.phase || panel.phase === 'RST')) {
      // Trifásico
      drop = (Math.sqrt(3) * L * ib) / (gamma * S * V) * 100;
    } else {
      // Monofásico
      drop = (2 * L * ib) / (gamma * S * V) * 100;
    }

    accumulatedDrop += drop;
  }

  // 4. Determinar límite normativo
  const limitType: 'lighting' | 'power' = circuitType === 'IUG' ? 'lighting' : 'power';
  const limitValue = limitType === 'lighting' ? 3 : 5;
  const exceedsLimit = accumulatedDrop > limitValue;

  return {
    local: accumulatedDrop > 0 ? accumulatedDrop - (config.preexistingVDrop || 0) : 0,
    accumulated: accumulatedDrop,
    total: accumulatedDrop,
    path,
    exceedsLimit,
    limitType,
    limitValue
  };
}

/**
 * Resultado del cálculo de módulos
 */
export interface ModuleCalculation {
  requiredCircuits: number;      // Cantidad de circuitos asignados
  protectionModules: number;      // PIA cabecera (2-4 módulos) + ID (2-4 módulos)
  reserveModules: number;         // Reserva normativa (mínimo 2, ideal = circuitos)
  totalRequired: number;          // Total mínimo requerido
  suggested: number;              // Módulo comercial sugerido (4/8/12/16/24)
  justification: string;          // Explicación del cálculo
}

/**
 * Calcula la cantidad de módulos/polos necesarios para un tablero
 * según la regla normativa "Polos × 2 para reserva técnica" (AEA 770 Art. 7.5.2)
 * 
 * @param panel - Panel a evaluar
 * @param assignedCircuits - Circuitos asignados al panel
 * @returns Módulos comerciales sugeridos (4, 8, 12, 16, 24)
 */
export function calculateSuggestedModules(
  panel: Panel,
  assignedCircuits?: CircuitInventoryItem[]
): ModuleCalculation {
  const circuitCount = assignedCircuits?.length || 0;

  // Protecciones de cabecera
  let protectionModules = 0;
  if (panel.protections?.hasPIA) {
    protectionModules += panel.protections.piaPoles === '4P' ? 4 : 2;
  }
  if (panel.protections?.hasID) {
    protectionModules += panel.voltage === '380V' ? 4 : 2;
  }

  // Cálculo de reserva: mínimo 2 módulos, idealmente 100% de los circuitos
  const reserveModules = Math.max(2, circuitCount);

  // Total requerido
  const totalRequired = circuitCount + protectionModules + reserveModules;

  // Módulos comerciales disponibles
  const commercialSizes = [4, 8, 12, 16, 24, 36, 48];
  const suggested = commercialSizes.find(size => size >= totalRequired) || commercialSizes[commercialSizes.length - 1];

  const justification = `${circuitCount} circuitos + ${protectionModules} protecciones + ${reserveModules} reserva = ${totalRequired} módulos → ${suggested} módulos comercial`;

  return {
    requiredCircuits: circuitCount,
    protectionModules,
    reserveModules,
    totalRequired,
    suggested,
    justification
  };
}

// === DIAGNÓSTICO UNIFICADO DE PANEL ===

/**
 * Diagnóstico técnico completo de un panel
 */
export interface PanelDiagnostics {
  // Datos de línea
  lineData: {
    method: string;
    methodName: string;     // Nombre legible (ej: "B1 - Embutido")
    section: number;
    material: 'Cu' | 'Al';
    length: number;
    izBase: number;         // Iz de tabla sin factores
    izCorrected: number;    // Iz con factores aplicados
    groupingFactor: number;
    tempFactor: number;
  };

  // Coordinación cable-protección
  coordination: CoordinationResult;

  // 🆕 Validaciones por circuito individual
  circuitValidations?: Map<string, CoordinationResult>; // circuitId -> resultado validación

  // 🆕 Validación de jerarquía de protecciones (sin circuitos)
  protectionHierarchyValidation?: CoordinationResult;

  // Caída de tensión
  voltageDrop: VoltageDropResult & {
    preexistingDrop?: number; // Solo si entryPoint=TSG
  };

  // Módulos sugeridos
  modules: ModuleCalculation;

  // Estado general
  overallStatus: 'ok' | 'warning' | 'error';

  // 🆕 Datos de Carga
  Ib: number;         // Corriente de proyecto total (A)
  totalDPMS: number;  // Demanda de potencia máxima simultánea total (VA)
  selectivity?: SelectivityResult; // 🆕 Resultado de selectividad (NUEVO)
}

// === VALIDACIÓN DE SELECTIVIDAD (NUEVO) ===

export interface SelectivityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Obtiene el amperaje de la térmica (PIA) principal de un tablero
 * Ignora los diferenciales (ID) para efectos de selectividad pura
 */
function getMainPIARating(panel: Panel): number | undefined {
  if (!panel.protections?.headers) {
    // Fallback legacy
    if (panel.protections?.mainHeaderType === 'PIA' && panel.protections?.piaRating) {
      return panel.protections.piaRating;
    }
    return undefined;
  }

  // Buscar PIA en headers
  const headers = panel.protections.headers || [];

  // 1. Preferir una PIA de cabecera (sin padre)
  const rootPias = headers.filter(h => h.type === 'PIA' && !h.parentProtectionId);
  if (rootPias.length > 0) return rootPias[0].rating;

  // 2. Si no hay, tomar cualquier PIA (la primera)
  const anyPias = headers.filter(h => h.type === 'PIA');
  if (anyPias.length > 0) return anyPias[0].rating;

  return undefined;
}

/**
 * Valida la selectividad de protecciones (Padre >= Hijo)
 * y la capacidad de los IDs (ID >= Térmica)
 */
export function validateSelectivity(
  panel: Panel,
  childPanels: Panel[],
  assignedCircuits: CircuitInventoryItem[],
  allCircuits: CircuitInventoryItem[] = [],
  parentPanel?: Panel // 🆕 Tablero padre para validar ID vs PIA aguas arriba
): SelectivityResult {
  const result: SelectivityResult = { isValid: true, errors: [], warnings: [] };
  const localMainPia = getMainPIARating(panel);

  // Determinar la PIA que protege a este tablero (Local o del Padre)
  let protectingPia = localMainPia; // Por defecto la local
  if (!protectingPia && parentPanel) {
    protectingPia = getMainPIARating(parentPanel); // Si no hay local, buscar en el padre
  }

  // 1. Verificar Circuitos PROPIOS (PIA Panel vs PIA Circuito)
  if (localMainPia) {
    for (const circuit of assignedCircuits) {
      const circuitBreakerMatch = circuit.breaker?.match(/(\d+)A/);
      if (circuitBreakerMatch) {
        const circuitIn = parseInt(circuitBreakerMatch[1]);
        if (circuitIn > localMainPia) {
          result.isValid = false;
          result.errors.push(`Falla de Selectividad: Térmica General (${localMainPia}A) es MENOR que la del circuito ${circuit.type} (${circuitIn}A).`);
        }
      }
    }
  }

  // 2. Verificar Tableros Hijos Recursivamente
  // (Usamos localMainPia porque la selectividad hacia abajo la impone este tablero)
  if (childPanels && localMainPia) {
    for (const child of childPanels) {
      const childMainPia = getMainPIARating(child);

      if (childMainPia) {
        // Caso A: El hijo tiene PIA. Validamos PIA vs PIA.
        if (childMainPia > localMainPia) {
          result.isValid = false;
          result.errors.push(`Falla de Selectividad: Térmica General (${localMainPia}A) es MENOR que la del tablero hijo ${child.name} (${childMainPia}A).`);
        }
      } else {
        // Caso B: El hijo NO tiene PIA (solo ID o nada).
        // Debemos validar contra los circuitos DE ESE HIJO (Saltamos un nivel)
        // Buscamos circuitos asignados al hijo
        const childCircuits = allCircuits.filter(c => c.assignedPanelId === child.id);

        for (const circuit of childCircuits) {
          const circuitBreakerMatch = circuit.breaker?.match(/(\d+)A/);
          if (circuitBreakerMatch) {
            const circuitIn = parseInt(circuitBreakerMatch[1]);
            if (circuitIn > localMainPia) {
              result.isValid = false;
              result.errors.push(`Falla de Selectividad: Térmica General (${localMainPia}A) es MENOR que circuito ${circuit.type} (${circuitIn}A) del tablero hijo ${child.name}.`);
            }
          }
        }
      }
    }
  }

  // 3. Verificar Capacidad de IDs (ID >= PIA Aguas Arriba)
  // Usamos protectingPia (que puede ser del padre si este tablero no tiene PIA)
  const ids = panel.protections?.headers?.filter(h => h.type === 'ID') || [];
  if (ids.length > 0 && protectingPia) {
    for (const id of ids) {
      if (id.rating < protectingPia) {
        // Advertencia de capacidad (riesgo de quemarse)
        const origin = localMainPia ? 'térmica general' : `térmica del padre (${parentPanel?.name})`;
        result.warnings.push(`Capacidad ID: El diferencial ${id.rating}A es menor que la ${origin} ${protectingPia}A (Riesgo de daño).`);
      }
    }
  }

  return result;
}

/**
 * Obtiene diagnóstico técnico completo de un panel
 * Unifica todas las validaciones del motor de ingeniería (Fase 1)
 * 
 * @param panel - Panel a diagnosticar
 * @param config - Configuración del proyecto
 * @param assignedCircuits - Circuitos asignados al panel
 * @returns Diagnóstico completo con validaciones normativas
 */
export function getDiagnostics(
  panel: Panel,
  config: ProjectConfig,
  assignedCircuits?: CircuitInventoryItem[],
  allPanels?: Panel[], // 🆕 Panel list for recursive calculation
  allCircuits?: CircuitInventoryItem[] // 🆕 Full circuit inventory
): PanelDiagnostics {

  // 🆕 Función auxiliar para calcular carga total recursiva (circuitos propios + hijos)
  // 🆕 Función auxiliar para calcular carga total recursiva (circuitos propios + hijos)
  const calculateTotalLoad = (currentPanelId: string): number => {
    // 1. Carga de circuitos propios
    const panelCircuits = (assignedCircuits && panel.id === currentPanelId)
      ? assignedCircuits
      : (Array.isArray(allCircuits) ? allCircuits.filter(c => c.assignedPanelId === currentPanelId) : []);

    let ownLoad = calculatePanelDPMS(panelCircuits);

    // 2. Carga de tableros hijos
    if (Array.isArray(allPanels)) {
      const childPanels = allPanels.filter(p => p.parentId === currentPanelId);
      for (const child of childPanels) {
        ownLoad += calculateTotalLoad(child.id);
      }
    }

    return ownLoad;
  };

  // 🆕 Calcular carga total real
  const totalDPMS = calculateTotalLoad(panel.id);

  // 1. Construir LineLink (desde incomingLine o datos legacy)
  // 1. Construir LineLink (desde incomingLine o datos legacy)
  const method = panel.incomingLine?.method || panel.installationType || 'B1';
  const isBuried = method === 'D1' || method === 'D2' || method.toLowerCase().includes('enterrado');

  const line: LineLink = panel.incomingLine || {
    method,
    length: panel.feederDistance || 0,
    material: (panel.mainLine?.material || panel.sectionalLine?.material || 'Cu') as 'Cu' | 'Al',
    section: panel.mainLine?.section || panel.sectionalLine?.section || 4, // Cambié default a 4mm² (más común)
    groupingCount: 1,
    ambientTemp: isBuried ? 25 : 40,  // 🔧 FIX: 25°C para enterrados, 40°C para otros
    conduitMaterial: 'PVC' as 'PVC' | 'Metal'
  };

  // Debug: verificar qué estamos pasando a calculateIz
  console.log('🔍 getDiagnostics - Panel:', panel.name);
  console.log('  LineLink:', {
    method: line.method,
    section: line.section,
    material: line.material,
    voltage: panel.voltage,
    hasIncomingLine: !!panel.incomingLine,
    mainLineSection: panel.mainLine?.section,
    sectionalLineSection: panel.sectionalLine?.section
  });

  // Nombre legible del método
  const methodNames: Record<string, string> = {
    'B1': 'B1 - Embutido en Pared',
    'B2': 'B2 - Bandeja Perforada',
    'D1': 'D1 - Caño Enterrado',
    'D2': 'D2 - Directamente Enterrado',
    'Embutido': 'B1 - Embutido en Pared',
    'Exterior': 'B1 - Exterior',
    'Enterrado': 'D1 - Enterrado',
    'Cielorraso': 'B1 - Cielorraso'
  };

  // 2. Determinar tensión correcta para cálculo de Iz
  // Lógica: Si panel es 380V pero protección es 2P → línea usa 220V (monofásico)
  //         Si panel es 380V y protección es 4P → línea usa 380V (trifásico)
  //         Si panel es 220V → línea usa 220V (monofásico)
  let voltageForIz: '220V' | '380V' = panel.voltage;

  if (panel.voltage === '380V') {
    // 🆕 NUEVO: Intentar usar protecciones del array headers primero
    const headers = panel.protections?.headers || [];

    if (headers.length > 0) {
      // Usar la primera protección de 4P si existe, sino la primera 2P
      const fourPoleHeader = headers.find(h => h.poles === '4P');
      const twoPoleHeader = headers.find(h => h.poles === '2P');
      const mainHeader = fourPoleHeader || twoPoleHeader || headers[0];

      if (mainHeader.poles === '2P') {
        voltageForIz = '220V';  // Tablero 380V usando solo 1 fase → calcular como monofásico
        console.log(`🔧 Panel ${panel.name}: 380V con protección 2P (${mainHeader.name}) → Iz calculado como 220V monofásico`);
      } else if (mainHeader.poles === '4P') {
        voltageForIz = '380V';  // Tablero 380V usando 3 fases → calcular como trifásico
        console.log(`🔧 Panel ${panel.name}: 380V con protección 4P (${mainHeader.name}) → Iz calculado como 380V trifásico`);
      }
    } else {
      // FALLBACK: Usar estructura antigua si no hay headers
      const protectionPoles = panel.protections?.mainHeaderType === 'PIA'
        ? panel.protections?.piaPoles
        : panel.protections?.idPoles;

      if (protectionPoles === '2P') {
        voltageForIz = '220V';  // Tablero 380V usando solo 1 fase → calcular como monofásico
        console.log(`🔧 Panel ${panel.name}: 380V con protección 2P (legacy) → Iz calculado como 220V monofásico`);
      } else if (protectionPoles === '4P') {
        voltageForIz = '380V';  // Tablero 380V usando 3 fases → calcular como trifásico
        console.log(`🔧 Panel ${panel.name}: 380V con protección 4P (legacy) → Iz calculado como 380V trifásico`);
      }
    }
  }

  // 3. Calcular Iz base (sin factores) e Iz corregida (con factores)
  const izCorrected = calculateIz(line, voltageForIz);

  // Para obtener Iz base, calcular sin factores (fg=1, ft=1)
  const lineNoFactors: LineLink = { ...line, groupingCount: 1, ambientTemp: line.method.includes('Enterrado') || line.method === 'D1' || line.method === 'D2' ? 25 : 40 };
  const izBase = calculateIz(lineNoFactors, voltageForIz);

  const groupingFactor = getGroupingFactor(line.groupingCount || 1);
  const tempFactor = getTempCorrectionFactor(
    line.ambientTemp || (line.method.includes('Enterrado') || line.method === 'D1' || line.method === 'D2' ? 25 : 40),
    line.method
  );

  // 3. Calcular corriente de proyecto (Ib) del panel
  const circuits = assignedCircuits || [];
  // 🔧 FIX Bug #9: Usar totalDPMS (recursivo) para calcular Ib, no solo la carga local
  // 🔧 FIX: Asegurar que Ib use la misma tensión que la protección detectada (voltageForIz)
  const ib = totalDPMS > 0 ? calculatePanelIb(totalDPMS, voltageForIz) : 0;

  // 4. Obtener protección nominal (In)
  let in_ = 0;
  const mainPIARating = getMainPIARating(panel);

  if (mainPIARating !== undefined) {
    in_ = mainPIARating;
  } else if (config.projectType === 'existente' && panel.existingPIA) {
    in_ = panel.existingPIA.amperes;
  } else if (panel.protections?.hasPIA && panel.protections.piaRating) {
    in_ = panel.protections.piaRating;
  } else {
    // Estimar protección según Ib (solo para proyectos nuevos o preview)
    const stdRatings = [10, 16, 20, 25, 32, 40, 63];
    in_ = stdRatings.find(r => r >= ib) || 63;
  }

  // 5. Coordinación cable-protección
  const coordination = checkCoordination(ib, in_, izCorrected);

  // 6. Caída de tensión con ruta
  const vdrop = calculateDetailedVoltageDrop(config, panel.id, ib, 'TUG');

  // Agregar ΔV preexistente si aplica
  const voltageDropWithPreexisting = {
    ...vdrop,
    preexistingDrop: config.entryPoint === 'TSG' ? config.preexistingVDrop : undefined
  };

  // 7. Módulos sugeridos
  const modules = calculateSuggestedModules(panel, circuits);

  // 🆕 8. Validar cada circuito contra su cadena de protecciones completa
  const circuitValidations = new Map<string, CoordinationResult>();
  const headers = panel.protections?.headers || [];

  if (headers.length > 0 && circuits.length > 0) {
    circuits.forEach(circuit => {
      // Extraer amperaje del breaker del circuito
      const breakerMatch = circuit.breaker?.match(/(\d+)A/);
      if (!breakerMatch) return;

      const circuitBreaker = parseInt(breakerMatch[1]);

      // Encontrar protección asignada
      const assignedHeader = headers.find(h => h.id === circuit.assignedHeaderId);

      // Validar cadena completa
      const validation = checkProtectionChain(circuitBreaker, assignedHeader, headers);
      circuitValidations.set(circuit.id, validation);
    });
  }

  // 🆕 8.5. Validar jerarquía de protecciones (incluso sin circuitos)
  const protectionHierarchyValidation = validateProtectionHierarchy(headers);

  // 9. Estado general (incluye validaciones de circuitos y jerarquía de protecciones)
  let overallStatus: 'ok' | 'warning' | 'error' = 'ok';

  // Verificar si algún circuito tiene error O si la jerarquía de protecciones tiene error
  const hasCircuitErrors = Array.from(circuitValidations.values()).some(v => !v.isValid);
  const hasProtectionHierarchyErrors = !protectionHierarchyValidation.isValid;

  if (!coordination.isValid || vdrop.exceedsLimit || hasCircuitErrors || hasProtectionHierarchyErrors) {
    overallStatus = 'error';
  } else if (coordination.warnings.length > 0) {
    overallStatus = 'warning';
  }

  // 🆕 10. Validar Selectividad Cruzada
  // Necesitamos child panels
  const childPanels = (Array.isArray(allPanels))
    ? allPanels.filter(p => p.parentId === panel.id)
    : [];

  const parentPanel = (Array.isArray(allPanels)) ? allPanels.find(p => p.id === panel.parentId) : undefined;

  const selectivity = validateSelectivity(panel, childPanels, circuits, allCircuits, parentPanel);

  if (!selectivity.isValid) {
    overallStatus = 'error'; // Bloqueante
  } else if (selectivity.warnings.length > 0 && overallStatus !== 'error') {
    overallStatus = 'warning';
  }

  return {
    lineData: {
      method: line.method,
      methodName: methodNames[line.method] || line.method,
      section: line.section,
      material: line.material,
      length: line.length,
      izBase,
      izCorrected,
      groupingFactor,
      tempFactor
    },
    coordination,
    circuitValidations, // 🆕 Incluir validaciones por circuito
    protectionHierarchyValidation, // 🆕 Incluir validación de jerarquía de protecciones
    voltageDrop: voltageDropWithPreexisting,
    modules,
    overallStatus,
    Ib: ib,       // 🆕 Corriente de proyecto total
    totalDPMS: totalDPMS, // 🆕 Demanda de potencia total
    selectivity // 🆕 Resultado de selectividad
  };
}





// --- DATOS CSV: Pilares (ET-21) ---

export interface PilarTypeData extends CSVData {
  codigo: string;
  descripcion: string;
  tipo_medidor: string;
  max_usuarios: number;
  tension: string;
  requiere_base: string;
  altura_min_m: number;
  altura_max_m: number;
  seccion_pat_mm2: number;
  normativa: string;
  observaciones: string;
}

// FALLBACK_PILARES removido - ahora se carga desde tipos_pilares.csv


let LOADED_PILARES: PilarTypeData[] = [];

// --- DATOS CSV: Materiales de Acometidas (ET-21) ---

export interface MaterialAcometidaData extends CSVData {
  codigo_acometida: string;
  item_numero: number;
  descripcion_material: string;
  cantidad: number;
  unidad: string;
  norma_referencia: string;
  es_obligatorio: string;
  categoria: string;
  observaciones: string;
}

// FALLBACK_MATERIALES_ACOMETIDAS removido - ahora se carga desde materiales_acometidas.csv

let LOADED_MATERIALES_ACOMETIDAS: MaterialAcometidaData[] = [];

// --- DATOS CSV: Catálogo General de Materiales ---

export interface MaterialGeneralData extends CSVData {
  codigo_material: string;
  categoria: string;
  subcategoria: string;
  descripcion: string;
  especificacion_tecnica: string;
  norma_referencia: string;
  unidad: string;
  observaciones: string;
}

// FALLBACK_MATERIALES_GENERALES removido - ahora se carga desde materiales_generales.csv

export let LOADED_MATERIALES_GENERALES: MaterialGeneralData[] = [];

// --- DATOS CSV: Materiales por Circuito ---

export interface MaterialPorCircuitoData extends CSVData {
  tipo_circuito: string;
  metodo_instalacion: string;
  codigo_material: string;
  cantidad_por_boca: number;
  cantidad_fija: number;
  formula_calculo: string;
  observaciones: string;
}

// FALLBACK_MATERIALES_POR_CIRCUITO removido - ahora se carga desde materiales_por_circuito.csv

export let LOADED_MATERIALES_POR_CIRCUITO: MaterialPorCircuitoData[] = [];

// --- DATOS CSV: Materiales PAT ---

export interface MaterialPATData extends CSVData {
  tipo_instalacion: string;
  codigo_material: string;
  cantidad: number;
  unidad: string;
  es_obligatorio: string;
  observaciones: string;
}

// FALLBACK_MATERIALES_PAT removido - ahora se carga desde materiales_pat.csv

export let LOADED_MATERIALES_PAT: MaterialPATData[] = [];

let CSV_LOAD_STATUS = { initialized: false, usingFallback: false };

// --- FIN DATOS CSV ---

// Variantes de Circuitos Mínimos para Instalaciones Habitacionales (AEA 770)
// IMPORTANTE: Estos son los circuitos MÍNIMOS obligatorios por grado de electrificación.
// El usuario puede agregar más circuitos si la instalación lo requiere (ej: si supera 15 bocas por circuito).
// El campo 'libre' en Superior indica un circuito de libre elección (puede ser IUG, TUG, TUE, o cualquier específico).
export const CIRCUIT_VARIANTS = {
  'Mínimo': [
    { iug: 1, tug: 1 } // Variante única
  ],
  'Medio': [
    { iug: 2, tug: 1 }, // Variante a)
    { iug: 1, tug: 2 }  // Variante b)
  ],
  'Elevado': [
    { iug: 2, tug: 3 }, // Variante a)
    { iug: 3, tug: 2 }  // Variante b)
  ],
  'Superior': [
    { iug: 2, tug: 3, libre: 1 }, // Variante a) - 2 IUG + 3 TUG + 1 Libre
    { iug: 3, tug: 2, libre: 1 }  // Variante b) - 3 IUG + 2 TUG + 1 Libre
  ]
};

const MIN_SECTIONS = { acometida: 4.0, seccional: 2.5, tug: 2.5, iug: 1.5 };

/**
 * Calcula la caída de tensión en un tramo de línea
 * @param power - Potencia en VA
 * @param length - Longitud en metros
 * @param section - Sección en mm²
 * @param voltage - Tensión ('220V' o '380V')
 * @param material - 'Cu' o 'Al'
 * @returns Caída de tensión en %
 */
export function calculateTramoVDrop(
  power: number,
  length: number,
  section: number,
  voltage: '220V' | '380V',
  material: 'Cu' | 'Al' = 'Cu'
): number {
  if (section === 0 || length === 0 || power === 0) return 0;

  const v = voltage === '380V' ? 380 : 220;
  const isTrifasico = voltage === '380V';
  const rho = material === 'Cu' ? 0.0178 : 0.028; // Resistividad (Ohm*mm²/m)

  const ib = isTrifasico ? power / (380 * 1.732) : power / 220;
  const k = isTrifasico ? 1.732 : 2;
  const deltaV = (k * rho * length * ib) / section;

  return (deltaV / v) * 100;
}



// === FUNCIONES HELPER PARA VARIANTES DE CIRCUITOS ===

/**
 * Obtiene las variantes de circuitos habitacionales desde CSV o fallback
 * @param grado - Grado de electrificación (Mínimo, Medio, Elevado, Superior)
 * @returns Array de variantes disponibles para el grado especificado
 */
export function getHabitacionalCircuitVariants(grado: string): HabitacionalCircuitVariantData[] {
  const variants = LOADED_HABITACIONAL_VARIANTS.length > 0
    ? LOADED_HABITACIONAL_VARIANTS
    : [];  // CSV carga desde variantes_circuitos_habitacional.csv

  return variants.filter(v => v.grado === grado);
}

/**
 * Obtiene los tipos de circuitos válidos para el circuito "libre" en grado Superior
 * Consulta tipos_circuitos_lineas.csv para verificar que estén permitidos en viviendas
 * @returns Array de tipos de circuitos permitidos
 */
export function getValidFreeCircuitTypes(): CircuitTypeData[] {
  const circuitTypes = LOADED_CIRCUIT_TYPES.length > 0
    ? LOADED_CIRCUIT_TYPES
    : [];  // CSV carga desde tipos_circuitos_lineas.csv

  // Filtrar solo circuitos permitidos en viviendas
  return circuitTypes.filter(ct =>
    ct.permite_vivienda === 'Sí' &&
    ct.tipo_circuito !== 'linea_principal' &&
    ct.tipo_circuito !== 'circuito_seccional' &&
    ct.tipo_circuito !== 'cable_proteccion'
  );
}

/**
 * Obtiene opciones de circuitos libres para mostrar en el UI
 * @returns Array de opciones con sigla, designación y descripción
 */
export function getFreeCircuitOptions(): Array<{ sigla: string, designacion: string, observaciones: string }> {
  const validTypes = getValidFreeCircuitTypes();
  return validTypes.map(ct => ({
    sigla: ct.sigla,
    designacion: ct.designacion,
    observaciones: ct.observaciones
  }));
}

/**
 * Obtiene la intensidad admisible (Iz) Legacy para compatibilidad
 */
export function getIz(section: number, installationType: string, voltage: '220V' | '380V'): number {
  return calculateIz({
    method: installationType === 'Enterrado' ? 'D1' : 'B1',
    section,
    length: 0,
    material: 'Cu',
    groupingCount: 1,
    ambientTemp: installationType === 'Enterrado' ? 25 : 40,
    conduitMaterial: 'PVC'
  }, voltage);
}

/**
 * Secciones de cable disponibles en orden ascendente
 */
const AVAILABLE_SECTIONS = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35];

/**
 * Protecciones (PIAs) disponibles en orden ascendente
 */
const AVAILABLE_PROTECTIONS = [6, 10, 16, 20, 25, 32, 40, 63];

/**
 * Selecciona la combinación óptima de cable y protección para un circuito
 * Valida las inecuaciones normativas:
 * 1. Ib ≤ In ≤ Iz
 * 2. I2 ≤ 1.45 × Iz (donde I2 = 1.45×In para In≤32A, I2 = 1.30×In para In>32A)
 * 
 * @param ib - Corriente de proyecto del circuito (A)
 * @param circuitType - Tipo de circuito (IUG, TUG, etc.)
 * @param installationType - Tipo de instalación del panel
 * @param voltage - Tensión del circuito
 * @returns Objeto con sección, protección, validez y warnings
 */
export function selectOptimalCableAndProtection(
  ib: number,
  circuitType: string,
  installationType: string,
  voltage: '220V' | '380V'
): {
  section: number;
  In: number;
  valid: boolean;
  warnings: string[];
  Iz: number;
} {
  // Obtener especificaciones del tipo de circuito
  const spec = getCircuitTypeSpec(circuitType);
  if (!spec) {
    return {
      section: 2.5,
      In: 16,
      valid: false,
      warnings: [`⚠️ Tipo de circuito ${circuitType} no encontrado`],
      Iz: 0
    };
  }

  const minSection = spec.seccion_min_mm2;
  const maxIn = spec.max_proteccion_a > 0 ? spec.max_proteccion_a : 63;
  const warnings: string[] = [];

  // Filtrar secciones disponibles (≥ mínima)
  const validSections = AVAILABLE_SECTIONS.filter(s => s >= minSection);

  // Buscar la combinación óptima (menor sección que cumpla)
  for (const section of validSections) {
    const Iz = getIz(section, installationType, voltage);

    if (Iz === 0) {
      continue; // Sección no disponible para este método/tensión
    }

    // Buscar protecciones válidas que cumplan: Ib ≤ In ≤ Iz
    const candidateProtections = AVAILABLE_PROTECTIONS.filter(In =>
      In >= ib &&      // In debe proteger Ib
      In <= Iz &&      // In no debe exceder Iz
      In <= maxIn      // In debe respetar límite del circuito
    );

    // Probar cada protección candidata
    for (const In of candidateProtections) {
      // Calcular I2 según IEC 60898
      const I2 = In <= 32 ? 1.45 * In : 1.30 * In;

      // Verificar inecuación 2: I2 ≤ 1.45 × Iz
      if (I2 <= 1.45 * Iz) {
        // ✓ Combinación válida encontrada

        // Agregar info si se aumentó la sección
        if (section > minSection) {
          warnings.push(
            `ℹ️ Sección aumentada de ${minSection}mm² a ${section}mm² para cumplir normativa`
          );
        }

        // Agregar info si hay poco margen
        const margin = ((In - ib) / In) * 100;
        if (margin < 10) {
          warnings.push(
            `ℹ️ Margen reducido entre Ib (${ib.toFixed(2)}A) e In (${In}A): ${margin.toFixed(1)}%`
          );
        }

        return { section, In, valid: true, warnings, Iz };
      }
    }
  }

  // No se encontró combinación válida
  // Usar valores por defecto con warning crítico
  const fallbackSection = minSection;
  const fallbackIz = getIz(fallbackSection, installationType, voltage);
  const fallbackIn = AVAILABLE_PROTECTIONS.find(p => p >= ib && p <= maxIn) || maxIn;

  warnings.push(
    `⚠️ CRÍTICO: No se encontró combinación que cumpla inecuaciones normativas. ` +
    `Usando ${fallbackSection}mm² + ${fallbackIn}A (VERIFICAR MANUALMENTE)`
  );

  warnings.push(
    `Ib=${ib.toFixed(2)}A, Iz=${fallbackIz}A, In=${fallbackIn}A. ` +
    `Considere aumentar sección o reducir carga.`
  );

  return {
    section: fallbackSection,
    In: fallbackIn,
    valid: false,
    warnings,
    Iz: fallbackIz
  };
}

const IZ_TABLES = {
  'Embutido': {
    'monofasico': { 1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 66, 25: 88, 35: 109 },
    'trifasico': { 1.5: 13, 2.5: 18, 4: 24, 6: 36, 10: 42, 16: 56, 25: 75, 35: 92 }
  },
  'Enterrado': {
    'monofasico': { 1.5: 29, 2.5: 39, 4: 51, 6: 65, 10: 88, 16: 115, 25: 150, 35: 180 },
    'trifasico': { 1.5: 24, 2.5: 33, 4: 43, 6: 55, 10: 75, 16: 100, 25: 130, 35: 155 }
  }
};

// === MOTOR DE CÁLCULO PRINCIPAL ===

export function calculateProjectDemand(config: ProjectConfig, environments: EnvironmentCalculation[]): ProjectCalculation {
  const panelResults: Record<string, PanelCalculationResult> = {};
  const alerts: string[] = [];
  const warnings: string[] = [];

  const safePanels = config.panels || [];
  const safeEnvironments = environments || [];

  // 1. Determinar Grado de Electrificación y Motor
  // Usamos regimenUso si existe, sino destination (Legacy)
  const effectiveRegimen = config.regimenUso || (
    ['vivienda', 'departamento', 'departamento_ph'].includes(config.destination) ? 'habitacional' :
      (['oficina', 'comercio', 'local'].includes(config.destination) ? 'comercial' :
        (config.destination === 'industria' ? 'industrial' : 'comercial'))
  );

  const grade = calculateElectrificationGrade(effectiveRegimen, config.surfaceArea);
  const engine = determineCalculationEngine(config);

  const envsByPanel: Record<string, EnvironmentCalculation[]> = {};
  safePanels.forEach(p => envsByPanel[p.id] = []);

  safeEnvironments.forEach(env => {
    const targetId = env.panelId || safePanels.find(p => p.type === 'TP')?.id || 'TP-MAIN';
    if (!envsByPanel[targetId]) envsByPanel[targetId] = [];
    envsByPanel[targetId].push(env);
  });

  // Ordenar paneles para procesar desde las hojas hacia la raíz
  // Esto asegura que las cargas se acumulen correctamente: TS → TSG → TP
  const sortedPanels = [...safePanels].sort((a, b) => {
    // Función helper para contar niveles de profundidad
    const getDepth = (panel: Panel): number => {
      let depth = 0;
      let current = panel;
      while (current.parentId) {
        depth++;
        current = safePanels.find(p => p.id === current.parentId) || current;
        if (!current.parentId) break;
      }
      return depth;
    };

    const depthA = getDepth(a);
    const depthB = getDepth(b);

    // Ordenar por profundidad descendente (hojas primero)
    return depthB - depthA;
  });
  const panelUpstreamLoads: Record<string, number> = {};

  sortedPanels.forEach(panel => {
    // Calcular caída de tensión acumulada del tablero ANTES de procesar circuitos
    // Esto permite pasar el valor a los circuitos terminales
    let vDropAccumPanel = 0;
    if (panel.parentId && panelResults[panel.parentId]) {
      vDropAccumPanel = panelResults[panel.parentId].voltageDropAccumulated;
    }

    const panelEnvs = envsByPanel[panel.id] || [];
    const ctResults = calculatePanelCircuits(panel, panelEnvs, config, grade, engine, vDropAccumPanel);

    let totalAritmeticVA = ctResults.aritmeticPower;
    let maxDownstreamBreaker = ctResults.maxBreakerValue;

    safePanels.filter(p => p.parentId === panel.id).forEach(child => {
      if (panelUpstreamLoads[child.id]) {
        totalAritmeticVA += panelUpstreamLoads[child.id];
        const childRes = panelResults[child.id];
        if (childRes) {
          const childIn = parseInt(childRes.suggestedBreaker.replace(/\\D/g, ''));
          if (childIn > maxDownstreamBreaker) maxDownstreamBreaker = childIn;
        }
      }
    });

    const dpms = engine === 'RES54_EXISTENTE' ? totalAritmeticVA * 0.8 : totalAritmeticVA * ctResults.fs;
    const ib = dpms / (panel.voltage === '380V' ? (1.732 * 380) : 220);

    const lineType = panel.type === 'TP' ? 'principal' : 'seccional';
    const protection = suggestHierarchicalProtection(ib, panel, lineType, maxDownstreamBreaker);

    const vDropLocal = calculateVoltageDrop(ib, parseFloat(protection.suggestedCable), panel.feederDistance, panel.voltage === '380V', panel.voltage);

    let vDropAccum = vDropLocal + vDropAccumPanel;

    panelResults[panel.id] = {
      totalPower: dpms, current: ib, ...protection,
      voltageDropLocal: vDropLocal, voltageDropAccumulated: vDropAccum,
      circuits: ctResults.circuits
    };
    panelUpstreamLoads[panel.id] = dpms;
  });

  const tpId = safePanels.find(p => p.type === 'TP')?.id || '';
  const totalDPMS = panelResults[tpId]?.totalPower || 0;

  // Unificación de Resultados Totales
  const totalKW = (totalDPMS * 0.85) / 1000;

  // Validaciones AVP
  if (config.estadoObra === 'provisoria') {
    if (totalKW > 10) {
      alerts.push(`EXCESO POTENCIA AVP: La potencia total (${totalKW.toFixed(1)} kW) supera el límite de 10 kW permitido para Suministro Transitorio.`);
    }
  }

  // Validación de distancia Medidor-TP (AEA 770)
  if (config.medidor && config.medidor.distanciaATP > 2) {
    alerts.push(`⚠️ DISTANCIA M-TP EXCEDIDA: La distancia del Medidor al Tablero Principal (${config.medidor.distanciaATP.toFixed(2)}m) supera el máximo permitido de 2m según AEA 770. Se requiere un Tablero Seccional General (TSG) en el interior del inmueble.`);
  }

  // Advertencias Normativas (Desactivar para Existente - Carga Manual Pura)
  if (engine !== 'RES54_EXISTENTE') {
    // Validar bocas mínimas aquí si fuera necesario
  }

  return {
    grade,
    totalBocas: safeEnvironments.reduce((acc, e) => acc + (e.lights || 0) + (e.regularOutlets || 0), 0),
    totalDPMS,
    totalKW,
    panels: panelResults,
    alerts,
    warnings
  };
}

// === MOTOR DE CÁLCULO PARA INSTALACIONES EXISTENTES (RES. 54/2018) ===

/**
 * Calcula la potencia según Resolución 54/2018 para instalaciones existentes
 * @param bocasLuz - Cantidad de bocas de iluminación
 * @param bocasTomas - Cantidad de bocas de tomas
 * @param cargasEspeciales - Suma de cargas especiales en VA (≥500 VA)
 * @returns Objeto con VA totales, DPMS, kW y alertas
 */
export function calcularPotenciaRes54(
  bocasLuz: number,
  bocasTomas: number,
  cargasEspeciales: number = 0
): {
  vaTotal: number;
  dpms: number;
  kw: number;
  alerts: string[];
  warnings: string[];
} {
  const alerts: string[] = [];
  const warnings: string[] = [];

  // Paso 1: Sumar (BocasLuz × 25 VA) + (BocasTomas × 240 VA) + CargasEspeciales
  const vaIluminacion = bocasLuz * 25;
  const vaTomas = bocasTomas * 240;
  const vaTotal = vaIluminacion + vaTomas + cargasEspeciales;

  // Paso 2: Multiplicar por 0.8 (Coeficiente de simultaneidad Res. 54/2018)
  const dpms = vaTotal * 0.8;

  // Paso 3: Multiplicar por 0.85 (Factor de potencia) para obtener Watts
  const watts = dpms * 0.85;
  const kw = watts / 1000;

  // Paso 4: Validación de 10 kW para categoría profesional
  if (kw > 10) {
    alerts.push(
      `⚠️ ATENCIÓN: La potencia calculada (${kw.toFixed(2)} kW) supera los 10 kW. ` +
      `Según normativa ERSeP, esta certificación requiere un profesional Categoría I o II. ` +
      `Los instaladores Categoría III solo pueden certificar hasta 10 kW.`
    );
  }

  // Validaciones adicionales
  if (bocasLuz === 0 && bocasTomas === 0) {
    warnings.push('⚠️ No se han ingresado bocas de luz ni tomas. Verifique los datos.');
  }

  if (cargasEspeciales > 0 && cargasEspeciales < 500) {
    warnings.push('⚠️ Las cargas especiales menores a 500 VA deberían considerarse como tomas generales.');
  }

  return {
    vaTotal,
    dpms,
    kw,
    alerts,
    warnings
  };
}

// === MOTOR DE CÁLCULO PARA INDUSTRIA (AEA 771.8.VII) ===

/**
 * Calcula PMU y DPMS para instalaciones industriales según AEA 771.8.VII
 * IMPORTANTE: Esta función es 100% basada en datos CSV (pmu_industrial.csv)
 * @param superficie - Superficie en m²
 * @param perimetro - Perímetro en metros
 * @param alturaLuminarias - Altura de luminarias en metros
 * @param grado - Grado de electrificación (Mínimo, Medio, Elevado, Superior)
 * @returns Cálculo de bocas y DPMS industrial
 */
export function calculateIndustrialPMU(
  superficie: number,
  perimetro: number,
  alturaLuminarias: number,
  grado: string
): {
  bocasIUG: number;
  bocasTUG: number;
  bocasTUE: number;
  dpmsIUG: number;
  dpmsTUG: number;
  dpmsTUE: number;
  dpmsTotal: number;
  kw: number;
} {
  // Obtener configuración PMU desde CSV
  const config = getIndustrialPMUConfig(grado, alturaLuminarias);

  if (!config) {
    console.error(`❌ No se pudo obtener configuración PMU para grado=${grado}, altura=${alturaLuminarias}`);
    throw new Error(`Configuración PMU industrial no encontrada para grado ${grado}`);
  }

  console.log(`📊 Usando configuración PMU Industrial desde CSV:`, {
    grado: config.grado,
    altura: `${config.altura_min}-${config.altura_max}m`,
    m2_por_boca: config.m2_por_boca_iug,
    bocas_min_iug: config.bocas_min_iug
  });

  // Calcular bocas IUG según superficie (100% desde CSV)
  const bocasIUGCalculadas = Math.ceil(superficie / config.m2_por_boca_iug);
  const bocasIUG = Math.max(bocasIUGCalculadas, config.bocas_min_iug);

  // Calcular bocas TUG según perímetro (100% desde CSV)
  const bocasTUGCalculadas = Math.ceil(perimetro / config.m_perimetro_por_boca_tug);
  const bocasTUG = Math.max(bocasTUGCalculadas, config.bocas_min_tug);

  // Calcular bocas TUE según perímetro (100% desde CSV)
  let bocasTUE = 0;
  if (config.m_perimetro_por_boca_tue > 0) {
    const bocasTUECalculadas = Math.ceil(perimetro / config.m_perimetro_por_boca_tue);
    bocasTUE = Math.max(bocasTUECalculadas, config.bocas_min_tue);
  }

  // DPMS Industrial (AEA 771.8.VII)
  // NOTA: Estos valores podrían también venir del CSV en el futuro
  const dpmsIUG = bocasIUG * 40;      // 40 VA por boca de luz (AEA)
  const dpmsTUG = bocasTUG * 2200;    // 2200 VA por circuito TUG
  const dpmsTUE = bocasTUE * 2200;    // 2200 VA por circuito TUE

  const dpmsTotal = dpmsIUG + dpmsTUG + dpmsTUE;
  const kw = (dpmsTotal * 0.85) / 1000; // Factor de potencia 0.85

  return {
    bocasIUG,
    bocasTUG,
    bocasTUE,
    dpmsIUG,
    dpmsTUG,
    dpmsTUE,
    dpmsTotal,
    kw
  };
}

/**
 * Calcula y agrega caída de tensión a un circuito terminal
 * Usa In (térmica) para validación conservadora según criterio de seguridad
 * @param circuit - Circuito a procesar
 * @param vDropAccumPanel - Caída acumulada desde M hasta el tablero
 * @param voltage - Tensión del circuito
 * @param isTrifasico - Si es trifásico
 * @param avgDistance - Distancia promedio del circuito terminal (default: 15m)
 */
function addVoltageDropToCircuit(
  circuit: CircuitSummary,
  vDropAccumPanel: number,
  voltage: '220V' | '380V',
  isTrifasico: boolean,
  avgDistance: number = 15
): void {
  // Extraer In (corriente nominal de la térmica) del breaker
  const breakerMatch = circuit.breaker.match(/(\d+)A/);
  const In = breakerMatch ? parseInt(breakerMatch[1]) : circuit.ib;

  // Extraer sección del cable
  const cableMatch = circuit.cable.match(/([\d.]+)/);
  const cableSection = cableMatch ? parseFloat(cableMatch[1]) : 2.5;

  // Calcular caída de tensión del tramo CT usando In (más conservador que Ib)
  const vDropLocal = calculateVoltageDrop(
    In,  // Usar In en lugar de Ib para validación conservadora
    cableSection,
    avgDistance,
    isTrifasico,
    voltage
  );

  // Caída total = acumulada del tablero + local del CT
  const vDropTotal = vDropAccumPanel + vDropLocal;

  // Agregar campos al circuito
  circuit.voltageDropLocal = vDropLocal;
  circuit.voltageDropAccumulated = vDropAccumPanel;
  circuit.voltageDropTotal = vDropTotal;
  circuit.warnings = circuit.warnings || [];

  // Validar límites normativos según tipo de circuito
  const isLighting = circuit.type === 'IUG' || circuit.type === 'IUE';
  const limit = isLighting ? 3 : 5;  // 3% iluminación, 5% fuerza motriz
  const limitType = isLighting ? 'Iluminación' : 'Fuerza Motriz';

  if (vDropTotal > limit) {
    circuit.warnings.push(
      `⚠️ CAÍDA DE TENSIÓN EXCEDIDA: ${vDropTotal.toFixed(2)}% > ${limit}% (${limitType}). ` +
      `Tramos: M→Tablero ${vDropAccumPanel.toFixed(2)}% + Tablero→Boca ${vDropLocal.toFixed(2)}%. ` +
      `Considere aumentar sección de cable o reducir distancia.`
    );
  }
}

/**
 * Determina si un tipo de circuito aplica factor de simultaneidad
 * Según AEA 770/771: Solo IUG, TUG, IUE, TUE aplican FS
 * Circuitos específicos (ACU, APM, OCE, etc.) se suman al 100%
 */
export function circuitAppliesFS(circuitType: string): boolean {
  const spec = getCircuitTypeSpec(circuitType);
  if (!spec) return false;

  // Prioridad: Columna explícita 'aplica_fs'
  if (spec.aplica_fs === 'Sí' || spec.aplica_fs === 'SI') return true;
  if (spec.aplica_fs === 'No' || spec.aplica_fs === 'NO') return false;

  // Fallback: Inferir por tipo de circuito (AEA standard)
  // Uso General y Especial aplican FS. Uso Específico (ACU, etc) va al 100%
  return spec.tipo_circuito === 'uso_general' || spec.tipo_circuito === 'uso_especial';
}

/**
 * Obtiene el máximo de bocas permitido para un tipo de circuito
 * Retorna 0 si no tiene límite (circuitos específicos como ACU, APM)
 */
export function getMaxBocasForCircuit(circuitType: string): number {
  const spec = getCircuitTypeSpec(circuitType);
  if (!spec) return 15; // Default seguro
  return spec.max_bocas > 0 ? spec.max_bocas : 0;
}

/**
 * Calcula el Factor de Simultaneidad según AEA 770/771
 * Solo aplica a circuitos de uso general y especial (IUG, TUG, IUE, TUE)
 * 
 * Tabla correcta:
 * - 2 circuitos: FS = 1.0
 * - 3-4 circuitos: FS = 0.8
 * - 5 circuitos: FS = 0.7
 * - 6+ circuitos: FS = 0.6
 */
function calculateSimultaneityFactor(circuits: CircuitSummary[]): number {
  // Contar solo circuitos que aplican FS
  const applicableCircuits = circuits.filter(c => circuitAppliesFS(c.type));
  const n = applicableCircuits.length;

  if (n <= 2) return 1.0;
  if (n >= 3 && n <= 4) return 0.8;
  if (n === 5) return 0.7;
  return 0.6; // 6 o más
}

export function calculatePanelCircuits(
  panel: Panel,
  envs: EnvironmentCalculation[],
  config: ProjectConfig,
  grade: string,
  engine: string,
  vDropAccumPanel: number = 0
): {
  circuits: CircuitSummary[],
  aritmeticPower: number,
  generalPower: number,
  specificPower: number,
  fs: number,
  dpms: number,
  cargaTotalKW: number,
  maxBreakerValue: number
} {
  const circuits: CircuitSummary[] = [];
  let maxBreakerValue = 0;
  let fs = 1.0;

  if (engine === 'RES54_EXISTENTE') {
    if (config.circuitInventory && config.circuitInventory.circuits.length > 0) {
      const panelCircuits = config.circuitInventory.circuits.filter(c => c.assignedPanelId === panel.id);
      panelCircuits.forEach(c => {
        circuits.push({
          id: c.id,
          panelId: panel.id,
          type: c.type,
          description: c.description,
          bocas: c.bocas,
          power: c.power,
          ib: c.ib,
          cable: c.cable,
          breaker: c.breaker,
          warnings: c.warnings
        });
        const breakerMatch = c.breaker.match(/(\d+)A/);
        if (breakerMatch) {
          maxBreakerValue = Math.max(maxBreakerValue, parseInt(breakerMatch[1]));
        }
      });
      const aritmeticPower = circuits.reduce((acc, c) => acc + c.power, 0);
      const dpms = aritmeticPower * 0.8;
      return {
        circuits,
        aritmeticPower,
        generalPower: aritmeticPower,
        specificPower: 0,
        fs: 0.8,
        dpms,
        cargaTotalKW: (dpms * 0.85) / 1000,
        maxBreakerValue
      };
    }

    const totalIug = envs.reduce((s, e) => s + (e.bocasLuzRelevado || e.lights || e.bocasLuz || 0), 0);
    const totalTug = envs.reduce((s, e) => s + (e.bocasTomasRelevado || e.regularOutlets || e.bocasTomas || 0), 0);
    const stotal = (totalIug * 25) + (totalTug * 240);
    const dpms = stotal * 0.8;

    return {
      circuits: [],
      aritmeticPower: stotal,
      generalPower: stotal,
      specificPower: 0,
      fs: 0.8,
      dpms,
      cargaTotalKW: (dpms * 0.85) / 1000,
      maxBreakerValue: 0
    };

  } else if (engine === 'PMU_INDUSTRIAL') {
    const variant = getCircuitVariant(grade, config.selectedVariantIndex || 0);

    if (!variant) {
      const fallbackVariants = getAvailableCircuitVariants(grade);
      const res = buildIndustrialCircuitsFromVariant(panel, envs, config, grade, fallbackVariants[0]);
      const dpms = res.aritmeticPower * res.fs;
      return {
        ...res,
        generalPower: res.aritmeticPower,
        specificPower: 0,
        dpms,
        cargaTotalKW: (dpms * 0.85) / 1000
      };
    }

    const res = buildIndustrialCircuitsFromVariant(panel, envs, config, grade, variant);
    const dpms = res.aritmeticPower * res.fs;
    return {
      ...res,
      generalPower: res.aritmeticPower,
      specificPower: 0,
      dpms,
      cargaTotalKW: (dpms * 0.85) / 1000
    };

  } else {
    // MOTOR NORMAL (AEA 770/771)
    const variantIndex = config.selectedVariantIndex || 0;
    const variant = (CIRCUIT_VARIANTS as any)[grade]?.[variantIndex] || CIRCUIT_VARIANTS['Mínimo'][0];
    const iugSpec = getCircuitTypeSpec('IUG');
    const tugSpec = getCircuitTypeSpec('TUG');

    for (let i = 1; i <= variant.iug; i++) {
      const bocas = envs.filter(e => e.assignedIugCircuit === `IUG-${i}` || (!e.assignedIugCircuit && i === 1))
        .reduce((sum, e) => sum + (e.bocasLuzRelevado || e.bocasLuz || 0) + (e.bocasLuzProyectado || e.lights || 0), 0);
      const pwr = Math.ceil((bocas * 60 * 2) / 3);
      const ib = pwr / 220;

      if (bocas > 0 && iugSpec) {
        const optimization = selectOptimalCableAndProtection(ib, 'IUG', panel.installationType, panel.voltage as '220V' | '380V');
        circuits.push({
          id: `IUG-${i}`,
          panelId: panel.id,
          type: 'IUG',
          description: `Iluminación Ref. ${i}`,
          bocas,
          power: pwr,
          ib: ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings
        });
        maxBreakerValue = Math.max(maxBreakerValue, optimization.In);
      }
    }

    for (let i = 1; i <= variant.tug; i++) {
      const bocas = envs.filter(e => e.assignedTugCircuit === `TUG-${i}` || (!e.assignedTugCircuit && i === 1))
        .reduce((sum, e) => sum + (e.bocasTomasRelevado || e.bocasTomas || 0) + (e.bocasTomasProyectado || e.regularOutlets || 0), 0);
      const pwr = bocas > 0 ? 2200 : 0;
      const ib = pwr / 220;

      if (bocas > 0 && tugSpec) {
        const optimization = selectOptimalCableAndProtection(ib, 'TUG', panel.installationType, panel.voltage as '220V' | '380V');
        circuits.push({
          id: `TUG-${i}`,
          panelId: panel.id,
          type: 'TUG',
          description: `Tomas Ref. ${i}`,
          bocas,
          power: pwr,
          ib: ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings
        });
        maxBreakerValue = Math.max(maxBreakerValue, optimization.In);
      }
    }

    // Cargas Especiales
    envs.forEach(env => {
      env.specialLoads?.forEach((load, idx) => {
        const pwr = load.unit === 'W' ? load.value / 0.85 : load.value;
        const ib = pwr / (load.isThreePhase ? (1.732 * 380) : 220);
        const optimization = selectOptimalCableAndProtection(ib, load.type, panel.installationType, panel.voltage as '220V' | '380V');

        circuits.push({
          id: `${load.type}-${env.id.substring(0, 4)}-${idx + 1}`,
          panelId: panel.id,
          type: load.type,
          description: `${load.name || load.type}: ${env.name}`,
          bocas: load.bocas || 1,
          power: pwr,
          ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings
        });
        maxBreakerValue = Math.max(maxBreakerValue, optimization.In);
      });
    });

    const isTrifasico = panel.voltage === '380V';
    circuits.forEach(circuit => {
      addVoltageDropToCircuit(circuit, vDropAccumPanel, panel.voltage, isTrifasico);
    });

    const generalCircuits = circuits.filter(c => circuitAppliesFS(c.type));
    const specificCircuits = circuits.filter(c => !circuitAppliesFS(c.type));
    const generalPower = generalCircuits.reduce((acc, c) => acc + c.power, 0);
    const specificPower = specificCircuits.reduce((acc, c) => acc + c.power, 0);

    fs = 1.0;
    if (config.estadoObra === 'provisoria') {
      fs = 1.0;
    } else {
      fs = calculateSimultaneityFactor(circuits);
    }

    const dpms = (generalPower * fs) + specificPower;
    const cargaTotalKW = (dpms * 0.85) / 1000;
    const aritmeticPower = circuits.reduce((acc, c) => acc + c.power, 0);

    return {
      circuits,
      aritmeticPower,
      generalPower,
      specificPower,
      fs,
      dpms,
      cargaTotalKW,
      maxBreakerValue
    };
  }
}

/**
 * Construye circuitos industriales según variante CSV
 * @param panel - Panel al que pertenecen los circuitos
 * @param envs - Ambientes del proyecto
 * @param config - Configuración del proyecto
 * @param grade - Grado de electrificación
 * @param variant - Variante de circuitos desde CSV
 */
function buildIndustrialCircuitsFromVariant(
  panel: Panel,
  _envs: EnvironmentCalculation[],
  config: ProjectConfig,
  grade: string,
  variant: CircuitVariantData
) {
  const circuits: CircuitSummary[] = [];
  let maxBreakerValue = 0;

  // Calcular PMU industrial total
  const indCalc = calculateIndustrialPMU(
    config.surfaceArea,
    config.perimeter || 0,
    config.luminaireHeight || 3,
    grade
  );

  // Obtener especificaciones desde CSV
  const iugSpec = getCircuitTypeSpec('IUG');
  const tugSpec = getCircuitTypeSpec('TUG');
  const iueSpec = getCircuitTypeSpec('IUE');
  const tueSpec = getCircuitTypeSpec('TUE');

  // Crear circuitos IUG según variante
  if (variant.iug > 0 && iugSpec) {
    const bocasPorCircuito = Math.ceil(indCalc.bocasIUG / variant.iug);
    const powerPorCircuito = Math.ceil(indCalc.dpmsIUG / variant.iug);

    for (let i = 1; i <= variant.iug; i++) {
      circuits.push({
        id: `IND-IUG-${i}`,
        panelId: panel.id,
        type: 'IUG',
        description: `Iluminación Industrial ${i}`,
        bocas: bocasPorCircuito,
        power: powerPorCircuito,
        ib: powerPorCircuito / 220,
        cable: `${iugSpec.seccion_min_mm2}mm²`,
        breaker: `${iugSpec.max_proteccion_a}A`
      });
      maxBreakerValue = Math.max(maxBreakerValue, iugSpec.max_proteccion_a);
    }
  }

  // Crear circuitos TUG según variante
  if (variant.tug > 0 && tugSpec) {
    const bocasPorCircuito = Math.ceil(indCalc.bocasTUG / variant.tug);
    const powerPorCircuito = Math.ceil(indCalc.dpmsTUG / variant.tug);

    for (let i = 1; i <= variant.tug; i++) {
      circuits.push({
        id: `IND-TUG-${i}`,
        panelId: panel.id,
        type: 'TUG',
        description: `Tomas Industrial ${i}`,
        bocas: bocasPorCircuito,
        power: powerPorCircuito,
        ib: powerPorCircuito / 220,
        cable: `${tugSpec.seccion_min_mm2}mm²`,
        breaker: `${tugSpec.max_proteccion_a}A`
      });
      maxBreakerValue = Math.max(maxBreakerValue, tugSpec.max_proteccion_a);
    }
  }

  // Crear circuitos IUE según variante
  if (variant.iue > 0 && iueSpec) {
    circuits.push({
      id: 'IND-IUE',
      panelId: panel.id,
      type: 'IUE',
      description: 'Iluminación Uso Especial Industrial',
      bocas: 1,
      power: 2200, // Potencia típica IUE
      ib: 2200 / 220,
      cable: `${iueSpec.seccion_min_mm2}mm²`,
      breaker: `${iueSpec.max_proteccion_a}A`
    });
    maxBreakerValue = Math.max(maxBreakerValue, iueSpec.max_proteccion_a);
  }

  // Crear circuitos TUE según variante
  if (variant.tue > 0 && indCalc.bocasTUE > 0 && tueSpec) {
    circuits.push({
      id: 'IND-TUE',
      panelId: panel.id,
      type: 'TUE',
      description: 'Fuerza Motriz / TUE Industrial',
      bocas: indCalc.bocasTUE,
      power: indCalc.dpmsTUE,
      ib: indCalc.dpmsTUE / 220,
      cable: `${tueSpec.seccion_min_mm2}mm²`,
      breaker: `${tueSpec.max_proteccion_a}A`
    });
    maxBreakerValue = Math.max(maxBreakerValue, tueSpec.max_proteccion_a);
  }

  const aritmeticPower = circuits.reduce((acc, c) => acc + c.power, 0);
  const fs = 0.8; // Factor de simultaneidad industrial

  return { circuits, aritmeticPower, fs, maxBreakerValue };
}

export function suggestHierarchicalProtection(ib: number, panel: Panel, lineType: string, minIn: number) {
  const sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
  const breakers = [10, 16, 20, 25, 32, 40, 50, 63];

  let minS = 1.5;
  if (lineType === 'principal') minS = MIN_SECTIONS.acometida;
  if (lineType === 'seccional') minS = MIN_SECTIONS.seccional;

  let s = sections.find(sec => sec >= minS && getIz(sec, panel.installationType, panel.voltage as '220V' | '380V') > ib) || 4;
  let iz = getIz(s, panel.installationType, panel.voltage as '220V' | '380V');

  let inVal = breakers.find(v => v >= ib && v > minIn && v <= iz);
  if (!inVal) inVal = breakers.find(v => v >= ib && v >= minIn && v <= iz) || minIn;

  if (inVal > iz) {
    s = sections.find(sec => getIz(sec, panel.installationType, panel.voltage as '220V' | '380V') >= inVal) || s;
  }

  const isTri = panel.voltage === '380V';
  const p = isTri ? '4x' : '2x';
  return { suggestedCable: s.toString(), suggestedBreaker: `${p}${inVal}A`, suggestedDifferential: `${p}${inVal >= 40 ? 63 : 40}A 30mA` };
}

export function calculateVoltageDrop(i: number, s: number, l: number, isTri: boolean, sysV: string) {
  if (s <= 0) return 0;
  const deltaV = ((isTri ? 1.732 : 2) * l * i * 0.85) / (56 * s);
  return (deltaV / (sysV === '380V' ? 380 : 220)) * 100;
}

export function calculateEnvironmentBocas(
  surface: number,
  name: string,
  grade: string = 'Mínimo',
  destination: string = 'vivienda',
  length?: number
) {
  const n = name.toLowerCase();

  // AEA 770 - VIVIENDAS (USAR CSV PMU HABITACIONAL)
  if (destination === 'vivienda') {
    const pmuData = LOADED_HABITACIONAL_PMU.length > 0
      ? LOADED_HABITACIONAL_PMU
      : [];  // CSV carga desde pmu_habitacional.csv

    // Normalizar nombre de ambiente para búsqueda
    let ambienteNormalizado = n;
    if (n.includes('sala') || n.includes('comedor') || n.includes('estudio')) {
      ambienteNormalizado = 'sala_comedor_estudio';
    } else if (n.includes('dormitorio') || n.includes('habitación') || n.includes('cuarto')) {
      ambienteNormalizado = 'dormitorio';
    } else if (n.includes('cocina')) {
      ambienteNormalizado = 'cocina';
    } else if (n.includes('baño')) {
      ambienteNormalizado = 'baño';
    } else if (n.includes('vestíbulo') || n.includes('vestibulo') || n.includes('garaje') || n.includes('hall')) {
      ambienteNormalizado = 'vestibulo_garaje_hall';
    } else if (n.includes('pasillo') || n.includes('corredor')) {
      ambienteNormalizado = 'pasillo';
    } else if (n.includes('lavadero') || n.includes('lavandería')) {
      ambienteNormalizado = 'lavadero';
    } else if (n.includes('balcón') || n.includes('balcon') || n.includes('galería') || n.includes('galeria') || n.includes('terraza')) {
      ambienteNormalizado = 'balcon_galeria';
    }

    // Buscar regla que aplique según grado, ambiente y área
    const rule = pmuData.find(d =>
      d.grado === grade &&
      d.ambiente === ambienteNormalizado &&
      surface >= d.area_min &&
      surface < d.area_max
    );

    if (rule) {
      // Calcular IUG según fórmula del CSV
      let lights = rule.iug_base;

      // Agregar bocas según área
      if (rule.iug_m2_step > 0) {
        lights += Math.floor(surface / rule.iug_m2_step);
      }

      // Agregar bocas según longitud (para pasillos)
      if (rule.iug_long_step > 0 && length && length > 0) {
        lights += Math.floor(length / rule.iug_long_step);
      }

      // Calcular TUG según fórmula del CSV
      let regularOutlets = rule.tug_base;

      // Agregar bocas según área
      if (rule.tug_m2_step > 0) {
        regularOutlets += Math.floor(surface / rule.tug_m2_step);
      }

      // Agregar bocas según longitud (para pasillos)
      if (rule.tug_long_step > 0 && length && length > 0) {
        regularOutlets += Math.floor(length / rule.tug_long_step);
      }

      // Aplicar mínimo de TUG
      regularOutlets = Math.max(regularOutlets, rule.tug_min);

      return { lights, regularOutlets, specialOutlets: 0 };
    }

    // Fallback si no se encuentra regla específica
    console.warn(`⚠️ No se encontró regla PMU para: grado=${grade}, ambiente=${ambienteNormalizado}, área=${surface}m². Usando valores por defecto.`);
    return { lights: 1, regularOutlets: 2, specialOutlets: 0 };
  }

  // AEA 771 - OFICINAS Y LOCALES COMERCIALES (MANTENER LÓGICA EXISTENTE)
  if (destination === 'oficina' || destination === 'comercio') {
    const isElevadoOrSuperior = (grade === 'Elevado' || grade === 'Superior');

    // Salón general
    if (n.includes('salón general')) {
      return {
        lights: Math.max(1, Math.ceil(surface / 9)),
        regularOutlets: Math.max(2, Math.ceil((surface / 9) * 2)),
        specialOutlets: 0
      };
    }

    // Sala de reuniones
    if (n.includes('sala de reuniones')) {
      return {
        lights: Math.max(1, Math.ceil(surface / 9)),
        regularOutlets: Math.max(2, Math.ceil((surface / 9) * 2)),
        specialOutlets: 0
      };
    }

    // Despacho privado
    if (n.includes('despacho')) {
      return { lights: 1, regularOutlets: 2, specialOutlets: 0 };
    }

    // Cocina
    if (n.includes('cocina')) {
      return {
        lights: isElevadoOrSuperior ? 2 : 1,
        regularOutlets: isElevadoOrSuperior ? 3 : 2,
        specialOutlets: 0
      };
    }

    // Baño
    if (n.includes('baño')) {
      return {
        lights: isElevadoOrSuperior ? Math.max(1, Math.ceil(surface / 18)) : 1,
        regularOutlets: isElevadoOrSuperior ? 2 : 1,
        specialOutlets: 0
      };
    }

    // Vestíbulo/Recepción
    if (n.includes('vestíbulo') || n.includes('recepción')) {
      return {
        lights: Math.max(1, Math.ceil(surface / 9)),
        regularOutlets: Math.max(1, Math.ceil(surface / 18)),
        specialOutlets: 0
      };
    }

    // Pasillo (estimación: longitud ≈ sqrt(surface) * 2)
    if (n.includes('pasillo')) {
      const estimatedLength = Math.sqrt(surface) * 2;
      return {
        lights: Math.max(1, Math.ceil(estimatedLength / 5)),
        regularOutlets: Math.max(1, Math.ceil(estimatedLength / 5)),
        specialOutlets: 0
      };
    }

    // Default para otros ambientes de oficina/comercio
    return { lights: 1, regularOutlets: 2, specialOutlets: 0 };
  }

  // Otros destinos - genérico
  return { lights: 1, regularOutlets: 2, specialOutlets: 0 };
}

export function validateCircuitBocasLimit(
  circuitType: string,
  bocasCount: number
): { valid: boolean; maxAllowed: number; warning?: string } {
  // Buscar especificación del circuito en los datos cargados
  const circuits = LOADED_CIRCUIT_TYPES.length > 0
    ? LOADED_CIRCUIT_TYPES
    : [];  // CSV carga desde tipos_circuitos_lineas.csv

  const spec = circuits.find(c => c.sigla === circuitType);

  // Si no se encuentra el tipo o no tiene límite definido (-1 o 0), no hay restricción
  if (!spec || spec.max_bocas <= 0) {
    return { valid: true, maxAllowed: -1 }; // Sin límite
  }

  // Validar si excede el máximo
  if (bocasCount > spec.max_bocas) {
    return {
      valid: false,
      maxAllowed: spec.max_bocas,
      warning: `⚠️ El circuito ${circuitType} tiene ${bocasCount} bocas, excediendo el máximo permitido de ${spec.max_bocas} según ${spec.normativa}. Se recomienda dividir en múltiples circuitos.`
    };
  }

  return { valid: true, maxAllowed: spec.max_bocas };
}











// 13. Cargar Tablas Iz (Intensidades Admisibles)





/**
 * Obtiene los tipos de circuitos disponibles para un destino y trámite
 */
export function getAvailableCircuitTypes(destino: string, tramite: string): CircuitTypeData[] {
  const circuits = LOADED_CIRCUIT_TYPES.length > 0 ? LOADED_CIRCUIT_TYPES : [];  // CSV carga desde tipos_circuitos_lineas.csv

  // Mapear destino a columna
  const destinoCol = `permite_${destino}` as keyof CircuitTypeData;

  // Determinar si es instalación nueva o existente
  const tipoCol = tramite.includes('NUEVA') || tramite.includes('AMPLIACION') ? 'requiere_nueva' : 'requiere_existente';

  return circuits.filter(c =>
    c[destinoCol] === 'Sí' && c[tipoCol as keyof CircuitTypeData] === 'Sí'
  );
}

/**
 * Obtiene las especificaciones técnicas de un tipo de circuito desde CSV
 * @param sigla - Sigla del circuito (IUG, TUG, TUE, etc.)
 * @returns Especificaciones del circuito o undefined
 */
export function getCircuitTypeSpec(sigla: string): CircuitTypeData | undefined {
  const circuits = LOADED_CIRCUIT_TYPES.length > 0
    ? LOADED_CIRCUIT_TYPES
    : [];  // CSV carga desde tipos_circuitos_lineas.csv

  return circuits.find(c => c.sigla === sigla);
}

/**
 * Obtiene la sección mínima de cable para un tipo de circuito desde CSV
 * @param sigla - Sigla del circuito (IUG, TUG, etc.)
 * @param isTrifasico - Si es instalación trifásica
 * @returns Sección mínima en mm²
 */
export function getMinCableSection(sigla: string, isTrifasico: boolean = false): number {
  const spec = getCircuitTypeSpec(sigla);
  if (!spec) {
    console.warn(`⚠️ No se encontró especificación para circuito ${sigla}, usando 1.5mm²`);
    return 1.5; // Fallback ultra-seguro
  }

  return isTrifasico ? spec.seccion_min_tri_mm2 : spec.seccion_min_mm2;
}

/**
 * Obtiene la protección máxima permitida para un tipo de circuito desde CSV
 * @param sigla - Sigla del circuito
 * @returns Amperaje máximo de protección (-1 = sin límite específico)
 */
export function getMaxProtection(sigla: string): number {
  const spec = getCircuitTypeSpec(sigla);
  if (!spec) {
    console.warn(`⚠️ No se encontró especificación para circuito ${sigla}, usando 16A`);
    return 16; // Fallback
  }

  return spec.max_proteccion_a > 0 ? spec.max_proteccion_a : 63; // -1 = sin límite, usar 63A como máximo práctico
}

/**
 * Obtiene las variantes de circuitos disponibles para un grado de electrificación industrial
 * @param grado - Grado de electrificación (Mínimo, Medio, Elevado, Superior)
 * @returns Array de variantes disponibles desde CSV
 */
export function getAvailableCircuitVariants(grado: string): CircuitVariantData[] {
  const variants = LOADED_CIRCUIT_VARIANTS.length > 0
    ? LOADED_CIRCUIT_VARIANTS
    : [];  // CSV carga desde variantes_circuitos_industria.csv

  return variants.filter(v => v.grado === grado);
}

/**
 * Obtiene una variante específica por grado e índice
 * @param grado - Grado de electrificación
 * @param variantIndex - Índice de la variante (0, 1, 2, etc.)
 * @returns Variante específica o undefined
 */
export function getCircuitVariant(grado: string, variantIndex: number): CircuitVariantData | undefined {
  const variants = getAvailableCircuitVariants(grado);
  return variants.find(v => v.variante_index === variantIndex);
}

/**
 * Obtiene la configuración PMU industrial desde CSV según grado y altura de luminarias
 * @param grado - Grado de electrificación industrial
 * @param alturaLuminarias - Altura de luminarias en metros
 * @returns Configuración PMU o undefined
 */
export function getIndustrialPMUConfig(grado: string, alturaLuminarias: number): IndustrialPMUData | undefined {
  const pmuData = LOADED_INDUSTRIAL_PMU.length > 0
    ? LOADED_INDUSTRIAL_PMU
    : [];  // CSV carga desde pmu_industrial.csv

  const config = pmuData.find(d =>
    d.grado === grado &&
    alturaLuminarias >= d.altura_min &&
    alturaLuminarias < d.altura_max
  );

  if (!config) {
    console.warn(`⚠️ No se encontró configuración PMU para grado=${grado}, altura=${alturaLuminarias}`);
    // Intentar con la primera configuración del grado como fallback
    return pmuData.find(d => d.grado === grado);
  }

  return config;
}

/**
 * Obtiene especificaciones de un tipo de acometida desde CSV
 */
export function getAcometidaTypeSpec(codigo: string): AcometidaType | undefined {
  const acometidas = LOADED_ACOMETIDAS.length > 0
    ? LOADED_ACOMETIDAS
    : FALLBACK_ACOMETIDAS;

  return acometidas.find(a => a.codigo === codigo);
}

/**
 * Obtiene especificaciones de un tipo de pilar desde CSV
 */
export function getPilarTypeSpec(codigo: string): PilarTypeData | undefined {
  const pilares = LOADED_PILARES.length > 0
    ? LOADED_PILARES
    : [];  // CSV carga desde tipos_pilares.csv

  return pilares.find(p => p.codigo === codigo);
}

/**
 * Obtiene lista de acometidas disponibles según tensión
 */
export function getAvailableAcometidas(isTrifasico: boolean): AcometidaType[] {
  const acometidas = LOADED_ACOMETIDAS.length > 0
    ? LOADED_ACOMETIDAS
    : FALLBACK_ACOMETIDAS;

  const suffix = isTrifasico ? 'TRI' : 'MONO';
  return acometidas.filter(a => a.codigo.endsWith(suffix));
}

/**
 * Obtiene lista de pilares disponibles según tensión
 */
export function getAvailablePilares(isTrifasico: boolean): PilarTypeData[] {
  const pilares = LOADED_PILARES.length > 0
    ? LOADED_PILARES
    : FALLBACK_PILARES;

  const tension = isTrifasico ? '380V' : '220V';
  return pilares.filter(p => p.tension === tension || p.tension === '380V'); // 380V puede servir ambos
}

/**
 * Calcula la sección del cable PAT de USUARIO según normativa AEA 770
 * Esta PAT se instala desde un solo tablero (el que el usuario elija: TP, TS, o TSG)
 * @param lpSection - Sección de la línea principal (fase) en mm²
 * @param voltage - Tensión del sistema (220V o 380V)
 * @param pillarType - Tipo de pilar (opcional, para casos específicos)
 * @returns Sección del cable PAT en mm²
 */
export function calculateUserPATSection(
  lpSection: number,
  voltage: '220V' | '380V',
  pillarType?: string
): number {
  // Regla general: SPE = S si S <= 16mm², sino S/2, con mínimo 2.5mm²
  const spe = lpSection <= 16 ? lpSection : (lpSection / 2);
  const speMin = Math.max(spe, 2.5);

  // Verificar contra especificaciones de pilares si se proporciona
  if (pillarType) {
    const pillarSpec = getPilarTypeSpec(pillarType);
    if (pillarSpec?.seccion_pat_mm2) {
      return Math.max(speMin, pillarSpec.seccion_pat_mm2);
    }
  }

  // Mínimos según tensión (según CSV de pilares)
  if (voltage === '220V') {
    return Math.max(speMin, 4.0); // Mínimo 4mm² para 220V
  } else {
    // 380V: depende del tipo de instalación
    // Edificios/Comercial suelen requerir 10mm², residencial simple 6mm²
    return Math.max(speMin, 6.0); // Trifásico: mínimo 6mm²
  }
}

/**
 * Calcula la sección del cable PAT de SERVICIO según normativa AEA 770
 * Esta PAT solo se usa en acometidas Clase I (antiguas, metálicas)
 * Ubicación fija: siempre en la acometida (gabinete del medidor)
 * @param acometidaTipo - Código del tipo de acometida
 * @param pillarTipo - Código del tipo de pilar (si aplica)
 * @returns Sección del cable PAT de servicio en mm² o undefined si no aplica
 */
export function calculateServicePATSection(
  acometidaTipo?: string,
  pillarTipo?: string
): number | undefined {
  // Verificar si la acometida es Clase I
  const acometidaSpec = getAcometidaTypeSpec(acometidaTipo || '');
  if (!acometidaSpec || acometidaSpec.clase !== 'I') {
    return undefined; // No requiere PAT de Servicio
  }

  // Si hay pilar, usar la sección del CSV de pilares
  if (pillarTipo) {
    const pillarSpec = getPilarTypeSpec(pillarTipo);
    if (pillarSpec?.seccion_pat_mm2) {
      return pillarSpec.seccion_pat_mm2;
    }
  }

  // Fallback: usar sección mínima según tensión
  const isTri = acometidaTipo?.includes('TRI');
  return isTri ? 6.0 : 4.0;
}

/**
 * Valida longitud de acometida según normativa ET-21
 * REGLA: Longitud > 2m genera alerta de no conformidad
 */
export function validateAcometidaLength(
  longitud: number,
  tipoAcometida?: string
): { valid: boolean; alert?: string; severity?: 'warning' | 'error' } {
  if (longitud > 2) {
    return {
      valid: false,
      severity: 'warning',
      alert: `⚠️ NO CONFORMIDAD NORMATIVA: La longitud de la acometida (${longitud}m) excede los 2m recomendados por ET-21. Se recomienda acercar el medidor al punto de conexión o usar pilar.`
    };
  }

  // Validar contra máximo del tipo
  if (tipoAcometida) {
    const spec = getAcometidaTypeSpec(tipoAcometida);
    if (spec && longitud > spec.max_longitud_m) {
      return {
        valid: false,
        severity: 'error',
        alert: `❌ EXCEDE MÁXIMO: La longitud (${longitud}m) supera el máximo permitido para ${spec.descripcion} (${spec.max_longitud_m}m según ${spec.normativa}).`
      };
    }
  }

  return { valid: true };
}

/**
 * Valida seguridad de cable vs protección
 * REGLA CRÍTICA: Si térmica > capacidad cable → RIESGO DE INCENDIO
 */
export function validateCableSafety(
  seccionCable: number,
  amperajeTermica: number,
  isTrifasico: boolean = false,
  metodoInstalacion: string = 'Embutido'
): { safe: boolean; alert?: string; riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  // Obtener capacidad del cable
  const iz = getIz(seccionCable, metodoInstalacion, isTrifasico);

  if (amperajeTermica > iz) {
    const exceso = ((amperajeTermica / iz) - 1) * 100;

    let riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (exceso > 50) riskLevel = 'CRITICAL';
    else if (exceso > 25) riskLevel = 'HIGH';

    return {
      safe: false,
      riskLevel,
      alert: `🔥 RIESGO DE INCENDIO: La protección (${amperajeTermica}A) supera la capacidad del cable ${seccionCable}mm² (Iz=${iz}A) en un ${exceso.toFixed(0)}%. El cable puede sobrecalentarse y causar un incendio. ACCIÓN REQUERIDA: Aumentar sección de cable o reducir protección.`
    };
  }

  // Advertencia si está muy cerca del límite
  if (amperajeTermica > iz * 0.9) {
    return {
      safe: true,
      riskLevel: 'LOW',
      alert: `⚠️ ADVERTENCIA: La protección (${amperajeTermica}A) está cerca del límite del cable ${seccionCable}mm² (Iz=${iz}A). Considere aumentar la sección para mayor seguridad.`
    };
  }

  return { safe: true };
}

/**
 * Obtiene el listado de materiales normalizados para un tipo de acometida
 * según especificaciones ET-21
 */
export function getMaterialesAcometida(codigoAcometida: string): MaterialAcometidaData[] {
  const materiales = LOADED_MATERIALES_ACOMETIDAS.length > 0
    ? LOADED_MATERIALES_ACOMETIDAS
    : [];  // CSV carga desde materiales_acometidas.csv

  return materiales
    .filter(m => m.codigo_acometida === codigoAcometida)
    .sort((a, b) => a.item_numero - b.item_numero);
}

/**
 * Obtiene el listado completo de materiales con categorización
 */
export function getMaterialesAcometidaAgrupados(codigoAcometida: string): {
  obligatorios: MaterialAcometidaData[];
  opcionales: MaterialAcometidaData[];
  porCategoria: Record<string, MaterialAcometidaData[]>;
} {
  const materiales = getMaterialesAcometida(codigoAcometida);

  const obligatorios = materiales.filter(m => m.es_obligatorio === 'Sí');
  const opcionales = materiales.filter(m => m.es_obligatorio === 'No');

  const porCategoria: Record<string, MaterialAcometidaData[]> = {};
  materiales.forEach(m => {
    if (!porCategoria[m.categoria]) {
      porCategoria[m.categoria] = [];
    }
    porCategoria[m.categoria].push(m);
  });

  return { obligatorios, opcionales, porCategoria };
}

/**
 * Obtiene los requisitos de certificación para un trámite
 */
export function getCertificationRequirements(codigoTramite: string): CertificationRequirementData | undefined {
  const reqs = LOADED_CERTIFICATION_REQUIREMENTS.length > 0
    ? LOADED_CERTIFICATION_REQUIREMENTS
    : [];  // CSV carga desde requisitos_certificacion.csv

  return reqs.find(r => r.codigo_tramite === codigoTramite);
}

/**
 * Valida la categoría profesional requerida para un destino y potencia
 * IMPORTANTE: Sistema NO BLOQUEANTE - Solo advierte, no prohíbe
 */
export function validateProfessionalCategory(destino: string, potenciaKW: number): {
  allowed: boolean;
  requiredCategory: number | number[];
  message: string;
  isWarning: boolean; // true = advertencia, false = prohibición estricta
} {
  const dests = LOADED_PROPERTY_DESTINATIONS.length > 0
    ? LOADED_PROPERTY_DESTINATIONS
    : [];  // CSV carga desde destinos_inmueble.csv

  const dest = dests.find(d => d.codigo_destino === destino);

  if (!dest) {
    return {
      allowed: true,
      requiredCategory: 3,
      message: 'Destino no encontrado, asumiendo Cat III',
      isWarning: false
    };
  }

  // Caso especial: Pública concurrencia (ÚNICA PROHIBICIÓN ESTRICTA según Sección 718 AEA)
  if (destino === 'publica_concurrencia') {
    return {
      allowed: false,
      requiredCategory: [1, 2],
      message: 'PROHIBIDO para Cat III (Sección 718 AEA). Requiere Cat I/II',
      isWarning: false
    };
  }

  // Caso especial: Edificio multifamiliar completo (PROHIBICIÓN por complejidad)
  if (destino === 'vivienda_multifamiliar') {
    return {
      allowed: false,
      requiredCategory: [1, 2],
      message: 'Instalación compleja. Requiere Cat I/II',
      isWarning: false
    };
  }

  // Casos especiales: Médico e Inflamable (ADVERTENCIA NO BLOQUEANTE)
  if (destino === 'medico') {
    return {
      allowed: true, // NO BLOQUEA
      requiredCategory: 3,
      message: '⚠️ ADVERTENCIA: Según normativa AEA/ERSeP, consultorios médicos suelen exceder la incumbencia de Cat III por requisitos de seguridad en electromedicina. Verifique su habilitación local antes de certificar.',
      isWarning: true
    };
  }

  if (destino === 'inflamable') {
    return {
      allowed: true, // NO BLOQUEA
      requiredCategory: 3,
      message: '⚠️ ADVERTENCIA: Según normativa AEA/ERSeP, depósitos con riesgo BE2 (incendio/explosión) suelen exceder la incumbencia de Cat III. Verifique su habilitación local antes de certificar.',
      isWarning: true
    };
  }

  // Regla general: Cat III hasta max_potencia_cat3_kw
  if (potenciaKW <= dest.max_potencia_cat3_kw) {
    return {
      allowed: true,
      requiredCategory: 3,
      message: `Cat III habilitada (≤${dest.max_potencia_cat3_kw} kW)`,
      isWarning: false
    };
  } else {
    return {
      allowed: false,
      requiredCategory: [1, 2],
      message: `Requiere Cat I/II (>${dest.max_potencia_cat3_kw} kW)`,
      isWarning: false
    };
  }
}

/**
 * Obtiene información de un destino de inmueble
 */
export function getPropertyDestination(codigoDestino: string): PropertyDestinationData | undefined {
  const dests = typeof LOADED_PROPERTY_DESTINATIONS !== 'undefined' && LOADED_PROPERTY_DESTINATIONS.length > 0
    ? LOADED_PROPERTY_DESTINATIONS
    : [];

  return dests.find(d => d.codigo_destino === codigoDestino);
}


// === FUNCIÓN DE MIGRACIÓN V2 ===

/**
 * Migra proyectos viejos (V1) al nuevo formato (V2)
 * Convierte destination → regimenUso y projectType → estadoObra
 * @param oldConfig - Configuración en formato V1
 * @returns Configuración migrada a formato V2
 */
export function migrateProjectConfig(oldConfig: ProjectConfig): ProjectConfig {
  const newConfig = { ...oldConfig };

  // Migrar destination → regimenUso (si no existe regimenUso)
  if (!newConfig.regimenUso && newConfig.destination) {
    if (['vivienda', 'departamento', 'departamento_ph'].includes(newConfig.destination)) {
      newConfig.regimenUso = 'habitacional';
    } else if (['comercio', 'oficina', 'local'].includes(newConfig.destination)) {
      newConfig.regimenUso = 'comercial';
    } else if (newConfig.destination === 'industria') {
      newConfig.regimenUso = 'industrial';
    } else {
      // Para casos especiales, usar comercial como fallback
      newConfig.regimenUso = 'comercial';
    }
  }

  // Migrar projectType → estadoObra (si no existe estadoObra)
  if (!newConfig.estadoObra && newConfig.projectType) {
    newConfig.estadoObra = newConfig.projectType;
  }

  // Sincronizar estadoObra → projectType (para compatibilidad con código legacy)
  if (newConfig.estadoObra && !newConfig.projectType) {
    // Si estadoObra es 'modificacion' o 'provisoria', mapear de forma segura para el motor
    if (newConfig.estadoObra === 'provisoria') {
      newConfig.projectType = 'existente'; // El motor existente es más flexible para AVP
    } else {
      newConfig.projectType = newConfig.estadoObra === 'modificacion' ? 'nueva' : newConfig.estadoObra as any;
    }
  }

  console.log('🔄 Migración de config:', {
    old: { destination: oldConfig.destination, projectType: oldConfig.projectType },
    new: { regimenUso: newConfig.regimenUso, estadoObra: newConfig.estadoObra }
  });

  return newConfig;
}

/**
 * Determina el motor de cálculo a usar según régimen y estado de obra
 * @param config - Configuración del proyecto (ya migrada)
 * @returns Tipo de motor a usar
 */
export function determineCalculationEngine(config: ProjectConfig): string {
  // Bloqueo estricto: Modificación NO puede usar Res. 54
  if (config.estadoObra === 'modificacion') {
    // Forzar motor AEA según régimen
    if (config.regimenUso === 'habitacional') return 'PMU_HABITACIONAL';
    if (config.regimenUso === 'comercial') return 'PMU_COMERCIAL';
    if (config.regimenUso === 'industrial') return 'PMU_INDUSTRIAL';
  }

  // Existente → Res. 54/2018
  if (config.estadoObra === 'existente' || config.projectType === 'existente') {
    return 'RES54_EXISTENTE';
  }

  // Nueva → Motor según régimen
  if (config.regimenUso === 'habitacional') return 'PMU_HABITACIONAL';
  if (config.regimenUso === 'comercial') return 'PMU_COMERCIAL';
  if (config.regimenUso === 'industrial') return 'PMU_INDUSTRIAL';

  // Fallback (compatibilidad con proyectos muy viejos sin regimenUso definido)
  return 'PMU_HABITACIONAL';
}

/**
 * Obtiene la normativa AEA aplicable según el régimen de uso
 */
export function getAEANormative(regimenUso?: string): string {
  switch (regimenUso) {
    case 'habitacional': return '770';
    case 'comercial': return '771';
    case 'industrial': return '771.8';
    default: return '770/771';
  }
}

export function getSuggestedEnvironments(destination: string) {
  // 1. Determinar categoría base si el destino específico no coincide
  let category = '';
  const propDest = LOADED_PROPERTY_DESTINATIONS.find(p => p.codigo_destino === destination);
  if (propDest) {
    category = propDest.categoria;
  }

  // AEA 770 - Viviendas (TODOS LOS AMBIENTES DEL CSV)
  if (destination === 'habitacional' || destination === 'vivienda' || category === 'Residencial' || category === 'Temporal') {
    return [
      { id: '1', name: 'Sala/Comedor/Estudio', surface: 20 },
      { id: '2', name: 'Dormitorio', surface: 12 },
      { id: '3', name: 'Cocina', surface: 10 },
      { id: '4', name: 'Baño', surface: 4 },
      { id: '5', name: 'Vestíbulo/Garaje/Hall', surface: 8 },
      { id: '6', name: 'Pasillo', surface: 6 },
      { id: '7', name: 'Lavadero', surface: 5 },
      { id: '8', name: 'Balcón/Galería', surface: 8 }
    ];
  }

  // AEA 771 - Oficinas y Locales Comerciales (NUEVO)
  if (destination === 'comercial' || destination === 'oficina' || destination === 'comercio' || category === 'Comercial') {
    return [
      { id: '1', name: 'Salón general', surface: 30 },
      { id: '2', name: 'Despacho privado', surface: 12 },
      { id: '3', name: 'Sala de reuniones', surface: 20 },
      { id: '4', name: 'Cocina', surface: 8 },
      { id: '5', name: 'Baño', surface: 4 },
      { id: '6', name: 'Vestíbulo/Recepción', surface: 15 },
      { id: '7', name: 'Pasillo', surface: 10 }
    ];
  }

  // AEA 771.8 - Industria
  if (destination === 'industrial' || destination === 'industria' || category === 'Industrial') {
    return [
      { id: '1', name: 'Área de Producción', surface: 100 },
      { id: '2', name: 'Depósito', surface: 50 },
      { id: '3', name: 'Oficina Técnica', surface: 15 },
      { id: '4', name: 'Vestuarios', surface: 20 }
    ];
  }

  // Otros destinos - genérico
  return [{ id: '1', name: 'Salón Principal', surface: 30 }];
}

/**
 * Calcula la Superficie Límite de Aplicación (SLA) según AEA 770
 * SLA = Superficie Cubierta + (0.5 × Superficie Semicubierta)
 * 
 * Lógica de clasificación:
 * - Ambientes "balcon_galeria" → Semicubierta automáticamente
 * - Ambiente "Otro" con tipoSuperficie='semicubierta' → Semicubierta
 * - Todos los demás → Cubierta
 * 
 * @param environments - Array de ambientes del proyecto
 * @returns SLA calculado en m²
 */
export function calculateSLA(environments: EnvironmentCalculation[]): number {
  let cubierta = 0;
  let semicubierta = 0;

  environments.forEach(env => {
    const superficie = env.surface || 0;

    // Determinar si es semicubierta
    const isSemicubierta =
      env.tipoSuperficie === 'semicubierta' ||
      env.name.toLowerCase().includes('balcon') ||
      env.name.toLowerCase().includes('balcón') ||
      env.name.toLowerCase().includes('galeria') ||
      env.name.toLowerCase().includes('galería') ||
      env.name.toLowerCase().includes('cochera') ||
      env.name.toLowerCase().includes('terraza');

    if (isSemicubierta) {
      semicubierta += superficie;
    } else {
      cubierta += superficie;
    }
  });

  const sla = cubierta + (semicubierta * 0.5);

  console.log(`📐 SLA Calculado: ${sla.toFixed(2)}m² (Cubierta: ${cubierta.toFixed(2)}m² + Semicubierta: ${semicubierta.toFixed(2)}m² × 0.5)`);

  return sla;
}

/**
 * Calcula el Grado de Electrificación según AEA 770/771
 * Usa SLA (Superficie Límite de Aplicación) si se proporcionan ambientes,
 * caso contrario usa la superficie bruta
 * 
 * @param dest - Destino del inmueble ('vivienda', 'oficina', 'comercio', etc.)
 * @param surface - Superficie bruta en m² (fallback si no hay ambientes)
 * @param environments - Array de ambientes (opcional, para calcular SLA)
 * @returns Grado de electrificación ('Mínimo', 'Medio', 'Elevado', 'Superior')
 */
export function calculateElectrificationGrade(
  dest: string,
  surface: number,
  environments?: EnvironmentCalculation[]
): string {
  // Si hay ambientes, calcular SLA; sino usar superficie bruta
  const effectiveSurface = environments && environments.length > 0
    ? calculateSLA(environments)
    : surface;

  // Usar datos CSV si están cargados, sino usar fallback
  const grades = LOADED_ELECTRIFICATION_GRADES.length > 0
    ? LOADED_ELECTRIFICATION_GRADES
    : [];  // CSV carga desde grados_electrificacion.csv

  // Filtrar grados aplicables al destino
  let applicable = grades.filter(g => g.destino === dest);

  // FALLBACK: Si no se encuentra el destino específico (ej: "departamento"), buscar por categoría
  if (applicable.length === 0) {
    const propDest = LOADED_PROPERTY_DESTINATIONS.find(p => p.codigo_destino === dest);
    if (propDest) {
      let mappedDest = '';
      // Mapeo de Categoría -> Destino Genérico (que sí existe en grados_electrificacion.csv)
      if (propDest.categoria === 'Residencial' || propDest.categoria === 'Temporal') mappedDest = 'vivienda';
      else if (propDest.categoria === 'Comercial') mappedDest = 'comercio'; // 'oficina' suele existir, pero comercio es buen fallback
      else if (propDest.categoria === 'Industrial') mappedDest = 'industria';

      if (mappedDest) {
        // console.log(`ℹ️ Mapeando destino '${dest}' -> '${mappedDest}' para determinar grado.`);
        applicable = grades.filter(g => g.destino === mappedDest);
      }
    }
  }

  if (applicable.length === 0) {
    console.warn(`⚠️ No se encontraron grados de electrificación para destino: ${dest}`);
    return 'Mínimo';
  }

  // Buscar el grado correspondiente a la superficie efectiva
  for (const grade of applicable) {
    if (effectiveSurface >= grade.superficie_min && effectiveSurface < grade.superficie_max) {
      console.log(`✅ Grado de Electrificación: ${grade.grado} (${effectiveSurface.toFixed(2)}m² → ${grade.superficie_min}-${grade.superficie_max}m²)`);
      return grade.grado;
    }
  }

  // Si no se encuentra, retornar el último grado (Superior)
  const lastGrade = applicable[applicable.length - 1];
  console.log(`✅ Grado de Electrificación: ${lastGrade.grado} (${effectiveSurface.toFixed(2)}m² ≥ ${lastGrade.superficie_min}m²)`);
  return lastGrade.grado;
}

// === SISTEMA DE INVENTARIO DE CIRCUITOS ===

/**
 * Agrupa bocas de ambientes en circuitos respetando el límite máximo
 * @param environments - Ambientes del proyecto
 * @param circuitType - Tipo de circuito ('IUG' o 'TUG')
 * @param maxBocas - Máximo de bocas por circuito (típicamente 15)
 * @returns Array de grupos de bocas
 */
function groupBocasByCircuit(
  environments: EnvironmentCalculation[],
  circuitType: 'IUG' | 'TUG',
  maxBocas: number
): Array<{ totalBocas: number; environments: string[]; environmentIds: string[] }> {
  const groups: Array<{ totalBocas: number; environments: string[]; environmentIds: string[] }> = [];
  let currentGroup = { totalBocas: 0, environments: [] as string[], environmentIds: [] as string[] };

  environments.forEach(env => {
    const bocas = circuitType === 'IUG' ? (env.lights || 0) : (env.regularOutlets || 0);

    if (bocas === 0) return; // Saltar ambientes sin bocas

    // Si agregar estas bocas excede el límite, crear nuevo grupo
    if (currentGroup.totalBocas + bocas > maxBocas && currentGroup.totalBocas > 0) {
      groups.push({ ...currentGroup });
      currentGroup = { totalBocas: 0, environments: [], environmentIds: [] };
    }

    currentGroup.totalBocas += bocas;
    currentGroup.environments.push(env.name);
    currentGroup.environmentIds.push(env.id);
  });

  // Agregar el último grupo si tiene bocas
  if (currentGroup.totalBocas > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Genera el inventario completo de circuitos a partir de los ambientes
 * Se ejecuta al finalizar Step 2 (Ambientes)
 * 
 * @param environments - Array de ambientes del proyecto
 * @param config - Configuración del proyecto
 * @param grade - Grado de electrificación
 * @returns Inventario de circuitos completo
 */
/**
 * Helper: Determinar método de instalación por defecto según tipo de circuito
 * @param circuitType Tipo de circuito (IUG, TUG, ACU, etc.)
 * @returns Método de instalación por defecto (B1, B2, etc.)
 */
function getDefaultMethodForCircuitType(circuitType: string): string {
  switch (circuitType) {
    case 'IUG':  // Iluminación
    case 'IUE':  // Iluminación especial
      return 'B1';  // Embutido en pared (típico para iluminación)

    case 'TUG':  // Tomas generales
    case 'TUE':  // Tomas especiales
      return 'B1';  // Embutido en pared (típico para tomas)

    case 'ACU':  // Aires acondicionados
    case 'APM':  // Aparatos de potencia media
      return 'B2';  // Bandeja/Cielorraso (cargas especiales pueden ir por arriba)

    case 'MBTF': // Motobomba
    case 'TERM': // Termotanque
      return 'B2';  // Bandeja/Cielorraso o exterior

    default:
      return 'B1';  // Embutido por defecto
  }
}

export function generateCircuitInventory(
  environments: EnvironmentCalculation[],
  config: ProjectConfig,
  grade: string
): CircuitInventory {
  const circuits: CircuitInventoryItem[] = [];
  const isTrifasico = config.voltage === '380V';

  // Helper: Crear circuitos agrupados por tipo RESPETANDO ASIGNACIONES MANUALES
  const createGroupedCircuits = (circuitType: string, bocasField: 'lights' | 'regularOutlets') => {
    const maxBocas = getMaxBocasForCircuit(circuitType);

    // Si max_bocas es -1, 0, o 1, no agrupar (son circuitos individuales)
    if (maxBocas <= 1) return;

    // 🆕 NUEVA LÓGICA: Agrupar por asignación manual
    const assignmentField = circuitType === 'IUG' ? 'assignedIugCircuit' : 'assignedTugCircuit';
    const circuitGroups: Record<string, {
      totalBocas: number;
      environments: string[];
      environmentIds: string[];
    }> = {};

    // Agrupar ambientes según su circuito asignado
    environments.forEach(env => {
      const bocas = circuitType === 'IUG' ? (env.lights || 0) : (env.regularOutlets || 0);
      if (bocas === 0) return; // Saltar ambientes sin bocas

      const assignedCircuit = env[assignmentField] || `${circuitType}-1`; // Default a circuito 1

      if (!circuitGroups[assignedCircuit]) {
        circuitGroups[assignedCircuit] = {
          totalBocas: 0,
          environments: [],
          environmentIds: []
        };
      }

      circuitGroups[assignedCircuit].totalBocas += bocas;
      circuitGroups[assignedCircuit].environments.push(env.customName || env.name);
      circuitGroups[assignedCircuit].environmentIds.push(env.id);
    });

    // Crear circuitos para cada grupo
    Object.entries(circuitGroups).forEach(([circuitId, group]) => {
      // Calcular potencia según tipo
      let power: number;
      if (circuitType === 'IUG') {
        // Fórmula AEA 770: (bocas × 60 VA × 2) / 3 = bocas × 40 VA
        power = (group.totalBocas * 60 * 2) / 3;
      } else if (circuitType === 'IUE') {
        // IUE ahora se maneja en specialLoads, pero por compatibilidad:
        power = group.totalBocas * 60;
      } else if (circuitType === 'TUG' || circuitType === 'TUE') {
        power = 2200; // 2200 VA por circuito de tomas (AEA 770)
      } else {
        power = group.totalBocas * 100; // Fallback genérico
      }

      const ib = power / (isTrifasico ? 380 : 220);

      // Obtener especificaciones del CSV
      const spec = getCircuitTypeSpec(circuitType);

      // Calcular cable y protección óptimos con método B1 por defecto
      const defaultMethod = getDefaultMethodForCircuitType(circuitType);
      const installationTypeMap: Record<string, string> = {
        'B1': 'Embutido',
        'B2': 'Exterior',
        'D1': 'Enterrado',
        'D2': 'Enterrado'
      };

      const optimization = selectOptimalCableAndProtection(
        ib,
        circuitType,
        installationTypeMap[defaultMethod] || 'Embutido',
        config.voltage
      );

      circuits.push({
        id: circuitId, // 🆕 Usar el ID del circuito asignado
        type: circuitType,
        description: `${spec?.designacion || circuitType}: ${group.environments.join(', ')}`,
        bocas: group.totalBocas,
        power,
        ib,
        cable: `${optimization.section}mm²`,
        breaker: `${optimization.In}A`,
        warnings: optimization.warnings,
        environments: group.environmentIds,
        assignedPanelId: undefined,
        isAssigned: false,
        voltage: config.voltage,
        // 🆕 Valores por defecto inteligentes para línea terminal
        terminalLine: {
          method: defaultMethod,
          averageLength: 10,  // 10m promedio
          material: 'Cu',     // Siempre Cobre en instalaciones no fabriles
          groupingCount: 1    // Sin agrupamiento por defecto
        }
      });
    });
  };

  // --- LÓGICA PARA INSTALACIONES EXISTENTES (RES. 17/2021) ---
  if (config.estadoObra === 'existente') {
    const circuitGroups: Record<string, {
      bocasLuz: number;
      bocasTomas: number;
      specialLoads: SpecialLoad[];
      environments: string[];
      environmentIds: string[];
      panelId?: string;
    }> = {};

    environments.forEach(env => {
      // Usar assignedIugCircuit como ID de grupo, o el ID del ambiente si no está asignado
      const groupKey = env.assignedIugCircuit || env.id;

      if (!circuitGroups[groupKey]) {
        circuitGroups[groupKey] = {
          bocasLuz: 0,
          bocasTomas: 0,
          specialLoads: [],
          environments: [],
          environmentIds: [],
          panelId: env.panelId
        };
      }

      circuitGroups[groupKey].bocasLuz += (env.bocasLuz || 0);
      circuitGroups[groupKey].bocasTomas += (env.bocasTomas || 0);
      if (env.specialLoads) {
        circuitGroups[groupKey].specialLoads.push(...env.specialLoads);
      }
      circuitGroups[groupKey].environments.push(env.customName || env.name);
      circuitGroups[groupKey].environmentIds.push(env.id);
    });

    Object.entries(circuitGroups).forEach(([circuitId, group]) => {
      let circuitType = 'mixto_existente';
      if (group.bocasLuz > 0 && group.bocasTomas === 0) circuitType = 'IUG';
      if (group.bocasTomas > 0 && group.bocasLuz === 0) circuitType = 'TUG';

      // Potencia Total Relevada (Stotal) según Res. 17/2021
      let stotal = (group.bocasLuz * 25) + (group.bocasTomas * 240);

      group.specialLoads?.forEach(load => {
        const loadPower = load.unit === 'W' ? load.value / 0.85 : load.value;
        stotal += loadPower;
      });

      const ib = stotal / (isTrifasico ? 380 : 220);
      const spec = getCircuitTypeSpec(circuitType);
      const defaultMethod = getDefaultMethodForCircuitType(circuitType);

      const optimization = selectOptimalCableAndProtection(
        ib,
        circuitType,
        'Embutido',
        config.voltage
      );

      circuits.push({
        id: circuitId === group.environmentIds[0] ? group.environmentIds[0] : circuitId, // Si es individual, usar ID original
        type: circuitType,
        description: group.environments.length > 1
          ? `${spec?.designacion || 'Mixto'}: ${group.environments.join(', ')}`
          : group.environments[0],
        bocas: group.bocasLuz + group.bocasTomas,
        bocasLuz: group.bocasLuz,
        bocasTomas: group.bocasTomas,
        power: stotal,
        ib,
        cable: 'Relevar mm²', // En regularización el usuario debe relevar el cable real
        breaker: 'Relevar In', // En regularización el usuario debe relevar la térmica real
        warnings: optimization.warnings,
        environments: group.environmentIds,
        assignedPanelId: group.panelId || 'TP-MAIN',
        isAssigned: false,
        voltage: config.voltage,
        terminalLine: {
          method: defaultMethod,
          averageLength: 10,
          material: 'Cu',
          groupingCount: 1
        }
      });
    });

    return { circuits, totalCircuits: circuits.length, assignedCircuits: 0, orphanCircuits: circuits.length };
  }

  // --- LÓGICA PARA INSTALACIONES NUEVAS (AEA 770/771) ---
  // 1. Crear circuitos IUG (Iluminación uso general) - máx 15 bocas
  createGroupedCircuits('IUG', 'lights');

  // 2. Crear circuitos TUG (Tomacorrientes uso general) - máx 15 bocas
  createGroupedCircuits('TUG', 'regularOutlets');


  // 3-4. Agrupar cargas especiales que permiten agrupación (TUE, IUE, APM, MBTF)
  const groupableTypes = ['TUE', 'IUE', 'APM', 'MBTF'];
  const specialLoadsByType: Record<string, Array<{ load: SpecialLoad, envId: string, envName: string }>> = {};

  // Recolectar todas las cargas especiales agrupables
  environments.forEach(env => {
    env.specialLoads?.forEach(load => {
      const maxBocas = getMaxBocasForCircuit(load.type);
      const canGroup = maxBocas > 1 && groupableTypes.includes(load.type);

      if (canGroup && (load.bocas || 0) > 0) {
        if (!specialLoadsByType[load.type]) {
          specialLoadsByType[load.type] = [];
        }
        specialLoadsByType[load.type].push({
          load,
          envId: env.id,
          envName: env.name
        });
      }
    });
  });

  // Agrupar cada tipo de carga especial
  Object.entries(specialLoadsByType).forEach(([circuitType, loads]) => {
    const maxBocas = getMaxBocasForCircuit(circuitType);
    const spec = getCircuitTypeSpec(circuitType);

    let currentGroup: Array<{ load: SpecialLoad, envId: string, envName: string }> = [];
    let currentBocas = 0;
    let currentPower = 0; // 🆕 Rastrear potencia acumulada
    let groupIndex = 1;

    // Límites para IUE/TUE según normativa
    const MAX_POWER_IUE_TUE = 3300; // VA máximo por circuito
    const isIueOrTue = circuitType === 'IUE' || circuitType === 'TUE';

    loads.forEach((item, index) => {
      const loadBocas = item.load.bocas || 1;
      const loadPower = item.load.unit === 'W' ? item.load.value / 0.85 : item.load.value;

      // Determinar si necesitamos crear nuevo circuito
      const wouldExceedBocas = currentBocas + loadBocas > maxBocas;
      const wouldExceedPower = isIueOrTue && (currentPower + loadPower > MAX_POWER_IUE_TUE);

      // Si agregar esta carga excede el límite, crear circuito con grupo actual
      if ((wouldExceedBocas || wouldExceedPower) && currentGroup.length > 0) {
        // Crear circuito con el grupo actual
        const totalPower = currentGroup.reduce((sum, g) => {
          const p = g.load.unit === 'W' ? g.load.value / 0.85 : g.load.value;
          return sum + p;
        }, 0);

        const voltage = currentGroup[0].load.tension || config.voltage;
        const ib = voltage === '380V' ? totalPower / (380 * Math.sqrt(3)) : totalPower / 220;

        // Calcular cable y protección óptimos
        const defaultMethod = getDefaultMethodForCircuitType(circuitType);
        const installationTypeMap: Record<string, string> = {
          'B1': 'Embutido',
          'B2': 'Exterior',
          'D1': 'Enterrado',
          'D2': 'Enterrado'
        };

        const optimization = selectOptimalCableAndProtection(
          ib,
          circuitType,
          installationTypeMap[defaultMethod] || 'Embutido',
          voltage
        );

        // 🆕 Agregar warnings para IUE/TUE
        if (isIueOrTue) {
          if (totalPower > MAX_POWER_IUE_TUE) {
            optimization.warnings.push(
              `⚠️ Potencia total (${totalPower.toFixed(0)}VA) excede el máximo recomendado para ${circuitType} (${MAX_POWER_IUE_TUE}VA)`
            );
          }
          if (ib > 32) {
            optimization.warnings.push(
              `❌ Corriente (${ib.toFixed(2)}A) excede protección máxima para ${circuitType} (32A). DEBE dividir en más circuitos.`
            );
          }
        }

        const description = currentGroup.length === 1
          ? `${currentGroup[0].load.name} en ${currentGroup[0].envName}`
          : `${spec?.designacion || circuitType} en ${currentGroup.map(g => g.envName).join(', ')}`;

        circuits.push({
          id: `${circuitType}-${groupIndex}`,
          type: circuitType,
          description,
          bocas: currentBocas,
          power: totalPower,
          ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings,
          environments: currentGroup.map(g => g.envId),
          assignedPanelId: undefined,
          isAssigned: false,
          voltage,
          isThreePhase: currentGroup[0].load.isThreePhase || false,  // 🆕 Propagar isThreePhase
          terminalLine: {
            method: defaultMethod,
            averageLength: 10,
            material: 'Cu',
            groupingCount: 1
          }
        });

        groupIndex++;
        currentGroup = [];
        currentBocas = 0;
        currentPower = 0; // 🆕 Resetear potencia acumulada
      }

      // Agregar carga al grupo actual
      currentGroup.push(item);
      currentBocas += loadBocas;
      currentPower += loadPower; // 🆕 Acumular potencia

      // Si es la última carga, crear circuito con lo que queda
      if (index === loads.length - 1 && currentGroup.length > 0) {
        const totalPower = currentGroup.reduce((sum, g) => {
          const p = g.load.unit === 'W' ? g.load.value / 0.85 : g.load.value;
          return sum + p;
        }, 0);

        const voltage = currentGroup[0].load.tension || config.voltage;
        const ib = voltage === '380V' ? totalPower / (380 * Math.sqrt(3)) : totalPower / 220;

        // Calcular cable y protección óptimos
        const defaultMethod = getDefaultMethodForCircuitType(circuitType);
        const installationTypeMap: Record<string, string> = {
          'B1': 'Embutido',
          'B2': 'Exterior',
          'D1': 'Enterrado',
          'D2': 'Enterrado'
        };

        const optimization = selectOptimalCableAndProtection(
          ib,
          circuitType,
          installationTypeMap[defaultMethod] || 'Embutido',
          voltage
        );

        // 🆕 Agregar warnings para IUE/TUE
        if (isIueOrTue) {
          if (totalPower > MAX_POWER_IUE_TUE) {
            optimization.warnings.push(
              `⚠️ Potencia total (${totalPower.toFixed(0)}VA) excede el máximo recomendado para ${circuitType} (${MAX_POWER_IUE_TUE}VA)`
            );
          }
          if (ib > 32) {
            optimization.warnings.push(
              `❌ Corriente (${ib.toFixed(2)}A) excede protección máxima para ${circuitType} (32A). DEBE dividir en más circuitos.`
            );
          }
        }

        const description = currentGroup.length === 1
          ? `${currentGroup[0].load.name} en ${currentGroup[0].envName}`
          : `${spec?.designacion || circuitType} en ${currentGroup.map(g => g.envName).join(', ')}`;

        circuits.push({
          id: `${circuitType}-${groupIndex}`,
          type: circuitType,
          description,
          bocas: currentBocas,
          power: totalPower,
          ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings,
          environments: currentGroup.map(g => g.envId),
          assignedPanelId: undefined,
          isAssigned: false,
          voltage,
          isThreePhase: currentGroup[0].load.isThreePhase || false,  // 🆕 Propagar isThreePhase
          // 🆕 Valores por defecto inteligentes para línea terminal
          terminalLine: {
            method: defaultMethod,
            averageLength: 10,
            material: 'Cu',
            groupingCount: 1
          }
        });
      }
    });
  });

  // 5. Crear circuitos individuales (ACU, OCE, y cargas especiales sin bocas)
  environments.forEach(env => {
    env.specialLoads?.forEach((load, index) => {
      const maxBocas = getMaxBocasForCircuit(load.type);
      const canGroup = maxBocas > 1 && groupableTypes.includes(load.type);

      // Solo crear circuito individual si:
      // - No puede agruparse (ACU, OCE, etc.)
      // - O no tiene bocas especificadas
      if (!canGroup || (load.bocas || 0) === 0) {
        const power = load.unit === 'W' ? load.value / 0.85 : load.value;
        const voltage = load.tension || config.voltage;
        const ib = voltage === '380V' ? power / (380 * Math.sqrt(3)) : power / 220;

        const spec = getCircuitTypeSpec(load.type);

        // Calcular cable y protección óptimos con método B1 por defecto
        const defaultMethod = getDefaultMethodForCircuitType(load.type);
        const installationTypeMap: Record<string, string> = {
          'B1': 'Embutido',
          'B2': 'Exterior',
          'D1': 'Enterrado',
          'D2': 'Enterrado'
        };

        const optimization = selectOptimalCableAndProtection(
          ib,
          load.type,
          installationTypeMap[defaultMethod] || 'Embutido',
          voltage
        );

        circuits.push({
          id: `${load.type}-${env.id}-${index + 1}`,
          type: load.type,
          description: `${load.name} en ${env.name}`,
          bocas: load.bocas || 1,
          power,
          ib,
          cable: `${optimization.section}mm²`,
          breaker: `${optimization.In}A`,
          warnings: optimization.warnings,
          environments: [env.id],
          assignedPanelId: undefined,
          isAssigned: false,
          voltage,
          isThreePhase: load.isThreePhase || false,  // 🆕 Propagar isThreePhase
          terminalLine: {
            method: defaultMethod,
            averageLength: 10,
            material: 'Cu',
            groupingCount: 1
          }
        });
      }
    });
  });

  console.log(`📦 Inventario de Circuitos Generado: ${circuits.length} circuitos`);
  console.log(`   - IUG: ${circuits.filter(c => c.type === 'IUG').length}`);
  console.log(`   - TUG: ${circuits.filter(c => c.type === 'TUG').length}`);
  console.log(`   - Especiales: ${circuits.filter(c => !['IUG', 'TUG'].includes(c.type)).length}`);

  return {
    circuits,
    totalCircuits: circuits.length,
    assignedCircuits: 0,
    orphanCircuits: circuits.length
  };
}

/**
 * Calcula el DPMS de un tablero basándose en los circuitos asignados
 * Aplica factor de simultaneidad solo a circuitos generales (IUG, TUG, IUE, TUE)
 * 
 * @param circuits - Circuitos asignados al tablero
 * @returns DPMS en VA
 */
export function calculatePanelDPMS(circuits: CircuitInventoryItem[]): number {
  // Separar circuitos por categoría
  const generalCircuits = circuits.filter(c => circuitAppliesFS(c.type));
  const specificCircuits = circuits.filter(c => !circuitAppliesFS(c.type));

  // Calcular potencias
  const generalPower = generalCircuits.reduce((sum, c) => sum + c.power, 0);
  const specificPower = specificCircuits.reduce((sum, c) => sum + c.power, 0);

  // Aplicar factor de simultaneidad solo a circuitos generales
  const fs = calculateSimultaneityFactor(circuits);
  const dpms = (generalPower * fs) + specificPower;

  return dpms;
}

/**
 * Calcula la corriente de proyecto (Ib) de un tablero
 * @param dpms - DPMS del tablero en VA
 * @param voltage - Tensión del tablero
 * @returns Ib en Amperios
 */
export function calculatePanelIb(dpms: number, voltage: '220V' | '380V'): number {
  if (voltage === '380V') {
    return dpms / (380 * Math.sqrt(3)); // Trifásico
  }
  return dpms / 220; // Monofásico
}

/**
 * Verifica si hay circuitos huérfanos (sin asignar) en el inventario
 * @param inventory - Inventario de circuitos
 * @returns true si hay circuitos sin asignar
 */
export function hasOrphanCircuits(inventory?: CircuitInventory): boolean {
  if (!inventory) return false;
  return inventory.orphanCircuits > 0;
}

/**
 * Obtiene los circuitos huérfanos (sin asignar) del inventario
 * @param inventory - Inventario de circuitos
 * @returns Array de circuitos sin asignar
 */
export function getOrphanCircuits(inventory?: CircuitInventory): CircuitInventoryItem[] {
  if (!inventory) return [];
  return inventory.circuits.filter(c => !c.isAssigned);
}

/**
 * Obtiene los circuitos asignados a un tablero específico
 * @param inventory - Inventario de circuitos
 * @param panelId - ID del tablero
 * @returns Array de circuitos asignados al tablero
 */
export function getCircuitsForPanel(inventory: CircuitInventory | undefined, panelId: string): CircuitInventoryItem[] {
  if (!inventory) return [];
  return inventory.circuits.filter(c => c.assignedPanelId === panelId);
}

// === INICIALIZACIÓN DEL SISTEMA ===

/**
 * Inicializa el motor de reglas cargando datos desde CSVs
 * Debe llamarse al inicio de la aplicación desde App.tsx
 */
// Estado de carga lo gestionamos internamente si no existe global
const CSV_LOAD_STATUS_INTERNAL = {
  initialized: false,
  usingFallback: false
};

export async function initializeElectricalRules() {
  if (CSV_LOAD_STATUS_INTERNAL.initialized) return;

  try {
    console.log('🔌 Inicializando Motor de Reglas Eléctricas OVE...');

    // Definir fallbacks locales si faltan
    const SAFE_FALLBACK_ACOMETIDAS: AcometidaType[] = [];
    // Usar LOADED_IZ_TABLES o vacio si no hay fallback definido explícitamente y exportado
    const SAFE_FALLBACK_IZ: IzTableData[] = [];  // CSV carga desde tablas_iz.csv

    // Cargar TODOS los CSVs en paralelo para que la app sea 100% actualizable vía CSV
    const [
      destsResult,
      gradsResult,
      circsResult,
      reqsResult,
      izRowsResult,
      acometidasResult,
      pmuHabitacionalResult,
      pmuComercialResult,
      pmuIndustrialResult,
      variantesHabitacionalResult,
      variantesIndustriaResult,
      pilaresResult,
      materialesAcometidasResult,
      materialesGeneralesResult,
      materialesPorCircuitoResult,
      materialesPATResult
    ] = await Promise.all([
      // CSVs originales (ya se cargaban)
      csvLoader.loadCSV<PropertyDestinationData>('destinos_inmueble.csv', []),
      csvLoader.loadCSV<ElectrificationGradeData>('grados_electrificacion.csv', []),
      csvLoader.loadCSV<CircuitTypeData>('tipos_circuitos_lineas.csv', []),
      csvLoader.loadCSV<CertificationRequirementData>('requisitos_certificacion.csv', []),
      csvLoader.loadCSV<any>('tablas_iz.csv', SAFE_FALLBACK_IZ),
      csvLoader.loadCSV<AcometidaType>('tipos_acometidas.csv', SAFE_FALLBACK_ACOMETIDAS),
      // CSVs nuevos (PMU y variantes)
      csvLoader.loadCSV<HabitacionalPMUData>('pmu_habitacional.csv', []),
      csvLoader.loadCSV<any>('pmu_comercial.csv', []),
      csvLoader.loadCSV<IndustrialPMUData>('pmu_industrial.csv', []),
      csvLoader.loadCSV<HabitacionalCircuitVariantData>('variantes_circuitos_habitacional.csv', []),
      csvLoader.loadCSV<CircuitVariantData>('variantes_circuitos_industria.csv', []),
      csvLoader.loadCSV<PilarTypeData>('tipos_pilares.csv', []),
      // CSVs de materiales
      csvLoader.loadCSV<MaterialAcometidaData>('materiales_acometidas.csv', []),
      csvLoader.loadCSV<MaterialGeneralData>('materiales_generales.csv', []),
      csvLoader.loadCSV<MaterialPorCircuitoData>('materiales_por_circuito.csv', []),
      csvLoader.loadCSV<MaterialPATData>('materiales_pat.csv', [])
    ]);

    // Actualizar variables globales (originales)
    if (destsResult.data.length > 0) {
      LOADED_PROPERTY_DESTINATIONS.length = 0;
      LOADED_PROPERTY_DESTINATIONS.push(...destsResult.data);
    }
    if (gradsResult.data.length > 0) {
      LOADED_ELECTRIFICATION_GRADES.length = 0;
      LOADED_ELECTRIFICATION_GRADES.push(...gradsResult.data);
    }
    if (circsResult.data.length > 0) {
      LOADED_CIRCUIT_TYPES.length = 0;
      LOADED_CIRCUIT_TYPES.push(...circsResult.data);
    }
    if (reqsResult.data.length > 0) {
      LOADED_CERTIFICATION_REQUIREMENTS.length = 0;
      LOADED_CERTIFICATION_REQUIREMENTS.push(...reqsResult.data);
    }
    if (izRowsResult.data.length > 0) {
      LOADED_IZ_TABLES.length = 0;
      LOADED_IZ_TABLES.push(...izRowsResult.data);
    }
    if (acometidasResult.data.length > 0) {
      LOADED_ACOMETIDAS.length = 0;
      LOADED_ACOMETIDAS.push(...acometidasResult.data);
    }

    // Actualizar variables globales (nuevas)
    if (pmuHabitacionalResult.data.length > 0) {
      LOADED_HABITACIONAL_PMU.length = 0;
      LOADED_HABITACIONAL_PMU.push(...pmuHabitacionalResult.data);
    }
    if (pmuIndustrialResult.data.length > 0) {
      LOADED_INDUSTRIAL_PMU.length = 0;
      LOADED_INDUSTRIAL_PMU.push(...pmuIndustrialResult.data);
    }
    if (variantesHabitacionalResult.data.length > 0) {
      LOADED_HABITACIONAL_VARIANTS.length = 0;
      LOADED_HABITACIONAL_VARIANTS.push(...variantesHabitacionalResult.data);
    }
    if (variantesIndustriaResult.data.length > 0) {
      LOADED_CIRCUIT_VARIANTS.length = 0;
      LOADED_CIRCUIT_VARIANTS.push(...variantesIndustriaResult.data);
    }
    if (pilaresResult.data.length > 0) {
      LOADED_PILARES.length = 0;
      LOADED_PILARES.push(...pilaresResult.data);
    }
    if (materialesAcometidasResult.data.length > 0) {
      LOADED_MATERIALES_ACOMETIDAS.length = 0;
      LOADED_MATERIALES_ACOMETIDAS.push(...materialesAcometidasResult.data);
    }
    if (materialesGeneralesResult.data.length > 0) {
      LOADED_MATERIALES_GENERALES.length = 0;
      LOADED_MATERIALES_GENERALES.push(...materialesGeneralesResult.data);
    }
    if (materialesPorCircuitoResult.data.length > 0) {
      LOADED_MATERIALES_POR_CIRCUITO.length = 0;
      LOADED_MATERIALES_POR_CIRCUITO.push(...materialesPorCircuitoResult.data);
    }
    if (materialesPATResult.data.length > 0) {
      LOADED_MATERIALES_PAT.length = 0;
      LOADED_MATERIALES_PAT.push(...materialesPATResult.data);
    }

    CSV_LOAD_STATUS_INTERNAL.initialized = true;
    CSV_LOAD_STATUS_INTERNAL.usingFallback =
      destsResult.source === 'fallback' ||
      gradsResult.source === 'fallback' ||
      pmuHabitacionalResult.source === 'fallback';

    console.log('✅ Motor de Reglas Inicializado - Carga de CSVs:', {
      destinos: `${destsResult.source} (${LOADED_PROPERTY_DESTINATIONS.length} registros)`,
      grados: `${gradsResult.source} (${LOADED_ELECTRIFICATION_GRADES.length} registros)`,
      circuitos: `${circsResult.source} (${LOADED_CIRCUIT_TYPES.length} registros)`,
      requisitos: `${reqsResult.source} (${LOADED_CERTIFICATION_REQUIREMENTS.length} registros)`,
      tablasIz: `${izRowsResult.source} (${LOADED_IZ_TABLES.length} registros)`,
      acometidas: `${acometidasResult.source} (${LOADED_ACOMETIDAS.length} registros)`,
      pmuHabitacional: `${pmuHabitacionalResult.source} (${LOADED_HABITACIONAL_PMU.length} registros)`,
      pmuComercial: `${pmuComercialResult.source} registros`,
      pmuIndustrial: `${pmuIndustrialResult.source} (${LOADED_INDUSTRIAL_PMU.length} registros)`,
      variantesHabitacional: `${variantesHabitacionalResult.source} (${LOADED_HABITACIONAL_VARIANTS.length} registros)`,
      variantesIndustria: `${variantesIndustriaResult.source} (${LOADED_CIRCUIT_VARIANTS.length} registros)`,
      pilares: `${pilaresResult.source} (${LOADED_PILARES.length} registros)`,
      materialesAcometidas: `${materialesAcometidasResult.source} (${LOADED_MATERIALES_ACOMETIDAS.length} registros)`,
      materialesGenerales: `${materialesGeneralesResult.source} (${LOADED_MATERIALES_GENERALES.length} registros)`,
      materialesPorCircuito: `${materialesPorCircuitoResult.source} (${LOADED_MATERIALES_POR_CIRCUITO.length} registros)`,
      materialesPAT: `${materialesPATResult.source} (${LOADED_MATERIALES_PAT.length} registros)`
    });

    // Alertar si algún CSV crítico no se cargó
    if (LOADED_HABITACIONAL_PMU.length === 0) {
      console.warn('⚠️ ADVERTENCIA: pmu_habitacional.csv no se cargó, usando fallback hardcodeado');
    }
    if (LOADED_HABITACIONAL_VARIANTS.length === 0) {
      console.warn('⚠️ ADVERTENCIA: variantes_circuitos_habitacional.csv no se cargó, usando fallback hardcodeado');
    }

  } catch (error) {
    console.error('❌ Error fatal inicializando motor de reglas:', error);
  }
}

// === CÁLCULO CONSOLIDADO PARA STEP 4 ===

/**
 * Interface para el resumen consolidado del proyecto
 */
export interface ConsolidatedSummary {
  // Totales generales
  totalBocas: number;
  totalCircuits: number;
  totalPanels: number;

  // Potencias
  iluminationPower: number;
  socketsPower: number;
  specialPower: number;
  totalInstalledLoad: number;
  dpmsTotal: number;
  dpmsKVA: number;
  dpmsKW: number;

  // Eléctricos
  voltage: '220V' | '380V';
  current: number;

  // Desglose por tipo de circuito
  circuitsByType: {
    type: string;
    count: number;
    totalPower: number;
    circuits: Array<{
      id: string;
      name: string;
      environment?: string;
      power: number;
      assignedPanel: string;
    }>;
  }[];

  // Resumen por tablero
  panelsSummary: Array<{
    id: string;
    name: string;
    voltage: '220V' | '380V';
    circuitCount: number;
    dpms: number;
    ib: number;
    protectionCount: number;
  }>;

  // Grado de electrificación
  grade: string;
  minCircuits: number;
  actualCircuits: number;
}

/**
 * Calcula el resumen consolidado de todo el proyecto basado en el inventario de circuitos
 * @param inventory - Inventario de circuitos con tableros y asignaciones
 * @param config - Configuración del proyecto
 * @param environments - Ambientes configurados (para vincular circuitos)
 * @returns Resumen consolidado con todos los datos para Step 4
 */
export function calculateConsolidatedSummary(
  inventory: CircuitInventory | undefined,
  config: ProjectConfig,
  environments: EnvironmentCalculation[]
): ConsolidatedSummary {
  if (!inventory) {
    return {
      totalBocas: 0,
      totalCircuits: 0,
      totalPanels: 0,
      iluminationPower: 0,
      socketsPower: 0,
      specialPower: 0,
      totalInstalledLoad: 0,
      dpmsTotal: 0,
      dpmsKVA: 0,
      dpmsKW: 0,
      voltage: '220V',
      current: 0,
      circuitsByType: [],
      panelsSummary: [],
      grade: 'Mínimo',
      minCircuits: 0,
      actualCircuits: 0
    };
  }

  // 1. Obtener todos los circuitos asignados
  const assignedCircuits = inventory.circuits.filter(c => c.assignedPanelId);

  // 2. Calcular totales de bocas
  const totalBocas = assignedCircuits.reduce((sum, c) => sum + (c.bocas || 0), 0);

  // 3. Calcular potencias por tipo
  const iluminationPower = assignedCircuits
    .filter(c => c.type === 'IUG')
    .reduce((sum, c) => sum + c.power, 0);

  const socketsPower = assignedCircuits
    .filter(c => c.type === 'TUG')
    .reduce((sum, c) => sum + c.power, 0);

  const specialPower = assignedCircuits
    .filter(c => c.type === 'ACU' || c.type === 'TUE')
    .reduce((sum, c) => sum + c.power, 0);

  const totalInstalledLoad = iluminationPower + socketsPower + specialPower;

  // 4. Calcular DPMS total (suma de DPMS de todos los tableros)
  let dpmsTotal = 0;
  const panelsSummary = (config.panels || []).map(panel => {
    const panelCircuits = getCircuitsForPanel(inventory, panel.id);
    const panelDPMS = calculatePanelDPMS(panelCircuits);
    const panelIb = calculatePanelIb(panelDPMS, panel.voltage);

    dpmsTotal += panelDPMS;

    return {
      id: panel.id,
      name: panel.name,
      voltage: panel.voltage,
      circuitCount: panelCircuits.length,
      dpms: panelDPMS,
      ib: panelIb,
      protectionCount: panel.protections?.headers?.length || 0
    };
  });

  // 5. Convertir a kVA y kW
  const dpmsKVA = dpmsTotal / 1000;
  const dpmsKW = (dpmsTotal * 0.85) / 1000; // Factor de potencia 0.85 (según usuario)

  // 6. Determinar voltaje principal (del tablero raíz)
  const mainPanel = (config.panels || []).find(p => p.parentId === 'medidor');
  const voltage = mainPanel?.voltage || '220V';

  // 7. Calcular corriente total
  const current = calculatePanelIb(dpmsTotal, voltage);

  // 8. Desglose por tipo de circuito con ambientes
  const circuitTypes = ['IUG', 'TUG', 'ACU', 'TUE'];
  const circuitsByType = circuitTypes.map(type => {
    const circuits = assignedCircuits.filter(c => c.type === type);
    const totalPower = circuits.reduce((sum, c) => sum + c.power, 0);

    return {
      type,
      count: circuits.length,
      totalPower,
      circuits: circuits.map(c => {
        // Buscar el ambiente al que pertenece este circuito
        const environment = environments.find(env =>
          env.name === c.environmentName ||
          (c.name && c.name.includes(env.name))
        );

        const panel = (config.panels || []).find(p => p.id === c.assignedPanelId);

        return {
          id: c.id,
          name: c.name || 'Sin nombre',
          environment: environment?.name,
          power: c.power,
          assignedPanel: panel?.name || 'Sin tablero'
        };
      })
    };
  }).filter(group => group.count > 0);

  // 9. Determinar grado de electrificación
  const grade = calculateElectrificationGrade(
    config.destination,
    config.surfaceArea,
    environments
  );

  const minCircuits = getMinCircuitsForGrade(grade);
  const actualCircuits = assignedCircuits.length;

  return {
    totalBocas,
    totalCircuits: assignedCircuits.length,
    totalPanels: (config.panels || []).length,
    iluminationPower,
    socketsPower,
    specialPower,
    totalInstalledLoad,
    dpmsTotal,
    dpmsKVA,
    dpmsKW,
    voltage,
    current,
    circuitsByType,
    panelsSummary,
    grade,
    minCircuits,
    actualCircuits
  };
}

/**
 * Obtiene la cantidad mínima de circuitos requerida según el grado
 * Basado en AEA 90364-7-770 (Viviendas) y 771 (Locales)
 */
export function getMinCircuitsForGrade(grade: string): number {
  const g = grade.toLowerCase();
  if (g.includes('mínimo') || g.includes('minimo')) return 2;
  if (g.includes('medio')) return 3;
  if (g.includes('elevado')) return 5;
  if (g.includes('superior')) return 6;
  return 2; // Default seguro
}