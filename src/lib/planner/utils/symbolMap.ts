/**
 * symbolMap.ts
 * 
 * Diccionarios de traducción bidireccional entre la nomenclatura de dominios
 * del Wizard (ej. IUG, TUG, PIA) y los IDs específicos del catálogo SVG del CAD.
 */

// De Wizard a CAD
export const WIZARD_TO_CAD_MAP: Record<string, string> = {
    // ==== Protecciones ====
    'PIA_1P': 'pia_1p',
    'PIA_3P': 'pia_3p',
    'ID_2P': 'diff_switch',
    'ID_4P': 'id_3p',
    // ==== Circuitos ====
    'IUG': 'ct_220',
    'TUG': 'ct_220',
    'TUE': 'ct_220',
    'ACU': 'ct_220', // Si hay uno específico de clima en unifilar, se cambia acá
    // ==== Líneas ====
    'LP_220': 'lp_220',
    'LP_380': 'lp_380',
    'CS_220': 'cs_220',
    'CS_380': 'cs_380',
    // ==== Generales ====
    'ACOMETIDA': 'feed_point',
    'MEDIDOR': 'meter',
    'BORNERA': 'dist_block',
    'PAT': 'ground'
};

// De CAD a Wizard (Agrupación para métricas/validación)
export type ValidationGroup = 'IUG' | 'TUG' | 'TUE' | 'ID';

// Este mapa agrupa los símbolos del CAD dibujados en el tablero a los contadores que espera el QuotaPanel
export const CAD_TO_QUOTA_MAP: Record<string, ValidationGroup> = {
    'pia_1p': 'IUG', // Por defecto, una térmica de 1 Polo sin contexto cuenta como circuito base (IUG/TUG comparten bolsa)
    'tm_1p': 'IUG',  // (por si quedó algún tm_1p residual o se dibuja a mano)
    'pia_3p': 'TUE', // Térmicas trifásicas van a cargas especiales por defecto
    'tm_2p': 'TUE',
    'tm_3p': 'TUE',
    'diff_switch': 'ID',
    'id_3p': 'ID'
};

/**
 * Función helper para contar cuántos interruptores del CAD 
 * corresponden a una categoría del Wizard.
 */
export const countBreakersByCategory = (
    symbols: any[],
    targetCategory: ValidationGroup
): number => {
    return symbols.filter(s => {
        const mappedCategory = CAD_TO_QUOTA_MAP[s.type];
        return mappedCategory === targetCategory;
    }).length;
};
