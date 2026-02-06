// Tipos para sistema de aberturas (puertas y ventanas)

/**
 * Tipo base para aberturas (puertas y ventanas)
 */
export interface Opening {
    id: string;
    type: 'door' | 'window' | 'passage';

    // Vinculación al ambiente
    roomGroupId: string;  // ID del RoomGroup al que pertenece
    wallIndex: number;    // Índice de la pared (0-3) en el RoomGroup

    // Posición en el muro (normalizada 0-1)
    position: number;     // Posición a lo largo del muro (0 = inicio, 1 = fin)

    // Dimensiones en metros
    width: number;        // Ancho de la abertura (ej: 0.80)

    // Metadata
    layerId: string;      // Siempre 'layer-0' (Muros/Ambientes)
}

/**
 * Puerta con arco de apertura
 */
export interface DoorOpening extends Opening {
    type: 'door';
    doorSwing: 'left' | 'right';      // Lado de la bisagra
    openingDirection: 'in' | 'out'; // Sentido de apertura (Hacia adentro/afuera)
    height: number;                   // Alto de la puerta (típicamente 2.00m)
}

/**
 * Ventana con doble línea
 */
export interface WindowOpening extends Opening {
    type: 'window';
    height: number;       // Alto de la ventana (ej: 1.20m)
    sillHeight: number;   // Altura del alféizar desde el piso (ej: 0.90m)
}

/**
 * Dimensiones típicas de puertas (en metros)
 */
export const DOOR_WIDTHS = [
    { label: '0.70m', value: 0.70 },
    { label: '0.80m', value: 0.80 },
    { label: '0.90m', value: 0.90 },
    { label: '1.00m', value: 1.00 },
    { label: '1.20m (Doble)', value: 1.20 }
] as const;

/**
 * Dimensiones típicas de ventanas (en metros)
 */
export const WINDOW_SIZES = [
    { label: '0.60m × 1.00m', width: 0.60, height: 1.00 },
    { label: '0.80m × 1.20m', width: 0.80, height: 1.20 },
    { label: '1.00m × 1.20m', width: 1.00, height: 1.20 },
    { label: '1.20m × 1.20m', width: 1.20, height: 1.20 },
    { label: '1.50m × 1.20m', width: 1.50, height: 1.20 }
] as const;

/**
 * Altura estándar de puertas
 */
export const DOOR_HEIGHT = 2.00; // metros

/**
 * Altura estándar de alféizar de ventanas
 */
export const DEFAULT_SILL_HEIGHT = 0.90; // metros

/**
 * Función helper para crear una puerta
 */
export const createDoor = (
    roomGroupId: string,
    wallIndex: number,
    position: number,
    width: number = 0.80,
    doorSwing: 'left' | 'right' = 'right',
    openingDirection: 'in' | 'out' = 'out'
): DoorOpening => {
    return {
        id: `door-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'door',
        roomGroupId,
        wallIndex,
        position,
        width,
        height: DOOR_HEIGHT,
        doorSwing,
        openingDirection,
        layerId: 'layer-0'
    };
};

/**
 * Función helper para crear una ventana
 */
export const createWindow = (
    roomGroupId: string,
    wallIndex: number,
    position: number,
    width: number = 1.00,
    height: number = 1.20,
    sillHeight: number = DEFAULT_SILL_HEIGHT
): WindowOpening => {
    return {
        id: `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'window',
        roomGroupId,
        wallIndex,
        position,
        width,
        height,
        sillHeight,
        layerId: 'layer-0'
    };
};

/**
 * Función helper para crear un vano/paso
 */
export const createPassage = (
    roomGroupId: string,
    wallIndex: number,
    position: number,
    width: number = 0.80
): Opening => {
    return {
        id: `passage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'passage',
        roomGroupId,
        wallIndex,
        position,
        width,
        layerId: 'layer-0'
    };
};
