/**
 * Plantilla AEA Predefinida
 * Items comunes basados en normativa AEA 90364
 */

import type { BudgetCategory, BudgetUnit } from '../types/budget';

export interface AEATemplateItem {
    name: string;
    description: string;
    category: BudgetCategory;
    unit: BudgetUnit;
    unit_price: number; // 0 = usuario debe configurar
}

/**
 * Plantilla de items predefinidos según normativa AEA
 * Usuario puede editar precios según su zona/costos
 */
export const AEA_TEMPLATE_ITEMS: AEATemplateItem[] = [
    // ==================== ELÉCTRICO ====================
    {
        name: 'Boca de Techo (Octogonal)',
        description: 'Caja octogonal para luminaria de techo',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Boca de Pared (Aplique)',
        description: 'Caja para luminaria de pared (aplique)',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Toma Corriente Simple',
        description: 'Caja rectangular con toma corriente 10A',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Toma Corriente Doble',
        description: 'Caja rectangular con toma corriente doble 10A',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Llave Simple',
        description: 'Caja rectangular con llave de un punto',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Llave Combinada',
        description: 'Caja rectangular con llave combinada',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Toma Especial (TUE)',
        description: 'Toma de uso específico (aire acondicionado, etc.)',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Caja de Paso/Derivación',
        description: 'Caja de paso para derivaciones',
        category: 'Eléctrico',
        unit: 'unidad',
        unit_price: 0
    },

    // ==================== CABLEADO ====================
    {
        name: 'Cable 1.5mm² por metro',
        description: 'Cable unipolar 1.5mm² (iluminación)',
        category: 'Cableado',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Cable 2.5mm² por metro',
        description: 'Cable unipolar 2.5mm² (tomas)',
        category: 'Cableado',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Cable 4mm² por metro',
        description: 'Cable unipolar 4mm² (especiales)',
        category: 'Cableado',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Cable 6mm² por metro',
        description: 'Cable unipolar 6mm² (alimentación)',
        category: 'Cableado',
        unit: 'metro',
        unit_price: 0
    },

    // ==================== CAÑERÍA ====================
    {
        name: 'Cañería Ø19mm por metro',
        description: 'Caño corrugado Ø19mm (3/4")',
        category: 'Cañería',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Cañería Ø25mm por metro',
        description: 'Caño corrugado Ø25mm (1")',
        category: 'Cañería',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Cañería Ø32mm por metro',
        description: 'Caño corrugado Ø32mm (1 1/4")',
        category: 'Cañería',
        unit: 'metro',
        unit_price: 0
    },

    // ==================== TABLEROS ====================
    {
        name: 'Tablero Principal',
        description: 'Tablero principal con disyuntor general',
        category: 'Tableros',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Tablero Seccional',
        description: 'Tablero seccional (TPU)',
        category: 'Tableros',
        unit: 'unidad',
        unit_price: 0
    },

    // ==================== PROTECCIONES ====================
    {
        name: 'Térmica Monopolar 10A',
        description: 'Llave termomagnética monopolar 10A (IUG)',
        category: 'Protecciones',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Térmica Monopolar 16A',
        description: 'Llave termomagnética monopolar 16A (TUG)',
        category: 'Protecciones',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Térmica Bipolar 20A',
        description: 'Llave termomagnética bipolar 20A (TUE)',
        category: 'Protecciones',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Disyuntor Diferencial 25A',
        description: 'Interruptor diferencial 25A 30mA',
        category: 'Protecciones',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Disyuntor Diferencial 40A',
        description: 'Interruptor diferencial 40A 30mA',
        category: 'Protecciones',
        unit: 'unidad',
        unit_price: 0
    },

    // ==================== OBRA CIVIL ====================
    {
        name: 'Zanjeo por metro',
        description: 'Zanjeo para cañería subterránea',
        category: 'Obra Civil',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Canaleta por metro',
        description: 'Canaleta plástica para cables',
        category: 'Obra Civil',
        unit: 'metro',
        unit_price: 0
    },
    {
        name: 'Perforación en muro',
        description: 'Perforación para paso de cañería',
        category: 'Obra Civil',
        unit: 'unidad',
        unit_price: 0
    },

    // ==================== MANO DE OBRA ====================
    {
        name: 'Instalación punto de luz',
        description: 'Mano de obra instalación boca de luz',
        category: 'Mano de Obra',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Instalación toma corriente',
        description: 'Mano de obra instalación toma',
        category: 'Mano de Obra',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Instalación tablero',
        description: 'Mano de obra instalación y conexionado de tablero',
        category: 'Mano de Obra',
        unit: 'unidad',
        unit_price: 0
    },
    {
        name: 'Tendido de cable por metro',
        description: 'Mano de obra tendido de cable',
        category: 'Mano de Obra',
        unit: 'metro',
        unit_price: 0
    }
];

/**
 * Inicializa items de plantilla AEA para un usuario nuevo
 */
export const getAEATemplateForUser = (userId: string) => {
    return AEA_TEMPLATE_ITEMS.map(item => ({
        ...item,
        user_id: userId,
        is_custom: false, // Marca que viene de plantilla AEA
        is_active: true
    }));
};
