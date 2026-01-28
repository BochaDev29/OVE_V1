import { supabase } from '../lib/supabase';

export const PlanService = {
    // Guardar plano (UPDATE projects SET drawing_data = ...)
    async savePlan(projectId: string, elements: any) {
        // elements es el objeto completo { symbols, walls, pipes, ... }
        const { data, error } = await supabase
            .from('projects' as any)
            .update({
                drawing_data: elements,
                // updated_at: new Date().toISOString() // Opcional, si la columna existe
            })
            .eq('id', projectId)
            .select();

        if (error) {
            console.error('Error saving plan:', error);
            throw error;
        }
        return data;
    },

    // Cargar plano
    async loadPlan(projectId: string) {
        const { data, error } = await supabase
            .from('projects' as any)
            .select('drawing_data')
            .eq('id', projectId)
            .single();

        if (error) {
            console.error('Error loading plan:', error);
            throw error;
        }

        // Si es null o no tiene datos, devolvemos objeto vacío o lo que espere el canvas
        return data?.drawing_data || {};
    }
};
