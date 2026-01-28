// Tipos centralizados para el Taller CAD

export type SymbolType =
    // Símbolos de Planta
    | 'light' | 'wall_light' | 'outlet' | 'double_outlet'
    | 'switch' | 'bell_button' | 'cp' | 'ac' | 'fan'
    | 'board' | 'tpu' | 'ground'
    // Símbolos Unifilares
    | 'feed_point' | 'meter' | 'main_breaker'
    | 'tm_1p' | 'tm_2p' | 'tm_4p' | 'diff_switch'
    | 'dist_block' | 'load_arrow'
    // Especiales
    | 'text' | 'table';

export type TradeCategory = 'electrical' | 'gas' | 'plumbing';

export type LayerId = 'architecture' | 'installation' | 'annotations';

export interface SymbolDefinition {
    id: SymbolType;
    name: string;
    category: TradeCategory;
    svgPath: string;
    strokeColor: string;
    fillColor?: string;
    metadata: {
        description: string;
        normative?: string; // Ej: "AEA 90364-7-771"
        defaultLabel?: string;
    };
}

export interface SymbolItem {
    id: string;
    type: SymbolType;
    x: number;
    y: number;
    rotation: number;
    scaleX?: number;
    scaleY?: number;
    label?: string;
    color?: string;
    fontSize?: number;
    layer?: LayerId;
}

export interface Wall {
    id: string;
    points: number[];
    layer?: LayerId;
}

export interface Pipe {
    id: string;
    points: number[];
    color: string;
    type: 'straight' | 'curved';
    layer?: LayerId;
}

export interface AuxLine {
    id: string;
    points: number[];
    layer?: LayerId;
}

export interface Layer {
    id: LayerId;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    color: string;
}

export interface ProjectData {
    projectName: string;
    address: string;
    installer: string;
    category: string;
    date: string;
}

export interface DrawingData {
    floorPlan: {
        symbols: SymbolItem[];
        walls: Wall[];
        pipes: Pipe[];
        auxLines: AuxLine[];
        pixelsPerMeter: number;
    };
    singleLine: {
        symbols: SymbolItem[];
        walls: Wall[];
        pipes: Pipe[];
        auxLines: AuxLine[];
        pixelsPerMeter: number;
    };
    backgroundBase64?: string | null;
    backgroundProps?: {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
    };
}

export interface MaterialReport {
    counts: Record<string, number>;
    totalPipeMeters: number;
    totalCableMeters: number;
}

export interface TradeCatalog {
    id: string;
    name: string;
    version: string;
    symbols: SymbolDefinition[];
    calculations: {
        materials: (symbols: SymbolItem[], pipes: Pipe[], pixelsPerMeter: number) => MaterialReport;
        loads?: (symbols: SymbolItem[]) => any;
    };
}
