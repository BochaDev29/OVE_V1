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
    nature?: 'relevado' | 'proyectado';
    natureDistinction?: {
        relevado: number;
        proyectado: number;
    };
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
        // Desglose por naturaleza
        lightsRel: number;
        outletsRel: number;
        specialRel: number;
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

        // 1. IUG - Iluminación
        const totalLights = (env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) || (env.lights || 0);
        if (totalLights > 0) {
            circuits.push({
                circuitId: 'IUG',
                circuitName: 'IUG (Iluminación)',
                circuitType: 'IUG',
                color: '#FFD700',
                required: totalLights,
                placed: 0,
                isComplete: false,
                natureDistinction: {
                    relevado: env.bocasLuzRelevado || 0,
                    proyectado: env.bocasLuzProyectado || (env.lights || 0) - (env.bocasLuzRelevado || 0)
                }
            });
        }

        // 2. TUG - Tomas
        const totalOutlets = (env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0) || (env.regularOutlets || 0);
        if (totalOutlets > 0) {
            circuits.push({
                circuitId: 'TUG',
                circuitName: 'TUG (Tomas)',
                circuitType: 'TUG',
                color: '#FF6B6B',
                required: totalOutlets,
                placed: 0,
                isComplete: false,
                natureDistinction: {
                    relevado: env.bocasTomasRelevado || 0,
                    proyectado: env.bocasTomasProyectado || (env.regularOutlets || 0) - (env.bocasTomasRelevado || 0)
                }
            });
        }

        // 3. Especiales (TUE/ACU/etc)
        const specialLoads = env.specialLoads || [];
        specialLoads.forEach((load: any, lIdx: number) => {
            circuits.push({
                circuitId: `SPEC-${lIdx}`,
                circuitName: `${load.type} - ${load.name || 'Carga'}`,
                circuitType: load.type as any,
                color: '#9B59B6',
                required: load.bocas || 1,
                placed: 0,
                isComplete: false,
                nature: load.nature || 'proyectado'
            });
        });

        // Caso legacy si no hay specialLoads pero sí specialOutlets
        if (specialLoads.length === 0 && env.specialOutlets > 0) {
            circuits.push({
                circuitId: 'TUE',
                circuitName: 'TUE (Especiales)',
                circuitType: 'TUE',
                color: '#9B59B6',
                required: env.specialOutlets,
                placed: 0,
                isComplete: false
            });
        }

        environments.push({
            name: env.name || 'Ambiente',
            area: env.surface || env.area || 0,
            circuits,
            isComplete: false
        });
    });

    // Calcular totales generales
    const totalRequired = {
        lights: (calculationData.environments || []).reduce(
            (sum: number, env: any) => sum + ((env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) || (env.lights || 0)), 0
        ),
        outlets: (calculationData.environments || []).reduce(
            (sum: number, env: any) => sum + ((env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0) || (env.regularOutlets || 0)), 0
        ),
        special: (calculationData.environments || []).reduce(
            (sum: number, env: any) => {
                const specLoads = env.specialLoads || [];
                if (specLoads.length > 0) {
                    return sum + specLoads.reduce((s: number, l: any) => s + (l.bocas || 1), 0);
                }
                return sum + (env.specialOutlets || 0);
            }, 0
        )
    };

    const totalPlaced = {
        lights: symbols.filter(s => s.type === 'light' || s.type === 'wall_light').length,
        outlets: symbols.filter(s => s.type === 'outlet').length,
        special: symbols.filter(s => s.type === 'ac' || s.type === 'fan').length,
        // Desglose por naturaleza
        lightsRel: symbols.filter(s => (s.type === 'light' || s.type === 'wall_light') && s.nature === 'relevado').length,
        outletsRel: symbols.filter(s => s.type === 'outlet' && s.nature === 'relevado').length,
        specialRel: symbols.filter(s => (s.type === 'ac' || s.type === 'fan') && s.nature === 'relevado').length,
    };

    // Calcular items faltantes
    const missingItems: string[] = [];
    if (totalPlaced.lights < totalRequired.lights) missingItems.push(`${totalRequired.lights - totalPlaced.lights} luces`);
    if (totalPlaced.outlets < totalRequired.outlets) missingItems.push(`${totalRequired.outlets - totalPlaced.outlets} tomas`);
    if (totalPlaced.special < totalRequired.special) missingItems.push(`${totalRequired.special - totalPlaced.special} especiales`);

    return {
        totalRequired,
        totalPlaced,
        environments,
        isComplete: missingItems.length === 0,
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
            IUG: Math.ceil((calc.totalBocas || 0) / 15),
            TUG: Math.ceil((calc.totalBocas || 0) / 15),
            TUE: 0
        },
        distBlocks: Math.max(1, Math.ceil((calc.minCircuits || 0) / 6)),
        loadArrows: calc.minCircuits || 0
    };

    // Elementos colocados
    const placed = {
        feedPoint: symbols.filter(s => s.type === 'feed_point' || s.type === 'meter').length, // Simplificado
        meter: symbols.filter(s => s.type === 'meter').length,
        mainBreaker: symbols.filter(s => s.type === 'main_breaker' || s.type === 'diff_switch' || s.type === 'id_3p').length, // Acepta el diferencial principal
        breakers: {
            IUG: symbols.filter(s => s.type === 'tm_1p' || s.type === 'pia_1p').length,
            TUG: symbols.filter(s => s.type === 'tm_1p' || s.type === 'pia_1p').length,
            TUE: symbols.filter(s => s.type === 'tm_2p' || s.type === 'pia_3p').length
        },
        distBlocks: symbols.filter(s => s.type === 'dist_block' || s.type?.startsWith('dist_block_')).length,
        loadArrows: symbols.filter(s => s.type === 'load_arrow' || s.type === 'ct_220' || s.type === 'ct_380').length
    };

    // Items faltantes
    const missingItems: string[] = [];
    if (placed.feedPoint < required.feedPoint) missingItems.push('Punto de alimentación');
    if (placed.meter < required.meter) missingItems.push('Medidor');
    if (placed.mainBreaker < required.mainBreaker) missingItems.push('Disyuntor general');

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
