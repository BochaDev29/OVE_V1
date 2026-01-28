import { useState, useRef, useCallback } from 'react';
import type { SymbolItem, Wall, Pipe, AuxLine } from '../../../types/planner';
import type { Tool } from '../../../components/planner/PlannerToolbar';

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
    pixelsPerMeter: number;
    stageRef: React.RefObject<any>;
    onCalibrationComplete?: (newPixelsPerMeter: number) => void;
}

export const useDrawingTools = (
    config: DrawingToolsConfig,
    canvasActions: {
        addSymbol: (symbol: SymbolItem) => void;
        addWall: (wall: Wall) => void;
        addPipe: (pipe: Pipe) => void;
        addAuxLine: (auxLine: AuxLine) => void;
        selectShape: (id: string | null) => void;
    }
) => {
    const { tool, currentCircuitColor, currentPipeType, pixelsPerMeter, stageRef, onCalibrationComplete } = config;
    const { addSymbol, addWall, addPipe, addAuxLine, selectShape } = canvasActions;

    // Estados temporales de dibujo
    const isDrawing = useRef(false);
    const [currentWall, setCurrentWall] = useState<number[] | null>(null);
    const [currentAuxLine, setCurrentAuxLine] = useState<number[] | null>(null);
    const [pipeStartPoint, setPipeStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentPipePreview, setCurrentPipePreview] = useState<number[] | null>(null);
    const [calibrationLine, setCalibrationLine] = useState<number[] | null>(null);

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
        const isBackgroundClick = e.target === stage;

        // Modo selección: solo deseleccionar si click en fondo
        if (tool === 'select') {
            if (isBackgroundClick) selectShape(null);
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
                addSymbol({
                    id: `text-${Date.now()}`,
                    type: 'text',
                    x: pos.x,
                    y: pos.y,
                    rotation: 0,
                    label: textValue,
                    color: '#000000',
                    fontSize: 12
                });
            }
            return;
        }

        // Modo tabla: inserción inmediata
        if (tool === 'table') {
            addSymbol({
                id: `table-${Date.now()}`,
                type: 'table',
                x: pos.x,
                y: pos.y,
                rotation: 0,
                label: 'Tabla'
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
                addPipe({
                    id: `pipe-${Date.now()}`,
                    points: [pipeStartPoint.x, pipeStartPoint.y, pos.x, pos.y],
                    color: currentCircuitColor,
                    type: currentPipeType
                });
                setPipeStartPoint(null);
                setCurrentPipePreview(null);
            }
            selectShape(null);
            return;
        }

        // Cualquier otra herramienta: insertar símbolo genérico
        if (isBackgroundClick && tool !== 'select') {
            addSymbol({
                id: `${tool}-${Date.now()}`,
                type: tool as any, // El tipo será validado por el catálogo
                x: pos.x,
                y: pos.y,
                rotation: 0,
                label: ''
            });
        }
    }, [
        tool,
        currentCircuitColor,
        currentPipeType,
        pipeStartPoint,
        getPointerPosition,
        addSymbol,
        addWall,
        addPipe,
        addAuxLine,
        selectShape
    ]);

    /**
     * Maneja el movimiento durante el dibujo (mouseMove/touchMove)
     */
    const handleMouseMove = useCallback((e: any) => {
        if (!isDrawing.current && !pipeStartPoint) return;

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
    }, [
        tool,
        currentWall,
        currentAuxLine,
        calibrationLine,
        pipeStartPoint,
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
    }, [tool, currentWall, currentAuxLine, calibrationLine, addWall, addAuxLine]);

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
    }, []);

    /**
     * Obtiene el estilo del cursor según la herramienta activa
     */
    const getCursorStyle = useCallback(() => {
        if (tool === 'select') return 'default';
        if (['wall', 'pipe', 'aux_line', 'calibrate'].includes(tool)) return 'crosshair';
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

        // Utilidades
        cancelDrawing,
        getCursorStyle,
        getPointerPosition
    };
};
