// Tipos para sistema de múltiples plantas y capas
import type { Dimension } from './dimensions';

export interface Layer {
    id: string;
    name: string; // "Muros/Ambientes", "IUG-1", "IUG-2", etc.
    color: string; // "#FF0000", "#00FF00", etc.
    visible: boolean;
    locked: boolean;
    order: number;
}

export interface PaperFormat {
    name: 'A4' | 'A3' | 'Letter';
    orientation: 'landscape' | 'portrait';
    widthMm: number;
    heightMm: number;
    widthPx: number; // Calculado a 96 DPI
    heightPx: number;
}

export interface Floor {
    id: string;
    name: string; // "Planta Baja", "Planta Alta", etc.
    format: PaperFormat;
    layers: Layer[]; // Capas compartidas entre plantas
    elements: {
        roomGroups: any[]; // Se tipará con RoomGroup & { layerId: string }
        walls: any[]; // Se tipará con Wall & { layerId: string }
        symbols: any[]; // Se tipará con SymbolItem & { layerId: string }
        pipes: any[]; // Se tipará con Pipe & { layerId: string }
        auxLines: any[]; // Se tipará con AuxLine & { layerId: string }
        dimensions: Dimension[]; // Cotas/dimensiones de la planta
    };
}

// Formatos de papel predefinidos (calculados a 96 DPI)
export const PAPER_FORMATS: Record<string, PaperFormat> = {
    'A4-landscape': {
        name: 'A4',
        orientation: 'landscape',
        widthMm: 297,
        heightMm: 210,
        widthPx: Math.round((297 / 25.4) * 96), // 1122px
        heightPx: Math.round((210 / 25.4) * 96)  // 794px
    },
    'A4-portrait': {
        name: 'A4',
        orientation: 'portrait',
        widthMm: 210,
        heightMm: 297,
        widthPx: Math.round((210 / 25.4) * 96), // 794px
        heightPx: Math.round((297 / 25.4) * 96)  // 1122px
    },
    'A3-landscape': {
        name: 'A3',
        orientation: 'landscape',
        widthMm: 420,
        heightMm: 297,
        widthPx: Math.round((420 / 25.4) * 96), // 1587px
        heightPx: Math.round((297 / 25.4) * 96)  // 1122px
    },
    'A3-portrait': {
        name: 'A3',
        orientation: 'portrait',
        widthMm: 297,
        heightMm: 420,
        widthPx: Math.round((297 / 25.4) * 96), // 1122px
        heightPx: Math.round((420 / 25.4) * 96)  // 1587px
    },
    'Letter-landscape': {
        name: 'Letter',
        orientation: 'landscape',
        widthMm: 279,
        heightMm: 216,
        widthPx: Math.round((279 / 25.4) * 96), // 1056px
        heightPx: Math.round((216 / 25.4) * 96)  // 816px
    },
    'Letter-portrait': {
        name: 'Letter',
        orientation: 'portrait',
        widthMm: 216,
        heightMm: 279,
        widthPx: Math.round((216 / 25.4) * 96), // 816px
        heightPx: Math.round((279 / 25.4) * 96)  // 1056px
    }
};

// Capas predefinidas (globales al proyecto)
export const DEFAULT_LAYERS: Layer[] = [
    {
        id: 'layer-0',
        name: 'Muros/Ambientes',
        color: '#000000', // Negro
        visible: true,
        locked: false,
        order: 0
    },
    {
        id: 'layer-1',
        name: 'IUG-1',
        color: '#FF0000', // Rojo
        visible: true,
        locked: false,
        order: 1
    },
    {
        id: 'layer-2',
        name: 'IUG-2',
        color: '#00FF00', // Verde
        visible: true,
        locked: false,
        order: 2
    },
    {
        id: 'layer-4',
        name: 'TUG-1',
        color: '#FF8C00', // Naranja
        visible: true,
        locked: false,
        order: 4
    },
    {
        id: 'layer-5',
        name: 'TUG-2',
        color: '#8A2BE2', // Violeta
        visible: true,
        locked: false,
        order: 5
    }
];

// Función helper para crear una planta nueva
export const createFloor = (name: string, formatKey: string = 'A4-landscape', initialLayers?: Layer[]): Floor => {
    return {
        id: `floor-${Date.now()}`,
        name,
        format: PAPER_FORMATS[formatKey],
        layers: initialLayers || DEFAULT_LAYERS,
        elements: {
            roomGroups: [],
            walls: [],
            symbols: [],
            pipes: [],
            auxLines: [],
            dimensions: []
        }
    };
};

// Función helper para crear una capa nueva
export const createLayer = (name: string, color: string, order: number): Layer => {
    return {
        id: `layer-${Date.now()}`,
        name,
        color,
        visible: true,
        locked: false,
        order
    };
};
