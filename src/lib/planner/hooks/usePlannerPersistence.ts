import { useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { PlanService } from '../../../services/plan.service';
import type { DrawingData } from '../../../types/planner';

/**
 * Hook para gestionar la persistencia del Taller CAD
 * 
 * Maneja carga y guardado de proyectos en Supabase:
 * - Solo soporta formato nuevo (dual-mode)
 * - Validación básica de estructura
 * - Manejo de errores robusto
 * - Optimizado para nuevos proyectos
 */

interface PersistenceConfig {
    projectId: string | undefined;
    userId: string | undefined;
    modeStore: React.MutableRefObject<{
        floorPlan: any;
        singleLine: any;
    }>;
    canvasState: {
        setSymbols: (symbols: any[]) => void;
        setWalls: (walls: any[]) => void;
        setPipes: (pipes: any[]) => void;
        setAuxLines: (auxLines: any[]) => void;
        setPixelsPerMeter: (ppm: number) => void;
        setFloors: (floors: any[]) => void;
        getState: () => any;
    };
    backgroundState?: {
        setBackgroundImage?: (img: HTMLImageElement | null) => void;
        setBackgroundBase64?: (b64: string | null) => void;
        setBackgroundProps?: (props: any) => void;
        backgroundBase64?: string | null;
        backgroundProps?: any;
    };
    calculationData?: any;
    onCalculationDataLoaded?: (data: any) => void;
}

export const usePlannerPersistence = (config: PersistenceConfig) => {
    const {
        projectId,
        userId,
        modeStore,
        canvasState,
        backgroundState,
        calculationData,
        onCalculationDataLoaded
    } = config;


    /**
     * Carga el proyecto desde Supabase (solo formato nuevo)
     */
    const loadProject = useCallback(async () => {
        // No cargar si es draft o no hay ID
        if (!projectId || projectId === 'draft') {
            console.log('📄 Proyecto draft - Canvas vacío');
            return;
        }

        try {
            // Cargar dibujo desde PlanService
            const drawingData = await PlanService.loadPlan(projectId);

            if (drawingData && Object.keys(drawingData).length > 0) {
                // Validar estructura solo si hay datos
                if (drawingData.floorPlan && drawingData.singleLine) {
                    // Guardar en modeStore
                    modeStore.current.floorPlan = drawingData.floorPlan;
                    modeStore.current.singleLine = drawingData.singleLine;

                    // Cargar en canvas (modo floorPlan por defecto)
                    const initialData = drawingData.floorPlan;
                    if (initialData.floors) {
                        canvasState.setFloors(initialData.floors);
                    } else {
                        // Compatibilidad con formato viejo (si existiera, aunque el hook dice que no)
                        console.warn('⚠️ No se encontraron floors en floorPlan, usando fallback');
                    }
                    canvasState.setPixelsPerMeter(initialData.pixelsPerMeter || 50);

                    // Restaurar imagen de fondo (si existe)
                    if (drawingData.backgroundBase64 && backgroundState) {
                        const img = new Image();
                        img.src = drawingData.backgroundBase64;
                        img.onload = () => {
                            backgroundState.setBackgroundImage?.(img);
                        };
                        img.onerror = () => {
                            console.error('❌ Error cargando imagen de fondo');
                        };

                        backgroundState.setBackgroundBase64?.(drawingData.backgroundBase64);
                        if (drawingData.backgroundProps) {
                            backgroundState.setBackgroundProps?.(drawingData.backgroundProps);
                        }
                    }

                    console.log('✅ Dibujo cargado exitosamente');
                } else {
                    console.warn('⚠️ drawing_data tiene formato incompleto, ignorando');
                }
            } else {
                console.log('📧 Proyecto sin dibujos - Canvas vacío (proyecto nuevo desde Wizard)');
            }

            // 2. Cargar datos de cálculo (si no vienen de sessionStorage)
            console.log('🔍 Buscando calculation_data...');
            const storedCalc = sessionStorage.getItem('oveCalculationData');
            console.log('📦 sessionStorage.oveCalculationData:', storedCalc ? 'ENCONTRADO' : 'NO ENCONTRADO');

            if (storedCalc) {
                try {
                    const parsed = JSON.parse(storedCalc);
                    console.log('✅ Datos parseados:', parsed);
                    onCalculationDataLoaded?.(parsed);
                    console.log('✅ Cálculos cargados desde sessionStorage');
                } catch (error) {
                    console.error('❌ Error parseando oveCalculationData:', error);
                }
            } else {
                // Cargar desde BD
                console.log('🔍 Intentando cargar desde Supabase...');
                const { data: projectData, error } = await (supabase
                    .from('projects' as any)
                    .select('calculation_data')
                    .eq('id', projectId)
                    .single() as any);

                console.log('📊 Respuesta de Supabase:', { projectData, error });

                if (!error && projectData?.calculation_data) {
                    console.log('✅ calculation_data encontrado en BD:', projectData.calculation_data);
                    onCalculationDataLoaded?.(projectData.calculation_data);
                    console.log('✅ Cálculos cargados desde BD');
                } else {
                    console.warn('⚠️ No se encontró calculation_data en BD');
                }
            }

        } catch (error) {
            console.error('❌ Error cargando proyecto:', error);
        }
    }, [
        projectId,
        modeStore,
        canvasState,
        backgroundState,
        onCalculationDataLoaded
    ]);

    /**
     * Guarda el proyecto en Supabase
     */
    const saveProject = useCallback(async (activeMode: 'floorPlan' | 'singleLine') => {
        if (!userId) {
            alert('⚠️ Debes iniciar sesión para guardar');
            return false;
        }

        if (!calculationData) {
            alert('⚠️ No hay datos de cálculo. Completa primero el wizard.');
            return false;
        }

        try {
            // 1. Actualizar modeStore con estado actual
            modeStore.current[activeMode] = canvasState.getState();

            // 2. Preparar datos de dibujo
            const drawingData: DrawingData = {
                floorPlan: modeStore.current.floorPlan,
                singleLine: modeStore.current.singleLine,
                backgroundBase64: backgroundState?.backgroundBase64 || null,
                backgroundProps: backgroundState?.backgroundProps
            };

            // 3. Guardar según si es nuevo o existente
            if (projectId && projectId !== 'draft') {
                // Actualizar proyecto existente
                await PlanService.savePlan(projectId, drawingData);
                alert('✅ Proyecto actualizado correctamente');
                console.log('✅ Proyecto actualizado:', projectId);
                return true;
            } else {
                // Crear nuevo proyecto
                const projectData = {
                    user_id: userId,
                    client_name: calculationData.config.clientName,
                    surface_area: calculationData.config.surfaceArea,
                    property_type: (calculationData.config.destination || 'vivienda').toLowerCase(),
                    electrification_grade: calculationData.calculation.grade,
                    project_type: calculationData.config.workType === 'certification_only' ? 'certificacion' : 'presupuesto',
                    voltage_type: calculationData.config.voltage || '220V',
                    client_cuit: calculationData.config.ownerDetail?.dniCuit || null,
                    client_address: calculationData.config.ownerDetail?.address || null,
                    client_city: calculationData.config.ownerDetail?.city || null,
                    client_catastro: calculationData.config.ownerDetail?.catastro || null,
                    drawing_data: drawingData,
                    calculation_data: {
                        config: calculationData.config,
                        environments: calculationData.environments,
                        calculation: calculationData.calculation
                    }
                };

                const { data, error } = await (supabase
                    .from('projects' as any)
                    .insert([projectData as any] as any)
                    .select()
                    .single() as any);

                if (error) throw error;

                alert('✅ Proyecto guardado correctamente');
                console.log('✅ Nuevo proyecto creado:', data.id);

                // Actualizar URL y sessionStorage
                if (data?.id) {
                    sessionStorage.setItem('oveCurrentProjectId', data.id);
                    return data.id; // Retornar nuevo ID para que el componente actualice la URL
                }

                return true;
            }
        } catch (error: any) {
            console.error('❌ Error guardando proyecto:', error);
            alert(`❌ Error al guardar: ${error.message}`);
            return false;
        }
    }, [
        userId,
        projectId,
        calculationData,
        modeStore,
        canvasState,
        backgroundState
    ]);

    /**
     * Efecto: Cargar proyecto al montar o cambiar projectId
     */
    useEffect(() => {
        // Limpieza inmediata antes de cargar
        console.log('🔄 Cambiando a proyecto:', projectId);

        // Reset del canvas
        canvasState.setSymbols([]);
        canvasState.setWalls([]);
        canvasState.setPipes([]);
        canvasState.setAuxLines([]);
        canvasState.setPixelsPerMeter(50);

        // Reset de fondo
        if (backgroundState) {
            backgroundState.setBackgroundImage?.(null);
            backgroundState.setBackgroundBase64?.(null);
            backgroundState.setBackgroundProps?.({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
        }

        console.log('✅ Estado limpiado - Cargando proyecto...');

        // Cargar proyecto
        loadProject();
    }, [projectId]); // Solo depende de projectId

    return {
        loadProject,
        saveProject
    };
};
