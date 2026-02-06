import { useState, useCallback, useMemo } from 'react';
import type { SymbolItem, Wall, Pipe, AuxLine } from '../../../types/planner';
import type { Floor, Layer } from '../../../types/floors';
import { createFloor, PAPER_FORMATS } from '../../../types/floors';

/**
 * Hook para gestionar el estado del canvas del Taller CAD
 * 
 * NUEVA ARQUITECTURA:
 * - Múltiples plantas (floors)
 * - Sistema de capas por circuito (layers)
 * - Elementos organizados por planta y capa
 */
export const useCanvasState = () => {
    // Estados principales - NUEVA ESTRUCTURA
    const [floors, setFloors] = useState<Floor[]>([
        createFloor('Planta Baja', 'A4-landscape')
    ]);
    const [currentFloorId, setCurrentFloorId] = useState<string>(floors[0]?.id || '');
    const [currentLayerId, setCurrentLayerId] = useState<string>('layer-0');
    const [pixelsPerMeter, setPixelsPerMeter] = useState(50);
    const [selectedId, selectShape] = useState<string | null>(null);

    // Helpers para obtener planta y capa actual
    const getCurrentFloor = useCallback(() => {
        return floors.find(f => f.id === currentFloorId);
    }, [floors, currentFloorId]);

    const getCurrentLayer = useCallback(() => {
        const floor = getCurrentFloor();
        return floor?.layers.find(l => l.id === currentLayerId);
    }, [getCurrentFloor, currentLayerId]);

    // ========== GESTIÓN DE PLANTAS ==========

    const addFloor = useCallback((name: string, formatKey: string = 'A4-landscape', initialLayers?: Layer[]) => {
        const newFloor = createFloor(name, formatKey, initialLayers);
        setFloors(prev => [...prev, newFloor]);
        setCurrentFloorId(newFloor.id);
        return newFloor.id;
    }, []);

    const removeFloor = useCallback((floorId: string) => {
        setFloors(prev => prev.filter(f => f.id !== floorId));
        // Si se elimina la planta actual, cambiar a la primera
        if (floorId === currentFloorId && floors.length > 1) {
            setCurrentFloorId(floors[0].id === floorId ? floors[1].id : floors[0].id);
        }
    }, [currentFloorId, floors]);

    const updateFloorFormat = useCallback((floorId: string, formatKey: string) => {
        setFloors(prev => prev.map(f =>
            f.id === floorId
                ? { ...f, format: PAPER_FORMATS[formatKey] }
                : f
        ));
    }, []);

    const updateFloorName = useCallback((floorId: string, name: string) => {
        setFloors(prev => prev.map(f =>
            f.id === floorId
                ? { ...f, name }
                : f
        ));
    }, []);

    // ========== GESTIÓN DE CAPAS ==========

    const toggleLayerVisibility = useCallback((layerId: string) => {
        setFloors(prev => prev.map(f => ({
            ...f,
            layers: f.layers.map(l =>
                l.id === layerId ? { ...l, visible: !l.visible } : l
            )
        })));
    }, []);

    const toggleLayerLock = useCallback((layerId: string) => {
        setFloors(prev => prev.map(f => ({
            ...f,
            layers: f.layers.map(l =>
                l.id === layerId ? { ...l, locked: !l.locked } : l
            )
        })));
    }, []);

    const updateLayerColor = useCallback((layerId: string, color: string) => {
        setFloors(prev => prev.map(f => ({
            ...f,
            layers: f.layers.map(l =>
                l.id === layerId ? { ...l, color } : l
            ),
            // Actualizar color de elementos en esa capa
            elements: {
                ...f.elements,
                symbols: f.elements.symbols.map(s =>
                    (s as any).layerId === layerId ? { ...s, color } : s
                ),
                pipes: f.elements.pipes.map(p =>
                    (p as any).layerId === layerId ? { ...p, color } : p
                )
            }
        })));
    }, []);

    // ========== ACCIONES SOBRE ELEMENTOS ==========

    const addSymbol = useCallback((symbol: SymbolItem) => {
        const layer = getCurrentLayer();
        if (layer?.locked) {
            console.warn('⚠️ Capa bloqueada. No se puede agregar símbolo.');
            return;
        }

        const symbolWithLayer = {
            ...symbol,
            layerId: currentLayerId,
            color: layer?.color || symbol.color
        } as any;

        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, symbols: [...f.elements.symbols, symbolWithLayer] } }
                : f
        ));
    }, [currentFloorId, currentLayerId, getCurrentLayer]);

    const addWall = useCallback((wall: Wall) => {
        const layer = getCurrentLayer();
        if (layer?.locked) {
            console.warn('⚠️ Capa bloqueada. No se puede agregar pared.');
            return;
        }

        const wallWithLayer = {
            ...wall,
            layerId: currentLayerId
        } as any;

        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, walls: [...f.elements.walls, wallWithLayer] } }
                : f
        ));
    }, [currentFloorId, currentLayerId, getCurrentLayer]);

    const addPipe = useCallback((pipe: Pipe) => {
        const layer = getCurrentLayer();
        if (layer?.locked) {
            console.warn('⚠️ Capa bloqueada. No se puede agregar cañería.');
            return;
        }

        const pipeWithLayer = {
            ...pipe,
            layerId: currentLayerId,
            color: layer?.color || pipe.color
        } as any;

        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, pipes: [...f.elements.pipes, pipeWithLayer] } }
                : f
        ));
    }, [currentFloorId, currentLayerId, getCurrentLayer]);

    const addDimension = useCallback((dimension: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, dimensions: [...(f.elements.dimensions || []), dimension] } }
                : f
        ));
    }, [currentFloorId]);

    const addAuxLine = useCallback((auxLine: AuxLine) => {
        const layer = getCurrentLayer();
        if (layer?.locked) {
            console.warn('⚠️ Capa bloqueada. No se puede agregar línea auxiliar.');
            return;
        }

        const auxLineWithLayer = {
            ...auxLine,
            layerId: currentLayerId
        } as any;

        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, auxLines: [...f.elements.auxLines, auxLineWithLayer] } }
                : f
        ));
    }, [currentFloorId, currentLayerId, getCurrentLayer]);

    // ========== SETTERS DIRECTOS (para compatibilidad) ==========

    const setSymbols = useCallback((updater: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, symbols: typeof updater === 'function' ? updater(f.elements.symbols) : updater } }
                : f
        ));
    }, [currentFloorId]);

    const setWalls = useCallback((updater: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, walls: typeof updater === 'function' ? updater(f.elements.walls) : updater } }
                : f
        ));
    }, [currentFloorId]);

    const setPipes = useCallback((updater: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, pipes: typeof updater === 'function' ? updater(f.elements.pipes) : updater } }
                : f
        ));
    }, [currentFloorId]);

    const setAuxLines = useCallback((updater: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, auxLines: typeof updater === 'function' ? updater(f.elements.auxLines) : updater } }
                : f
        ));
    }, [currentFloorId]);

    const setDimensions = useCallback((updater: any) => {
        setFloors(prev => prev.map(f =>
            f.id === currentFloorId
                ? { ...f, elements: { ...f.elements, dimensions: typeof updater === 'function' ? updater(f.elements.dimensions || []) : updater } }
                : f
        ));
    }, [currentFloorId]);

    const setRoomGroups = useCallback((updater: any) => {
        setFloors(prev => {
            // Encontrar la planta actual en el momento de la actualización
            const currentFloor = prev.find(f => f.id === currentFloorId);
            if (!currentFloor) return prev;

            return prev.map(f =>
                f.id === currentFloorId
                    ? {
                        ...f,
                        elements: {
                            ...f.elements,
                            roomGroups: typeof updater === 'function'
                                ? updater(currentFloor.elements.roomGroups)
                                : updater
                        }
                    }
                    : f
            );
        });
    }, [currentFloorId]);

    // ========== GETTERS (para compatibilidad) ==========

    const currentFloor = useMemo(() => getCurrentFloor(), [floors, currentFloorId]);
    const symbols = useMemo(() => currentFloor?.elements.symbols || [], [currentFloor]);
    const walls = useMemo(() => currentFloor?.elements.walls || [], [currentFloor]);
    const pipes = useMemo(() => currentFloor?.elements.pipes || [], [currentFloor]);
    const auxLines = useMemo(() => currentFloor?.elements.auxLines || [], [currentFloor]);
    const dimensions = useMemo(() => currentFloor?.elements.dimensions || [], [currentFloor]);
    const roomGroups = useMemo(() => currentFloor?.elements.roomGroups || [], [currentFloor]);

    return {
        // Estado de plantas y capas
        floors,
        currentFloorId,
        currentLayerId,
        setCurrentFloorId,
        setCurrentLayerId,

        // Helpers
        getCurrentFloor,
        getCurrentLayer,

        // Gestión de plantas
        addFloor,
        removeFloor,
        updateFloorFormat,
        updateFloorName,

        // Gestión de capas
        toggleLayerVisibility,
        toggleLayerLock,
        updateLayerColor,

        // Estado de elementos (compatibilidad con código existente)
        symbols,
        walls,
        pipes,
        auxLines,
        dimensions,
        roomGroups,
        pixelsPerMeter,
        selectedId,

        // Setters directos (compatibilidad)
        setSymbols,
        setWalls,
        setPipes,
        setAuxLines,
        setDimensions,
        setRoomGroups,
        setPixelsPerMeter,
        selectShape,

        // Acciones sobre elementos
        addSymbol,
        addWall,
        addPipe,
        addAuxLine,
        addDimension,

        // Setters globales [NUEVO]
        setFloors,
        getState: () => ({
            floors,
            pixelsPerMeter
        })
    };
};
