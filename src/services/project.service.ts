import { supabase } from '../lib/supabase';
import { ProjectConfig, ProjectCalculation, EnvironmentCalculation, getPropertyDestinations } from '../lib/electrical-rules';

// Definición básica del Proyecto
export interface ProjectData {
    config: ProjectConfig;
    environments: EnvironmentCalculation[];
    calculation: ProjectCalculation;
    existenteData?: any; // Datos de Res. 54/2018 (checklist, fotos, etc.)
}

// Default Config (Valores por defecto)
const defaultProjectConfig: ProjectConfig = {
    clientName: '',
    destination: 'vivienda',
    voltage: '220V',
    projectType: 'nueva',
    surfaceArea: 0,
    panels: [], // AGREGADO: Campo requerido
    workType: 'budget_certification',
    ownerDetail: {
        dniCuit: '',
        street: '',
        address: '',
        number: '',
        floor: '',
        apartment: '',
        tower: '',
        city: '',
        province: 'Córdoba',
        catastro: ''
    },
    certificationScope: 'complete',
    feederDistance: 0,
    installationType: 'Embutido',
    supplyOrigin: 'acometida',
    materialPreferences: {
        brandBreakers: '',
        brandCables: '',
        pipeType: ''
    }
};

export const ProjectService = {

    async createProject(userId: string, projectData: ProjectData) {
        // Al crear, guardamos TODO el paquete en calculation_data
        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: userId,
                name: projectData.config.clientName || 'Proyecto Sin Nombre',
                calculation_data: projectData,
                drawing_data: {},
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateProject(projectId: string, project: ProjectData) {
        const { data, error } = await (supabase
            .from('projects')
            .update({
                name: project.config.clientName || 'Proyecto Sin Nombre',
                calculation_data: project,
            } as any)
            .eq('id', projectId)
            .select()
            .single() as any);

        if (error) throw error;
        return data;
    },

    async saveDocumentation(projectId: string, docData: any) {
        const { data, error } = await (supabase
            .from('projects')
            .update({
                documentation_data: docData
            } as any)
            .eq('id', projectId)
            .select()
            .single() as any);

        if (error) throw error;
        return data;
    },

    async getProjectById(projectId: string) {
        const { data, error } = await (supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single() as any);

        if (error) throw error;

        // CRÍTICO: Mapeo explícito del JSONB al estado de la app
        // 'data.calculation_data' contiene { config, environments, calculation }
        const fullSavedData = (data as any).calculation_data || {};
        const configFromDB = fullSavedData.config || {};

        // Reconstruimos el objeto final asegurando que 'config' tenga todos sus campos
        return {
            id: data.id,
            name: data.name,

            // Mapeamos al formato que espera el Wizard (wizardData)
            wizardData: {
                config: {
                    ...defaultProjectConfig, // Valores por defecto
                    ...configFromDB,         // Sobreescribir con lo guardado
                    // Deep merge para objetos anidados críticos
                    ownerDetail: {
                        ...defaultProjectConfig.ownerDetail,
                        ...(configFromDB.ownerDetail || {})
                    },
                    materialPreferences: {
                        ...defaultProjectConfig.materialPreferences,
                        ...(configFromDB.materialPreferences || {})
                    },
                    // CRÍTICO: Preservar arrays que vienen de BD
                    panels: configFromDB.panels || defaultProjectConfig.panels,
                    circuitInventory: configFromDB.circuitInventory || undefined
                },
                environments: fullSavedData.environments || [],
                calculation: fullSavedData.calculation || {},
                existenteData: fullSavedData.existenteData || null // RECUPERAR existenteData
            },
            drawing_data: data.drawing_data, // Also return drawing data
            documentation_data: data.documentation_data // Return doc data
        };
    },

    async listProjects() {
        const { data, error } = await (supabase
            .from('projects')
            .select('id, name, created_at, calculation_data')
            .order('created_at', { ascending: false }) as any);

        if (error) throw error;

        return (data as any[]).map(p => {
            const raw = p.calculation_data || {};
            const conf = raw.config || {};

            // Obtener nombre del cliente
            const clientName = conf.clientName || p.name || 'Sin nombre';

            // Obtener destino específico con nombre legible
            let propertyType = 'Vivienda';
            if (conf.destination) {
                const destinations = getPropertyDestinations();
                const found = destinations.find(d => d.codigo_destino === conf.destination);
                propertyType = found ? found.nombre_destino : conf.destination;
            }

            // Determinar tipo de proyecto (Flash/Completo/Reglamentado)
            let projectType = '💰 Presupuesto';

            // 1. Usar creationMode si existe (Fuente de verdad)
            if (conf.creationMode === 'regulated') {
                projectType = '📋 Reglamentado';
            } else if (conf.creationMode === 'complete') {
                projectType = '🏗️ Completo';
            } else if (conf.creationMode === 'flash') {
                projectType = '⚡ Flash';
            } else {
                // 2. Fallback Heurístico (Legacy)
                // Detectar si es Flash
                const isFlash = !conf.estadoObra || !conf.voltage || (conf.surfaceArea && conf.surfaceArea < 100);

                if (conf.estadoObra === 'existente') {
                    projectType = '📋 Reglamentado';
                } else if (isFlash) {
                    projectType = '⚡ Flash';
                } else {
                    projectType = '🏗️ Completo';
                }
            }

            return {
                id: p.id,
                name: p.name,
                client_name: clientName,
                created_at: p.created_at,
                surface_area: conf.surfaceArea || 0,
                property_type: propertyType,
                project_type: projectType,
                status: 'borrador'
            };
        });
    },

    async deleteProject(projectId: string) {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (error) throw error;
    }
};
