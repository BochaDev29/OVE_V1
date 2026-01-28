/**
 * Tipos TypeScript para Sistema de Presupuestos
 */

// ==================== ENUMS ====================

export type TaxStatus = 'responsable_inscripto' | 'monotributista' | 'particular';

export type BudgetCategory =
    | 'Eléctrico'
    | 'Cableado'
    | 'Cañería'
    | 'Tableros'
    | 'Protecciones'
    | 'Obra Civil'
    | 'Mano de Obra'
    | 'Otros';

export type BudgetUnit = 'unidad' | 'metro' | 'global';

export type BudgetItemSource = 'auto' | 'manual';

// ==================== INTERFACES ====================

/**
 * Item de presupuesto personalizado por usuario
 */
export interface BudgetItem {
    id: string;
    user_id: string;

    // Definición
    name: string;
    description?: string;
    category: BudgetCategory;
    unit: BudgetUnit;

    // Precio
    unit_price: number;

    // Metadata
    is_custom: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

/**
 * Plantilla de presupuesto (para reutilizar)
 */
export interface BudgetTemplate {
    id: string;
    user_id: string;
    name: string;
    items: BudgetTemplateItem[];
    created_at: Date;
    updated_at: Date;
}

export interface BudgetTemplateItem {
    budget_item_id: string;
    quantity: number;
    notes?: string;
}

/**
 * Presupuesto generado (editable antes de exportar)
 */
export interface GeneratedBudget {
    id: string;
    project_id?: string;
    user_id: string;

    // Items
    items: BudgetLineItem[];

    // Totales
    subtotal: number;
    markup_percentage: number;
    markup_amount: number;
    vat_percentage: number;
    vat_amount: number;
    total: number;

    // Validez
    validity_days: number;

    // Metadata
    created_at: Date;
    last_edited: Date;
}

/**
 * Línea de item en presupuesto generado
 */
export interface BudgetLineItem {
    id: string;

    // Referencia al item base (puede ser null si es custom del momento)
    budget_item_id?: string;

    // Datos editables
    concept: string;
    description?: string;
    quantity: number;
    unit: BudgetUnit;
    unit_price: number;
    subtotal: number;

    // NUEVO: Etapas de Obra
    // Permite diferenciar canalización (obra gruesa) vs instalación (obra fina)
    include_canalizacion?: boolean;
    include_instalacion?: boolean;
    price_canalizacion?: number;
    price_instalacion?: number;

    // Origen
    source: BudgetItemSource;
}

/**
 * Datos para crear/actualizar item de presupuesto
 */
export interface CreateBudgetItemInput {
    name: string;
    description?: string;
    category: BudgetCategory;
    unit: BudgetUnit;
    unit_price: number;
    is_custom?: boolean;
}

export interface UpdateBudgetItemInput {
    name?: string;
    description?: string;
    category?: BudgetCategory;
    unit?: BudgetUnit;
    unit_price?: number;
    is_active?: boolean;
}

/**
 * Datos para generar presupuesto desde cómputo
 */
export interface GenerateBudgetInput {
    project_id?: string;
    compute_items: ComputeItem[];
    markup_percentage?: number;
    vat_percentage?: number;
    validity_days?: number;
}

export interface ComputeItem {
    name: string;
    quantity: number;
    unit: string;
}

/**
 * Totales calculados del presupuesto
 */
export interface BudgetTotals {
    subtotal: number;
    markup_percentage: number;
    markup_amount: number;
    vat_percentage: number;
    vat_amount: number;
    total: number;
}
