import { supabase } from '../lib/supabase';
import type {
    BudgetItem,
    BudgetTemplate,
    GeneratedBudget,
    BudgetLineItem,
    CreateBudgetItemInput,
    UpdateBudgetItemInput,
    GenerateBudgetInput,
    BudgetTotals,
    ComputeItem
} from '../types/budget';
import { getAEATemplateForUser } from '../lib/budget/aeaTemplate';

/**
 * Servicio para gestión de presupuestos
 */
export const BudgetService = {
    // ==================== BUDGET ITEMS ====================

    /**
     * Obtiene todos los items de presupuesto del usuario
     */
    async getUserBudgetItems(userId: string): Promise<BudgetItem[]> {
        const { data, error } = await supabase
            .from('user_budget_items')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching budget items:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Crea un nuevo item de presupuesto
     */
    async createBudgetItem(
        userId: string,
        input: CreateBudgetItemInput
    ): Promise<BudgetItem> {
        const { data, error } = await supabase
            .from('user_budget_items')
            .insert({
                user_id: userId,
                ...input
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating budget item:', error);
            throw error;
        }

        return data;
    },

    /**
     * Actualiza un item de presupuesto
     */
    async updateBudgetItem(
        itemId: string,
        input: UpdateBudgetItemInput
    ): Promise<BudgetItem> {
        const { data, error } = await supabase
            .from('user_budget_items')
            .update(input)
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            console.error('Error updating budget item:', error);
            throw error;
        }

        return data;
    },

    /**
     * Elimina (desactiva) un item de presupuesto
     */
    async deleteBudgetItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('user_budget_items')
            .update({ is_active: false })
            .eq('id', itemId);

        if (error) {
            console.error('Error deleting budget item:', error);
            throw error;
        }
    },

    /**
     * Aplica multiplicador de actualización a todos los precios
     */
    async applyPriceMultiplier(
        userId: string,
        percentage: number
    ): Promise<void> {
        // Obtener todos los items activos
        const items = await this.getUserBudgetItems(userId);

        // Calcular nuevos precios
        const updates = items.map(item => ({
            id: item.id,
            unit_price: item.unit_price * (1 + percentage / 100)
        }));

        // Actualizar en batch
        const { error } = await supabase
            .from('user_budget_items')
            .upsert(updates);

        if (error) {
            console.error('Error applying price multiplier:', error);
            throw error;
        }
    },

    /**
     * Inicializa items de plantilla AEA para usuario nuevo
     */
    async initializeAEATemplate(userId: string): Promise<void> {
        const templateItems = getAEATemplateForUser(userId);

        const { error } = await supabase
            .from('user_budget_items')
            .insert(templateItems);

        if (error) {
            console.error('Error initializing AEA template:', error);
            throw error;
        }
    },

    // ==================== BUDGET GENERATION ====================

    /**
     * Genera presupuesto desde cómputo de materiales
     */
    async generateBudgetFromCompute(
        userId: string,
        input: GenerateBudgetInput
    ): Promise<GeneratedBudget> {
        // Obtener items configurados del usuario
        const userItems = await this.getUserBudgetItems(userId);

        // Mapear items del cómputo a items de presupuesto
        const budgetLineItems: BudgetLineItem[] = input.compute_items.map(
            (computeItem, index) => {
                // Buscar item configurado que coincida
                const matchedItem = userItems.find(item =>
                    item.name.toLowerCase().includes(computeItem.name.toLowerCase()) ||
                    computeItem.name.toLowerCase().includes(item.name.toLowerCase())
                );

                if (matchedItem) {
                    return {
                        id: `line-${index}`,
                        budget_item_id: matchedItem.id,
                        concept: matchedItem.name,
                        description: matchedItem.description,
                        quantity: computeItem.quantity,
                        unit: matchedItem.unit,
                        unit_price: matchedItem.unit_price,
                        subtotal: computeItem.quantity * matchedItem.unit_price,
                        source: 'auto' as const
                    };
                }

                // Si no hay match, crear item sin precio (usuario debe completar)
                return {
                    id: `line-${index}`,
                    concept: computeItem.name,
                    quantity: computeItem.quantity,
                    unit: computeItem.unit as any,
                    unit_price: 0,
                    subtotal: 0,
                    source: 'auto' as const
                };
            }
        );

        // Calcular totales
        const totals = this.calculateBudgetTotals(
            budgetLineItems,
            input.markup_percentage || 0,
            input.vat_percentage || 21
        );

        // Crear presupuesto generado
        const { data, error } = await supabase
            .from('generated_budgets')
            .insert({
                project_id: input.project_id,
                user_id: userId,
                items: budgetLineItems,
                ...totals,
                validity_days: input.validity_days || 5
            })
            .select()
            .single();

        if (error) {
            console.error('Error generating budget:', error);
            throw error;
        }

        return data;
    },

    /**
     * Actualiza presupuesto generado
     */
    async updateGeneratedBudget(
        budgetId: string,
        items: BudgetLineItem[],
        markupPercentage: number,
        vatPercentage: number
    ): Promise<GeneratedBudget> {
        const totals = this.calculateBudgetTotals(
            items,
            markupPercentage,
            vatPercentage
        );

        const { data, error } = await supabase
            .from('generated_budgets')
            .update({
                items,
                ...totals
            })
            .eq('id', budgetId)
            .select()
            .single();

        if (error) {
            console.error('Error updating generated budget:', error);
            throw error;
        }

        return data;
    },

    /**
     * Obtiene presupuesto generado por ID
     */
    async getGeneratedBudget(budgetId: string): Promise<GeneratedBudget | null> {
        const { data, error } = await supabase
            .from('generated_budgets')
            .select('*')
            .eq('id', budgetId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching generated budget:', error);
            throw error;
        }

        return data;
    },

    /**
     * Obtiene presupuesto generado por proyecto
     */
    async getGeneratedBudgetByProject(
        projectId: string
    ): Promise<GeneratedBudget | null> {
        const { data, error } = await supabase
            .from('generated_budgets')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching budget by project:', error);
            throw error;
        }

        return data;
    },

    // ==================== HELPERS ====================

    /**
     * Calcula totales del presupuesto
     */
    calculateBudgetTotals(
        items: BudgetLineItem[],
        markupPercentage: number,
        vatPercentage: number
    ): BudgetTotals {
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const markup_amount = subtotal * (markupPercentage / 100);
        const base = subtotal + markup_amount;
        const vat_amount = base * (vatPercentage / 100);
        const total = base + vat_amount;

        return {
            subtotal,
            markup_percentage: markupPercentage,
            markup_amount,
            vat_percentage: vatPercentage,
            vat_amount,
            total
        };
    }
};
