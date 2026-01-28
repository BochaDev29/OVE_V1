import { useMemo } from 'react';

/**
 * Hook para calcular el estado de cumplimiento del proyecto
 * comparando lo calculado por el wizard vs lo dibujado en el taller
 */

// ==================== INTERFACES ====================

export interface CircuitQuota {
    circuitId: string;      // "IUG-1", "TUG-2"
    circuitName: string;
    circuitType: 'IUG' | 'TUG' | 'TUE' | 'ACU';
    color: string;

    // Bocas
    required: number;
    placed: number;
    isComplete: boolean;
}

export interface EnvironmentQuota {
    name: string;
    area: number;
    circuits: CircuitQuota[];
    isComplete: boolean;
}

export interface FloorPlanQuota {
    totalRequired: {
        lights: number;
        outlets: number;
        special: number;
    };
    totalPlaced: {
        lights: number;
        outlets: number;
        special: number;
    };
    environments: EnvironmentQuota[];
    isComplete: boolean;
    missingItems: string[];
}

export interface SingleLineQuota {
    required: {
        feedPoint: number;
        meter: number;
        mainBreaker: number;
        breakers: { IUG: number; TUG: number; TUE: number };
        distBlocks: number;
        loadArrows: number;
    };
    placed: {
        feedPoint: number;
        meter: number;
        mainBreaker: number;
        breakers: { IUG: number; TUG: number; TUE: number };
        distBlocks: number;
        loadArrows: number;
    };
    isComplete: boolean;
    missingItems: string[];
}

export interface ProjectQuota {
    mode: 'floorPlan' | 'singleLine';
    floorPlan: FloorPlanQuota | null;
    singleLine: SingleLineQuota | null;
}

// ==================== HELPERS ====================

/**
 * Obtiene el tipo de circuito desde el ID
 */
const getCircuitType = (circuitId: string): 'IUG' | 'TUG' | 'TUE' | 'ACU' => {
    if (circuitId.startsWith('IUG')) return 'IUG';
    if (circuitId.startsWith('TUG')) return 'TUG';
    if (circuitId.startsWith('TUE')) return 'TUE';
    if (circuitId.startsWith('ACU')) return 'ACU';
    return 'TUG'; // Default
};

/**
 * Verifica si un símbolo corresponde a un tipo de circuito
 */
const matchesCircuitType = (symbolType: string, circuitType: string): boolean => {
    if (circuitType === 'IUG') {
        return symbolType === 'light' || symbolType === 'wall_light';
    }
    if (circuitType === 'TUG') {
        return symbolType === 'outlet';
    }
    if (circuitType === 'TUE' || circuitType === 'ACU') {
        return symbolType === 'ac' || symbolType === 'fan';
    }
    return false;
};

/**
 * Obtiene el emoji para un tipo de circuito
 */
export const getCircuitIcon = (circuitType: string): string => {
    if (circuitType === 'IUG') return '💡';
    if (circuitType === 'TUG') return '🔌';
    if (circuitType === 'TUE' || circuitType === 'ACU') return '⚡';
    return '🔧';
};

// ==================== CÁLCULOS ====================

/**
 * Calcula quota para modo planta (bocas por ambiente y circuito)
 */
const calculateFloorPlanQuota = (
    calculationData: any,
    symbols: any[]
): FloorPlanQuota => {
    const environments: EnvironmentQuota[] = [];

    // Por cada ambiente del wizard
    (calculationData.environments || []).forEach((env: any) => {
        const circuits: CircuitQuota[] = [];

        // Extraer circuitos del ambiente
        // El wizard guarda: lights, regularOutlets, specialOutlets
        // Necesitamos mapear a circuitos

        // IUG - Iluminación
        if (env.lights > 0) {
            const placed = symbols.filter(s =>
                (s.type === 'light' || s.type === 'wall_light')
            ).length;

            circuits.push({
                circuitId: 'IUG',
                circuitName: 'IUG (Iluminación)',
                circuitType: 'IUG',
                color: '#FFD700',
                required: env.lights || 0,
                placed: 0, // Se calculará después por ambiente
                isComplete: false
            });
        }

        // TUG - Tomas
        if (env.regularOutlets > 0) {
            circuits.push({
                circuitId: 'TUG',
                circuitName: 'TUG (Tomas)',
                circuitType: 'TUG',
                color: '#FF6B6B',
                required: env.regularOutlets || 0,
                placed: 0,
                isComplete: false
            });
        }

        // TUE - Especiales
        if (env.specialOutlets > 0) {
            circuits.push({
                circuitId: 'TUE',
                circuitName: 'TUE (Especiales)',
                circuitType: 'TUE',
                color: '#9B59B6',
                required: env.specialOutlets || 0,
                placed: 0,
                isComplete: false
            });
        }

        environments.push({
            name: env.name || 'Ambiente',
            area: env.area || 0,
            circuits,
            isComplete: circuits.every(c => c.isComplete)
        });
    });

    // Calcular totales generales
    const totalRequired = {
        lights: (calculationData.environments || []).reduce(
            (sum: number, env: any) => sum + (env.lights || 0), 0
        ),
        outlets: (calculationData.environments || []).reduce(
            (sum: number, env: any) => sum + (env.regularOutlets || 0), 0
        ),
        special: (calculationData.environments || []).reduce(
            (sum: number, env: any) => sum + (env.specialOutlets || 0), 0
        )
    };

    const totalPlaced = {
        lights: symbols.filter(s =>
            s.type === 'light' || s.type === 'wall_light'
        ).length,
        outlets: symbols.filter(s => s.type === 'outlet').length,
        special: symbols.filter(s =>
            s.type === 'ac' || s.type === 'fan'
        ).length
    };

    // Calcular items faltantes
    const missingItems: string[] = [];
    if (totalPlaced.lights < totalRequired.lights) {
        missingItems.push(`${totalRequired.lights - totalPlaced.lights} luces`);
    }
    if (totalPlaced.outlets < totalRequired.outlets) {
        missingItems.push(`${totalRequired.outlets - totalPlaced.outlets} tomas`);
    }
    if (totalPlaced.special < totalRequired.special) {
        missingItems.push(`${totalRequired.special - totalPlaced.special} especiales`);
    }

    return {
        totalRequired,
        totalPlaced,
        environments,
        isComplete:
            totalPlaced.lights >= totalRequired.lights &&
            totalPlaced.outlets >= totalRequired.outlets &&
            totalPlaced.special >= totalRequired.special,
        missingItems
    };
};

/**
 * Calcula quota para modo unifilar (elementos del diagrama)
 */
const calculateSingleLineQuota = (
    calculationData: any,
    symbols: any[]
): SingleLineQuota => {
    const calc = calculationData.calculation || {};

    // Elementos requeridos según cálculo
    const required = {
        feedPoint: 1,
        meter: 1,
        mainBreaker: 1,
        breakers: {
            IUG: Math.ceil((calc.totalBocas || 0) / 15), // Estimación simple
            TUG: Math.ceil((calc.totalBocas || 0) / 15),
            TUE: 0 // Se calcula según especiales
        },
        distBlocks: Math.max(1, Math.ceil((calc.minCircuits || 0) / 6)),
        loadArrows: calc.minCircuits || 0
    };

    // Elementos colocados
    const placed = {
        feedPoint: symbols.filter(s => s.type === 'feed_point').length,
        meter: symbols.filter(s => s.type === 'meter').length,
        mainBreaker: symbols.filter(s => s.type === 'main_breaker').length,
        breakers: {
            IUG: symbols.filter(s => s.type === 'tm_1p').length,
            TUG: symbols.filter(s => s.type === 'tm_1p').length,
            TUE: symbols.filter(s => s.type === 'tm_2p').length
        },
        distBlocks: symbols.filter(s => s.type === 'dist_block').length,
        loadArrows: symbols.filter(s => s.type === 'load_arrow').length
    };

    // Items faltantes
    const missingItems: string[] = [];
    if (placed.feedPoint < required.feedPoint) {
        missingItems.push('Punto de alimentación');
    }
    if (placed.meter < required.meter) {
        missingItems.push('Medidor');
    }
    if (placed.mainBreaker < required.mainBreaker) {
        missingItems.push('Disyuntor general');
    }

    return {
        required,
        placed,
        isComplete:
            placed.feedPoint >= required.feedPoint &&
            placed.meter >= required.meter &&
            placed.mainBreaker >= required.mainBreaker,
        missingItems
    };
};

// ==================== HOOK ====================

export const useProjectQuota = (
    calculationData: any,
    symbols: any[],
    activeMode: 'floorPlan' | 'singleLine'
): ProjectQuota | null => {
    return useMemo(() => {
        if (!calculationData) return null;

        const floorPlanQuota = calculateFloorPlanQuota(calculationData, symbols);
        const singleLineQuota = calculateSingleLineQuota(calculationData, symbols);

        return {
            mode: activeMode,
            floorPlan: floorPlanQuota,
            singleLine: singleLineQuota
        };
    }, [calculationData, symbols, activeMode]);
};
