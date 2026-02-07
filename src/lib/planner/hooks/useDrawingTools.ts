import { useState, useRef, useCallback } from 'react';
import type { SymbolItem, Wall, Pipe, AuxLine, Layer } from '../../../types/planner';
import { createDimension } from '../../../types/dimensions';
import type { Tool } from '../../../components/planner/PlannerToolbar';
import { getLayerById } from './useCircuitLayers'; // 🆕 Helper para obtener layer

/**
 * Hook para gestionar las herramientas de dibujo del Taller CAD
 * 
 * Maneja la lógica de creación de elementos (símbolos, paredes, cañerías)
 * de forma genérica para soportar múltiples oficios (Electricidad, Gas, Plomería).
 */

interface DrawingToolsConfig {
    tool: Tool;
    currentCircuitColor: string;
    currentPipeType: 'straight' | 'curved';
    currentPipeDashMode: 'solid' | 'dashed'; // 🆕 Modo de trazo para pipes
    pixelsPerMeter: number;
    onCalibrationComplete?: (newPixelsPerMeter: number) => void;

    // 🆕 Circuit-based layers
    currentLayerId?: string; // ID de la capa activa
    circuitLayers?: Layer[]; // Todas las capas disponibles
    estadoObra?: 'nueva' | 'existente' | 'modificacion' | 'provisoria'; // 🆕 Para validaciones
}

export const useDrawingTools = (
    config: DrawingToolsConfig,
    canvasActions: {
        addSymbol: (symbol: SymbolItem) => void;
        addWall: (wall: Wall) => void;
        addPipe: (pipe: Pipe) => void;
        addAuxLine: (auxLine: AuxLine) => void;
        addDimension: (dimension: any) => void;
        selectShape: (id: string | null) => void;
        registerPipe?: (pipeId: string, dashMode: 'solid' | 'dashed') => void; // 🆕 Callback para marcar pipes
    }
) => {
    const { tool, currentCircuitColor, currentPipeType, currentPipeDashMode, pixelsPerMeter, onCalibrationComplete, currentLayerId, circuitLayers, estadoObra } = config;
    const { addSymbol, addWall, addPipe, addAuxLine, addDimension, selectShape, registerPipe } = canvasActions;

    /**
     * 🆕 Helper: Validar coherencia entre estadoObra y nature
     */
    const validateNatureCoherence = useCallback((nature: 'proyectado' | 'relevado' | undefined): boolean => {
        // En obra nueva, NO se pueden crear elementos relevados
        if (estadoObra === 'nueva' && nature === 'relevado') {
            alert('⚠️ Error de Coherencia\n\nNo se pueden crear elementos EXISTENTES (relevados) en un proyecto de Obra Nueva.\n\nCambiá a una capa de circuito proyectado o modificá el estado de obra en el Wizard.');
            return false;
        }
        return true;
    }, [estadoObra]);

    /**
     * 🆕 Helper: Obtener datos del circuito de la capa activa
     * Incluye color de la capa para herencia automática
     */
    const getActiveCircuitData = useCallback(() => {
        if (!currentLayerId || !circuitLayers) return { circuitId: undefined, nature: undefined, color: currentCircuitColor };

        const activeLayer = getLayerById(circuitLayers, currentLayerId);
        if (!activeLayer) return { circuitId: undefined, nature: undefined, color: currentCircuitColor };

        // Layer arquitectura no tiene circuito, pero sí color
        if (activeLayer.circuitId === null) return { circuitId: undefined, nature: undefined, color: activeLayer.color };

        // Layer de circuito: devolver circuitId, nature Y color del circuito
        return {
            circuitId: activeLayer.circuitId || undefined,
            nature: activeLayer.circuit?.nature || undefined,
            color: activeLayer.color // 🆕 Heredar color de la capa
        };
    }, [currentLayerId, circuitLayers, currentCircuitColor]);

    // Estados temporales de dibujo
    const isDrawing = useRef(false);
    const [currentWall, setCurrentWall] = useState<number[] | null>(null);
    const [currentAuxLine, setCurrentAuxLine] = useState<number[] | null>(null);
    const [pipeStartPoint, setPipeStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentPipePreview, setCurrentPipePreview] = useState<number[] | null>(null);
    const [calibrationLine, setCalibrationLine] = useState<number[] | null>(null);
    const [dimensionFirstPoint, setDimensionFirstPoint] = useState<{ x: number; y: number } | null>(null);
    const [dimensionPreview, setDimensionPreview] = useState<number[] | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // 🆕 Seguimiento para modo fantasma

    /**
     * Obtiene la posición del puntero transformada según el zoom/pan del stage
     */
    const getPointerPosition = useCallback((stage: any) => {
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        return transform.point(stage.getPointerPosition());
    }, []);

    /**
     * Maneja el inicio del dibujo (mouseDown/touchStart)
     */
    const handleMouseDown = useCallback((e: any) => {
        // Ignorar click derecho o Ctrl+click
        if (e.evt.button === 2 || e.evt.ctrlKey) return;

        const stage = e.target.getStage();
        const pos = getPointerPosition(stage);

        // Determinar si se hizo click en el fondo (donde no hay elementos del taller)
        const targetName = e.target.name();
        const isBackgroundClick = e.target === stage ||
            targetName === 'paper-bg' ||
            targetName === 'paper-shadow' ||
            e.target.id() === 'blueprint-bg';

        // Modo selección: solo deseleccionar si click en fondo
        if (tool === 'select') {
            if (isBackgroundClick) {
                console.log('🟦 Click en fondo detectado - Deseleccionando');
                selectShape(null);
            }
            return;
        }

        // Modo calibración
        if (tool === 'calibrate') {
            isDrawing.current = true;
            setCalibrationLine([pos.x, pos.y, pos.x, pos.y]);
            return;
        }

        // Modo texto: prompt inmediato
        if (tool === 'text') {
            e.evt.preventDefault();
            e.cancelBubble = true;
            const textValue = window.prompt("Ingrese texto:");
            if (textValue) {
                const { circuitId, nature } = getActiveCircuitData();

                // 🆕 VALIDAR COHERENCIA
                if (!validateNatureCoherence(nature as any)) return;

                addSymbol({
                    id: `text-${Date.now()}`,
                    type: 'text',
                    x: pos.x,
                    y: pos.y,
                    rotation: 0,
                    label: textValue,
                    color: '#000000',
                    fontSize: 12,
                    circuitId, // 🆕 Heredar circuito
                    nature, // 🆕 Heredar naturaleza
                });
            }
            return;
        }

        // Modo tabla: inserción inmediata
        if (tool === 'table') {
            const { circuitId, nature } = getActiveCircuitData();

            // 🆕 VALIDAR COHERENCIA
            if (!validateNatureCoherence(nature as any)) return;

            addSymbol({
                id: `table-${Date.now()}`,
                type: 'table',
                x: pos.x,
                y: pos.y,
                rotation: 0,
                label: 'Tabla',
                circuitId, // 🆕 Heredar circuito
                nature, // 🆕 Heredar naturaleza
            });
            return;
        }

        // Modo pared: iniciar dibujo de línea
        if (tool === 'wall') {
            isDrawing.current = true;
            setCurrentWall([pos.x, pos.y, pos.x, pos.y]);
            selectShape(null);
            return;
        }

        // Modo línea auxiliar: iniciar dibujo
        if (tool === 'aux_line') {
            isDrawing.current = true;
            setCurrentAuxLine([pos.x, pos.y, pos.x, pos.y]);
            selectShape(null);
            return;
        }

        // Modo cañería: sistema de dos clics
        if (tool === 'pipe') {
            if (!pipeStartPoint) {
                // Primer clic: establecer punto inicial
                setPipeStartPoint({ x: pos.x, y: pos.y });
                setCurrentPipePreview([pos.x, pos.y, pos.x, pos.y]);
            } else {
                // Segundo clic: crear cañería
                const { circuitId, nature, color } = getActiveCircuitData(); // 🆕 Heredar color

                // 🆕 VALIDAR COHERENCIA
                if (!validateNatureCoherence(nature as any)) {
                    setPipeStartPoint(null);
                    setCurrentPipePreview(null);
                    return;
                }

                const newPipeId = `pipe-${Date.now()}`;
                addPipe({
                    id: newPipeId,
                    points: [pipeStartPoint.x, pipeStartPoint.y, pos.x, pos.y],
                    color, // 🆕 Usar color de la capa
                    type: currentPipeType,
                    controlPoint: currentPipeType === 'curved' ? {
                        x: (pipeStartPoint.x + pos.x) / 2,
                        y: (pipeStartPoint.y + pos.y) / 2 + 30
                    } : undefined,
                    circuitId, // 🆕 Heredar circuito
                    nature, // 🆕 Heredar naturaleza
                });
                // 🆕 Registrar si se dibujó en modo punteado
                registerPipe?.(newPipeId, currentPipeDashMode);
                setPipeStartPoint(null);
                setCurrentPipePreview(null);
            }
            selectShape(null);
            return;
        }

        // Modo cota: sistema de dos clics
        if (tool === 'dimension') {
            if (!dimensionFirstPoint) {
                // PRIMER CLIC: Iniciar punto
                setDimensionFirstPoint({ x: pos.x, y: pos.y });
                setDimensionPreview([pos.x, pos.y, pos.x, pos.y]);
            } else {
                // SEGUNDO CLIC: Finalizar y crear
                // 🆕 Limpiar estados PRIMERO para evitar re-entrada por clics rápidos
                const startP = dimensionFirstPoint;
                const endP = { x: pos.x, y: pos.y };
                setDimensionFirstPoint(null);
                setDimensionPreview(null);

                const newDim = createDimension(
                    startP,
                    endP,
                    pixelsPerMeter,
                    currentLayerId || 'layer-0'
                );

                console.log(`📏 Cota finalizada: ${newDim.distanceMeters.toFixed(2)}m (ppm: ${pixelsPerMeter})`);
                addDimension(newDim);
            }
            selectShape(null); // Deseleccionar cualquier cosa previa
            return;
        }

        // Modo Geometría (Tap-to-place)
        const geoms = ['rect', 'circle', 'triangle', 'line', 'arrow'];
        if (geoms.includes(tool)) {
            const { circuitId, nature, color } = getActiveCircuitData();
            if (!validateNatureCoherence(nature as any)) return;

            addSymbol({
                id: `${tool}-${Date.now()}`,
                type: tool as any,
                x: (tool === 'line' || tool === 'arrow') ? 0 : pos.x,
                y: (tool === 'line' || tool === 'arrow') ? 0 : pos.y,
                points: (tool === 'line' || tool === 'arrow')
                    ? [pos.x - 40, pos.y, pos.x + 40, pos.y]
                    : undefined,
                rotation: 0,
                color,
                circuitId,
                nature,
                isSolid: false, // Default: Contorno
                lineType: 'solid'
            });
            selectShape(null);
            return;
        }

        // CUALQUIER OTRA HERRAMIENTA: insertar símbolo genérico del catálogo
        // 🛡️ EXCLUSIÓN: No crear símbolos para herramientas que tienen su propia lógica (aberturas y cotas)
        const excludedTools: Tool[] = ['select', 'wall', 'pipe', 'aux_line', 'calibrate', 'text', 'table', 'door', 'window', 'passage', 'dimension'];

        if (isBackgroundClick && !excludedTools.includes(tool)) {
            const { circuitId, nature, color } = getActiveCircuitData(); // 🆕 Heredar color

            // 🆕 VALIDAR COHERENCIA
            if (!validateNatureCoherence(nature as any)) return;

            addSymbol({
                id: `${tool}-${Date.now()}`,
                type: tool as any, // El tipo será validado por el catálogo
                x: pos.x,
                y: pos.y,
                rotation: 0,
                label: '',
                color, // 🆕 Usar color de la capa
                circuitId, // 🆕 Heredar circuito
                nature, // 🆕 Heredar naturaleza
            });
        }
    }, [
        tool,
        currentCircuitColor,
        currentPipeType,
        currentPipeDashMode, // 🆕 Dependency
        pipeStartPoint,
        getPointerPosition,
        addSymbol,
        addWall,
        addPipe,
        addAuxLine,
        addAuxLine,
        selectShape,
        registerPipe,
        getActiveCircuitData,
        dimensionFirstPoint, // 🆕 Crucial para el segundo clic
        pixelsPerMeter,      // 🆕 Para escala correcta
        currentLayerId,      // 🆕 Para persistencia en capa
        addDimension         // 🆕 Para cerrar la cota
    ]);

    /**
     * Maneja el movimiento durante el dibujo (mouseMove/touchMove)
     */
    const handleMouseMove = useCallback((e: any) => {
        if (!isDrawing.current && !pipeStartPoint && !dimensionFirstPoint) return;

        const stage = e.target.getStage();
        const pos = getPointerPosition(stage);

        // Actualizar preview de pared
        if (isDrawing.current && tool === 'wall' && currentWall) {
            setCurrentWall([currentWall[0], currentWall[1], pos.x, pos.y]);
        }

        // Actualizar preview de línea auxiliar
        if (isDrawing.current && tool === 'aux_line' && currentAuxLine) {
            setCurrentAuxLine([currentAuxLine[0], currentAuxLine[1], pos.x, pos.y]);
        }

        // Actualizar preview de calibración
        if (isDrawing.current && tool === 'calibrate' && calibrationLine) {
            setCalibrationLine([calibrationLine[0], calibrationLine[1], pos.x, pos.y]);
        }

        // Actualizar preview de cañería
        if (tool === 'pipe' && pipeStartPoint) {
            setCurrentPipePreview([pipeStartPoint.x, pipeStartPoint.y, pos.x, pos.y]);
        }

        // Actualizar preview de cota
        if (tool === 'dimension' && dimensionFirstPoint) {
            setDimensionPreview([dimensionFirstPoint.x, dimensionFirstPoint.y, pos.x, pos.y]);
        }

        // Siempre actualizar mousePos para modo fantasma si hay una herramienta geométrica activa
        const geoms = ['rect', 'circle', 'triangle', 'line', 'arrow'];
        if (geoms.includes(tool)) {
            setMousePos({ x: pos.x, y: pos.y });
        }
    }, [
        tool,
        currentWall,
        currentAuxLine,
        calibrationLine,
        pipeStartPoint,
        dimensionFirstPoint,
        getPointerPosition
    ]);

    /**
     * Maneja el fin del dibujo (mouseUp/touchEnd)
     */
    const handleMouseUp = useCallback(() => {
        if (!isDrawing.current) return;

        // Finalizar pared
        if (tool === 'wall' && currentWall) {
            const dx = Math.abs(currentWall[2] - currentWall[0]);
            const dy = Math.abs(currentWall[3] - currentWall[1]);

            // Solo crear si la línea tiene longitud mínima
            if (dx > 5 || dy > 5) {
                addWall({
                    id: `wall-${Date.now()}`,
                    points: currentWall
                });
            }
            setCurrentWall(null);
        }

        // Finalizar línea auxiliar
        if (tool === 'aux_line' && currentAuxLine) {
            const dx = Math.abs(currentAuxLine[2] - currentAuxLine[0]);
            const dy = Math.abs(currentAuxLine[3] - currentAuxLine[1]);

            if (dx > 5 || dy > 5) {
                addAuxLine({
                    id: `aux-${Date.now()}`,
                    points: currentAuxLine
                });
            }
            setCurrentAuxLine(null);
        }

        // Finalizar calibración
        if (tool === 'calibrate' && calibrationLine) {
            const dx = calibrationLine[2] - calibrationLine[0];
            const dy = calibrationLine[3] - calibrationLine[1];
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);

            if (pixelDistance > 10) {
                // Pedir metros reales al usuario
                const metersInput = window.prompt(
                    `Has dibujado una línea de ${pixelDistance.toFixed(0)} píxeles.\n\n¿Cuántos METROS REALES representa esta línea?`,
                    '1.0'
                );

                if (metersInput) {
                    const meters = parseFloat(metersInput);
                    if (!isNaN(meters) && meters > 0) {
                        const newPixelsPerMeter = pixelDistance / meters;
                        console.log(`✅ Calibración: ${pixelDistance.toFixed(0)}px / ${meters}m = ${newPixelsPerMeter.toFixed(2)} px/m`);

                        // Notificar al componente padre
                        if (onCalibrationComplete) {
                            onCalibrationComplete(newPixelsPerMeter);
                        }

                        alert(`Escala calibrada: ${newPixelsPerMeter.toFixed(2)} píxeles por metro`);
                    } else {
                        alert('Valor inválido. Calibración cancelada.');
                    }
                }
            }
            setCalibrationLine(null);
        }

        isDrawing.current = false;
    }, [tool, currentWall, currentAuxLine, calibrationLine, addWall, addAuxLine, pixelsPerMeter, currentLayerId, addDimension, dimensionFirstPoint]);

    /**
     * Cancela el dibujo actual (Escape)
     */
    const cancelDrawing = useCallback(() => {
        isDrawing.current = false;
        setCurrentWall(null);
        setCurrentAuxLine(null);
        setPipeStartPoint(null);
        setCurrentPipePreview(null);
        setCalibrationLine(null);
        setDimensionFirstPoint(null);
        setDimensionPreview(null);
    }, []);

    /**
     * Obtiene el estilo del cursor según la herramienta activa
     */
    const getCursorStyle = useCallback(() => {
        if (tool === 'select') return 'default';
        if (['wall', 'pipe', 'aux_line', 'calibrate', 'dimension'].includes(tool)) return 'crosshair';
        return 'copy';
    }, [tool]);

    return {
        // Handlers de eventos
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,

        // Estados temporales (para renderizado de previews)
        currentWall,
        currentAuxLine,
        currentPipePreview,
        calibrationLine,
        pipeStartPoint,
        dimensionFirstPoint,
        dimensionPreview,
        mousePos, // 🆕 Exponer posición para renderizado fantasma

        // Utilidades
        cancelDrawing,
        getCursorStyle,
        getPointerPosition
    };
};
