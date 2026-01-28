/**
 * Generador de presupuestos desde cómputo de materiales
 * Mapea items del cómputo a items de presupuesto con precios configurados
 */

import type { BudgetLineItem, ComputeItem } from '../../types/budget';
import type { BudgetItem } from '../../types/budget';

/**
 * Genera items de presupuesto desde cómputo de materiales
 * Mapea inteligentemente los items del cómputo con los items configurados del usuario
 */
export const generateBudgetFromComputo = (
    computeItems: ComputeItem[],
    userBudgetItems: BudgetItem[]
): BudgetLineItem[] => {
    return computeItems.map((computeItem, index) => {
        // Buscar item configurado que coincida
        const matchedItem = findMatchingBudgetItem(computeItem, userBudgetItems);

        if (matchedItem) {
            // Item encontrado - aplicar precio configurado
            // Sugerir división 60/40 para etapas (canalización más cara)
            const price_canalizacion = matchedItem.unit_price * 0.6;
            const price_instalacion = matchedItem.unit_price * 0.4;

            return {
                id: `line-${index}-${Date.now()}`,
                budget_item_id: matchedItem.id,
                concept: matchedItem.name,
                description: matchedItem.description,
                quantity: computeItem.quantity,
                unit: matchedItem.unit,
                unit_price: matchedItem.unit_price,
                subtotal: computeItem.quantity * matchedItem.unit_price,

                // NUEVO: Sugerir ambas etapas por defecto
                include_canalizacion: true,
                include_instalacion: true,
                price_canalizacion,
                price_instalacion,

                source: 'auto' as const
            };
        }

        // No se encontró match - crear item sin precio (usuario debe completar)
        return {
            id: `line-${index}-${Date.now()}`,
            concept: computeItem.name,
            quantity: computeItem.quantity,
            unit: computeItem.unit as any,
            unit_price: 0,
            subtotal: 0,

            // Sin etapas si no hay precio
            include_canalizacion: false,
            include_instalacion: false,

            source: 'auto' as const
        };
    });
};

/**
 * Busca un item de presupuesto configurado que coincida con el item del cómputo
 * Usa matching inteligente por nombre
 */
const findMatchingBudgetItem = (
    computeItem: ComputeItem,
    userBudgetItems: BudgetItem[]
): BudgetItem | null => {
    const computeName = computeItem.name.toLowerCase();

    // 1. Búsqueda exacta
    let match = userBudgetItems.find(item =>
        item.name.toLowerCase() === computeName
    );
    if (match) return match;

    // 2. Búsqueda por inclusión (nombre del cómputo contiene nombre del item)
    match = userBudgetItems.find(item => {
        const itemName = item.name.toLowerCase();
        return computeName.includes(itemName) || itemName.includes(computeName);
    });
    if (match) return match;

    // 3. Búsqueda por palabras clave
    const keywords = extractKeywords(computeName);
    match = userBudgetItems.find(item => {
        const itemKeywords = extractKeywords(item.name.toLowerCase());
        return keywords.some(kw => itemKeywords.includes(kw));
    });
    if (match) return match;

    // 4. Mapeo específico para items comunes
    const mappings: Record<string, string[]> = {
        'boca': ['boca de techo', 'bocas de techo', 'octogonal'],
        'toma': ['toma corriente', 'tomas', 'cajas rectangulares'],
        'llave': ['llave simple', 'llaves', 'interruptor'],
        'cable': ['cable', 'cableado'],
        'cañería': ['cañería', 'caño', 'corrugado'],
        'tablero': ['tablero', 'gabinete'],
        'térmica': ['térmica', 'termomagnética', 'protección'],
        'muro': ['muro', 'pared', 'tabique'],
        'zanjeo': ['zanjeo', 'excavación']
    };

    for (const [key, aliases] of Object.entries(mappings)) {
        if (aliases.some(alias => computeName.includes(alias))) {
            match = userBudgetItems.find(item =>
                item.name.toLowerCase().includes(key)
            );
            if (match) return match;
        }
    }

    return null;
};

/**
 * Extrae palabras clave relevantes de un nombre
 */
const extractKeywords = (name: string): string[] => {
    // Palabras a ignorar
    const stopWords = ['de', 'del', 'la', 'el', 'los', 'las', 'por', 'con', 'para', 'en'];

    return name
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .map(word => word.toLowerCase());
};

/**
 * Convierte datos del MaterialReportModal al formato ComputeItem
 */
export const convertMaterialReportToComputeItems = (
    materialCounts: Record<string, number>,
    totalPipeMeters: number,
    totalCableMeters: number,
    totalWallMeters: number,
    totalRooms: number,
    estimatedArea: number
): ComputeItem[] => {
    const items: ComputeItem[] = [];

    // Items de cajas y elementos
    Object.entries(materialCounts).forEach(([name, count]) => {
        items.push({
            name,
            quantity: count,
            unit: 'unidad'
        });
    });

    // Cañería
    if (totalPipeMeters > 0) {
        items.push({
            name: 'Cañería (Trazado Horizontal)',
            quantity: totalPipeMeters,
            unit: 'metro'
        });
    }

    // Cable
    if (totalCableMeters > 0) {
        items.push({
            name: 'Cable Unipolar 2.5mm (Estimado)',
            quantity: totalCableMeters,
            unit: 'metro'
        });
    }

    // Muros
    if (totalWallMeters > 0) {
        items.push({
            name: 'Muros (Longitud Total)',
            quantity: totalWallMeters,
            unit: 'metro'
        });
    }

    // Ambientes
    if (totalRooms > 0) {
        items.push({
            name: 'Ambientes',
            quantity: totalRooms,
            unit: 'unidad'
        });
    }

    return items;
};
