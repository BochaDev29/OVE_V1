import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EditorShape, ShapeType, Point, RectShape, CircleShape, LineShape, TextShape, BezierCurveShape, ArrowShape } from './symbolEditorTypes';
import SymbolEditorToolbar from './SymbolEditorToolbar';
import SymbolEditorExport from './SymbolEditorExport';
import SymbolEditorPropertyPanel from './SymbolEditorPropertyPanel';
import { saveToLocalStorage, loadFromLocalStorage, parsePathToShapes } from '../../lib/planner/utils/svgHelper';
import { v4 as uuidv4 } from 'uuid';
import styles from './SymbolEditor.module.css';
import { useNavigate } from 'react-router-dom';

const GRID_SIZE = 10;
const MAJOR_GRID_SIZE = 50;
// Note: Initial origin will be centered dynamically on first load

const SymbolEditor: React.FC = () => {
    const navigate = useNavigate();
    const [shapes, setShapes] = useState<EditorShape[]>([]);
    const [history, setHistory] = useState<EditorShape[][]>([]);
    const [activeTool, setActiveTool] = useState<ShapeType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentShape, setCurrentShape] = useState<EditorShape | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Reference path for import/overlay
    const [referencePath, setReferencePath] = useState<string>('');

    // Canvas Settings
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const hasSetInitialOrigin = useRef(false);

    // Mouse position tracking for hint
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

    // Transformer / Resize
    const [draggingResizeNode, setDraggingResizeNode] = useState<{ id: string; handle: string } | null>(null);

    // Line node dragging
    const [draggingLineNode, setDraggingLineNode] = useState<{ lineId: string; point: 'start' | 'end' | 'control' } | null>(null);

    const canvasRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const { shapes: savedShapes, origin: savedOrigin } = loadFromLocalStorage();
        if (savedShapes && savedShapes.length > 0) {
            // Ensure ids are present and handle potential missing types from migration
            const validated = savedShapes.map(s => ({ ...s, id: s.id || uuidv4() }));
            setShapes(validated);
        }
        // Note: origin is NOT restored from localStorage — always starts at (0,0)
        // The migration useEffect handles legacy shapes if needed
    }, []);

    // Save to localStorage whenever shapes or origin change
    useEffect(() => {
        if (shapes.length > 0 || hasSetInitialOrigin.current) {
            saveToLocalStorage(shapes, origin);
        }
    }, [shapes, origin]);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Origin starts at (0,0) — matching the SVG viewBox center.
    // Only recalculate for legacy shapes that were drawn with a non-zero origin.
    useEffect(() => {
        if (hasSetInitialOrigin.current) return;
        if (canvasSize.width === 0) return;
        hasSetInitialOrigin.current = true;

        // Empty canvas → origin stays at (0,0)
        if (shapes.length === 0) {
            console.log('OVE_DEBUG: Origin = (0,0) — empty canvas');
            return;
        }

        // Legacy migration: if shapes are far from (0,0), compute their center as origin
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shapes.forEach(s => {
            if (s.type === 'rect') {
                minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
                maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height);
            } else if (s.type === 'circle') {
                minX = Math.min(minX, s.cx - s.rx); minY = Math.min(minY, s.cy - s.ry);
                maxX = Math.max(maxX, s.cx + s.rx); maxY = Math.max(maxY, s.cy + s.ry);
            } else if (s.type === 'line' || s.type === 'arrow') {
                minX = Math.min(minX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2);
                maxX = Math.max(maxX, s.x1, s.x2); maxY = Math.max(maxY, s.y1, s.y2);
            } else if (s.type === 'curve') {
                minX = Math.min(minX, s.x1, s.x2, s.qx); minY = Math.min(minY, s.y1, s.y2, s.qy);
                maxX = Math.max(maxX, s.x1, s.x2, s.qx); maxY = Math.max(maxY, s.y1, s.y2, s.qy);
            } else if (s.type === 'text') {
                minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
                maxX = Math.max(maxX, s.x + 100); maxY = Math.max(maxY, s.y + 20);
            }
        });

        if (minX === Infinity) return;

        const cx = Math.round((minX + maxX) / 2);
        const cy = Math.round((minY + maxY) / 2);

        // If shapes are already near (0,0), keep origin at (0,0)
        if (Math.abs(cx) < 50 && Math.abs(cy) < 50) {
            console.log('OVE_DEBUG: Shapes near (0,0), origin = (0,0)');
            return;
        }

        // Legacy shapes far from center → use their center as origin
        setOrigin({ x: cx, y: cy });
        console.log('OVE_DEBUG: Legacy shapes detected, origin set to:', { x: cx, y: cy });
    }, [canvasSize, shapes.length]);

    useEffect(() => {
        console.log('OVE_DEBUG: SymbolEditor Component Loaded. Zoom:', zoom, 'Origin:', origin);
    }, []);

    const snap = (val: number) => snapToGrid ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;

    const getPointFromEvent = (e: React.MouseEvent): Point => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();

        // El centro físico del canvas es (rect.width/2, rect.height/2)
        // Queremos que ese punto sea el (0,0) lógico.
        // La distancia desde el centro en píxeles físicos dividida por el zoom nos da la distancia lógica.
        const physicalX = e.clientX - rect.left;
        const physicalY = e.clientY - rect.top;

        const logicalX = (physicalX - rect.width / 2) / zoom;
        const logicalY = (physicalY - rect.height / 2) / zoom;

        return {
            x: snap(logicalX),
            y: snap(logicalY),
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const point = getPointFromEvent(e);
        const target = e.target as SVGElement;

        // Check for line node first
        const lineId = target.getAttribute('data-line-id');
        const pointType = target.getAttribute('data-point') as 'start' | 'end' | null;

        if (lineId && pointType) {
            setDraggingLineNode({ lineId, point: pointType });
            setHistory(prev => [...prev, [...shapes]]);
            return;
        }

        if (activeTool === 'select') {
            const id = target.getAttribute('data-id');

            if (id) {
                const isShift = e.shiftKey;
                if (isShift) {
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                } else if (!selectedIds.includes(id)) {
                    setSelectedIds([id]);
                }

                setIsDragging(true);
                const shape = shapes.find(s => s.id === id);
                if (shape) {
                    const handle = target.getAttribute('data-handle');
                    if (handle) {
                        // Resize handles currently only work on single selection for simplicity
                        setDraggingResizeNode({ id, handle });
                        setIsDragging(false);
                        setHistory(prev => [...prev, [...shapes]]);
                        return;
                    }
                    setIsDragging(true);
                    let ox = 0, oy = 0;
                    if (shape.type === 'rect') { ox = point.x - shape.x; oy = point.y - shape.y; }
                    else if (shape.type === 'circle') { ox = point.x - shape.cx; oy = point.y - shape.cy; }
                    else if (shape.type === 'line' || shape.type === 'arrow' || shape.type === 'curve') { ox = point.x - shape.x1; oy = point.y - shape.y1; }
                    else if (shape.type === 'text') { ox = point.x - shape.x; oy = point.y - shape.y; }
                    setDragOffset({ x: ox, y: oy });
                }
            } else {
                setSelectedIds([]);
            }
            return;
        }

        setHistory(prev => [...prev, [...shapes]]);
        setIsDrawing(true);
        setStartPoint(point);

        const base = {
            id: uuidv4(),
            stroke: '#000000',
            strokeWidth: 2,
            fill: 'none',
        };

        let newShape: EditorShape;
        switch (activeTool) {
            case 'rect':
                newShape = { ...base, type: 'rect', x: point.x, y: point.y, width: 0, height: 0 } as RectShape;
                break;
            case 'circle':
                newShape = { ...base, type: 'circle', cx: point.x, cy: point.y, rx: 0, ry: 0 } as any;
                break;
            case 'line':
                newShape = { ...base, type: 'line', x1: point.x, y1: point.y, x2: point.x, y2: point.y } as LineShape;
                break;
            case 'arrow':
                newShape = { ...base, type: 'arrow', x1: point.x, y1: point.y, x2: point.x, y2: point.y } as ArrowShape;
                break;
            case 'curve':
                newShape = { ...base, type: 'curve', x1: point.x, y1: point.y, qx: point.x, qy: point.y, x2: point.x, y2: point.y } as BezierCurveShape;
                break;
            case 'text':
                newShape = { ...base, type: 'text', x: point.x, y: point.y, text: 'Texto', fontSize: 16 } as TextShape;
                break;
            default: return;
        }
        setCurrentShape(newShape);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const point = getPointFromEvent(e);
        setMousePos(point);

        if (!isDrawing && !isDragging && !draggingLineNode && !draggingResizeNode) return;

        if (draggingLineNode) {
            setShapes(prev => prev.map(s => {
                if (s.id !== draggingLineNode.lineId) return s;
                if (s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
                    const updated = { ...s } as any;
                    if (draggingLineNode.point === 'start') {
                        updated.x1 = point.x;
                        updated.y1 = point.y;
                    } else if (draggingLineNode.point === 'end') {
                        updated.x2 = point.x;
                        updated.y2 = point.y;
                    } else if (draggingLineNode.point === 'control' && s.type === 'curve') {
                        updated.qx = point.x;
                        updated.qy = point.y;
                    }
                    return updated;
                }
                return s;
            }));
            return;
        }

        if (draggingResizeNode && selectedIds.length === 1) {
            setShapes(prev => prev.map(s => {
                if (s.id !== selectedIds[0]) return s;
                const updated = { ...s } as any;
                const handle = draggingResizeNode.handle;

                if (s.type === 'rect') {
                    if (handle.includes('e')) updated.width = Math.max(5, point.x - s.x);
                    if (handle.includes('s')) updated.height = Math.max(5, point.y - s.y);
                    if (handle.includes('w')) {
                        const newWidth = Math.max(5, (s.x + s.width) - point.x);
                        updated.x = (s.x + s.width) - newWidth;
                        updated.width = newWidth;
                    }
                    if (handle.includes('n')) {
                        const newHeight = Math.max(5, (s.y + s.height) - point.y);
                        updated.y = (s.y + s.height) - newHeight;
                        updated.height = newHeight;
                    }
                } else if (s.type === 'circle') {
                    if (handle === 'e') updated.rx = Math.max(5, point.x - s.cx);
                    if (handle === 'w') updated.rx = Math.max(5, s.cx - point.x);
                    if (handle === 's') updated.ry = Math.max(5, point.y - s.cy);
                    if (handle === 'n') updated.ry = Math.max(5, s.cy - point.y);
                } else if (handle === 'rot') {
                    const centerX = s.type === 'rect' ? s.x + s.width / 2 : s.cx;
                    const centerY = s.type === 'rect' ? s.y + s.height / 2 : s.cy;
                    const angle = Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI;
                    updated.rotation = Math.round(angle + 90);
                }
                return updated;
            }));
            return;
        }

        if (isDragging && selectedIds.length > 0) {
            // El desplazamiento lo basamos en el primer elemento seleccionado (el que iniciamos el drag)
            const referenceShape = shapes.find(s => selectedIds.includes(s.id));
            if (!referenceShape) return;

            setShapes(prev => prev.map(s => {
                if (!selectedIds.includes(s.id)) return s;

                // Calculamos dx/dy basándonos en cómo SE MOVÍA antes el principal
                // pero ahora lo hacemos relativo para todos
                let dx = 0, dy = 0;

                // Si es el que estamos arrastrando directamente (el que originó dragOffset)
                // podemos calcular el movimiento absoluto y deducir el delta
                const targetX = point.x - dragOffset.x;
                const targetY = point.y - dragOffset.y;

                if (s.type === 'rect' || s.type === 'text') {
                    // Para rects/text, s.x/y es el punto de control
                    // Pero en realidad queremos mover TODOS con el mismo delta.
                    // Vamos a calcular el delta desde el ratón.
                }

                // Mejor enfoque: calcular delta del ratón respecto al inicio o al paso anterior
                // Pero como ya tenemos dragOffset (posición inicial relativa), usémosla para el principal.
                // El principal es el que tiene el data-id que clickeamos. 
                // Para simplificar, asumiremos que el delta es (point.x - startingPoint.x)
                // Implementación robusta de movimiento grupal:
                const mainId = referenceShape.id;
                const mainShape = shapes.find(m => m.id === mainId)! as any;
                const mainX = mainShape.x !== undefined ? mainShape.x : (mainShape.cx !== undefined ? mainShape.cx : mainShape.x1);
                const mainY = mainShape.y !== undefined ? mainShape.y : (mainShape.cy !== undefined ? mainShape.cy : mainShape.y1);

                const deltaX = targetX - mainX;
                const deltaY = targetY - mainY;

                if (s.type === 'rect') return { ...s, x: s.x + deltaX, y: s.y + deltaY };
                if (s.type === 'circle') return { ...s, cx: s.cx + deltaX, cy: s.cy + deltaY };
                if (s.type === 'text') return { ...s, x: s.x + deltaX, y: s.y + deltaY };
                if (s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
                    const res = {
                        ...s,
                        x1: s.x1 + deltaX, y1: s.y1 + deltaY,
                        x2: s.x2 + deltaX, y2: s.y2 + deltaY
                    } as any;
                    if (s.type === 'curve') {
                        res.qx = s.qx + deltaX;
                        res.qy = s.qy + deltaY;
                    }
                    return res;
                }
                return s;
            }));
            return;
        }

        if (isDrawing && currentShape && startPoint) {
            let updated: EditorShape = { ...currentShape };
            if (updated.type === 'rect') {
                updated.x = Math.min(point.x, startPoint.x);
                updated.y = Math.min(point.y, startPoint.y);
                updated.width = Math.max(0, Math.abs(point.x - startPoint.x));
                updated.height = Math.max(0, Math.abs(point.y - startPoint.y));
            } else if (updated.type === 'circle') {
                const dist = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
                (updated as any).rx = dist;
                (updated as any).ry = dist;
            } else if (updated.type === 'line' || updated.type === 'arrow') {
                updated.x2 = point.x;
                updated.y2 = point.y;
            } else if (updated.type === 'curve') {
                updated.x2 = point.x;
                updated.y2 = point.y;
                // Initially control point is at center with slight arc
                updated.qx = (startPoint.x + point.x) / 2;
                updated.qy = (startPoint.y + point.y) / 2 - 30;
            }
            setCurrentShape(updated);
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentShape) {
            setShapes(prev => [...prev, currentShape]);
            setSelectedIds([currentShape.id]);
        }
        setIsDrawing(false);
        setIsDragging(false);
        setDraggingLineNode(null);
        setDraggingResizeNode(null);
        setCurrentShape(null);
        setStartPoint(null);
    };

    const handleClear = () => {
        if (confirm('¿Limpiar todo el dibujo?')) {
            setHistory(prev => [...prev, [...shapes]]);
            setShapes([]);
            setSelectedIds([]);
            saveToLocalStorage([], origin);
        }
    };

    const handleUndo = useCallback(() => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setShapes(prev);
            setHistory(history.slice(0, -1));
            setSelectedIds([]);
        }
    }, [history]);

    const handleUpdateShape = useCallback((updates: Partial<EditorShape>) => {
        if (selectedIds.length !== 1) return;
        setHistory(prev => [...prev, [...shapes]]);
        setShapes(prev => prev.map(s =>
            s.id === selectedIds[0] ? { ...s, ...updates } as EditorShape : s
        ));
    }, [selectedIds, shapes]);

    const handleDelete = useCallback((e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
            const activeEl = document.activeElement;
            if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

            setHistory(prev => [...prev, [...shapes]]);
            setShapes(prev => prev.filter(s => !selectedIds.includes(s.id)));
            setSelectedIds([]);
        }
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setSelectedIds(shapes.map(s => s.id));
        }
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
            handleUndo();
        }
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            if (e.key === 'v') setActiveTool('select');
            if (e.key === 'r') setActiveTool('rect');
            if (e.key === 'c') setActiveTool('circle');
            if (e.key === 'l') setActiveTool('line');
            if (e.key === 't') setActiveTool('text');
            if (e.key === 'a') setActiveTool('curve');
            if (e.key === 'f') setActiveTool('arrow');
            if (e.key === 'g') setShowGrid(prev => !prev);
            if (e.key === 's') setSnapToGrid(prev => !prev);
        }
    }, [selectedIds, shapes, handleUndo]);

    useEffect(() => {
        window.addEventListener('keydown', handleDelete);
        return () => window.removeEventListener('keydown', handleDelete);
    }, [handleDelete]);

    return (
        <div className={styles.editorContainer}>
            {/* Header */}
            <div className={styles.editorHeader}>
                <div className={styles.headerContent}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={styles.backButton}
                        title="Volver al Dashboard"
                    >
                        <ArrowLeft className={styles.backIcon} />
                    </button>
                    <div>
                        <h1 className={styles.editorTitle}>Editor de Símbolos</h1>
                        <p className={styles.editorSubtitle}>Herramienta de desarrollo - Solo Admin</p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.headerZoom}>
                        <div className={styles.zoomLabel}>Zoom</div>
                        <div className={styles.zoomControls}>
                            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className={styles.zoomButton}>-</button>
                            <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className={styles.zoomButton}>+</button>
                            <button onClick={() => setZoom(1)} className={styles.zoomReset}>100%</button>
                        </div>
                    </div>

                    {/* Property Panel in Header */}
                    <div className={styles.headerPropertyPanel}>
                        <SymbolEditorPropertyPanel
                            selectedShape={selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) || null : null}
                            onUpdateShape={handleUpdateShape}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.editorContent}>
                {/* Left Toolbar */}
                <SymbolEditorToolbar
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    onClear={handleClear}
                    onUndo={handleUndo}
                    canUndo={history.length > 0}
                />

                {/* Main Drawing Area */}
                <div ref={containerRef} className={styles.canvasContainer}>
                    <svg
                        ref={canvasRef}
                        width="100%"
                        height="100%"
                        viewBox={`${-canvasSize.width / 2 / zoom} ${-canvasSize.height / 2 / zoom} ${canvasSize.width / zoom} ${canvasSize.height / zoom}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        className={styles.canvas}
                    >
                        {/* SVG Grid Definition */}
                        <defs>
                            <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse" patternTransform="translate(0,0)">
                                <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth={1 / zoom} />
                            </pattern>
                            <pattern id="grid" width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} patternUnits="userSpaceOnUse" patternTransform="translate(0,0)">
                                <rect width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} fill="url(#smallGrid)" />
                                <path d={`M ${MAJOR_GRID_SIZE} 0 L 0 0 0 ${MAJOR_GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth={1.5 / zoom} />
                            </pattern>
                        </defs>

                        <g>
                            {showGrid && (
                                <rect x="-1500" y="-1500" width="3000" height="3000" fill="url(#grid)" />
                            )}

                            {/* Origin Guides (Internal Only) */}
                            <line
                                x1="-1500" y1="0"
                                x2="1500" y2="0"
                                stroke="#ef4444"
                                strokeWidth={1 / zoom}
                                strokeDasharray={`${5 / zoom},${5 / zoom}`}
                            />
                            <line
                                x1="0" y1="-1500"
                                x2="0" y2="1500"
                                stroke="#22c55e"
                                strokeWidth={1 / zoom}
                                strokeDasharray={`${5 / zoom},${5 / zoom}`}
                            />
                            <circle
                                cx="0"
                                cy="0"
                                r={4 / zoom}
                                fill="#3b82f6"
                                opacity="0.8"
                            />

                            {/* Reference path overlay */}
                            {referencePath && (
                                <path
                                    d={referencePath}
                                    stroke="#3b82f6"
                                    strokeWidth={1.5 / zoom}
                                    fill="none"
                                    opacity="0.35"
                                    strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                                    pointerEvents="none"
                                />
                            )}

                            {shapes.map((s) => (
                                <React.Fragment key={s.id}>
                                    {s.type === 'rect' && (
                                        <>
                                            <rect
                                                data-id={s.id}
                                                x={s.x}
                                                y={s.y}
                                                width={s.width}
                                                height={s.height}
                                                stroke={s.stroke}
                                                strokeWidth={s.strokeWidth}
                                                fill={s.fill}
                                                className={`${styles.shape} ${selectedIds.includes(s.id) ? styles.shapeSelected : ''}`}
                                                transform={`rotate(${s.rotation || 0} ${s.type === 'rect' ? s.x + s.width / 2 : s.cx} ${s.type === 'rect' ? s.y + s.height / 2 : s.cy})`}
                                            />
                                            {selectedIds.length === 1 && selectedIds[0] === s.id && (
                                                <g transform={`rotate(${s.rotation || 0} ${s.type === 'rect' ? s.x + s.width / 2 : s.cx} ${s.type === 'rect' ? s.y + s.height / 2 : s.cy})`}>
                                                    {/* Rotation handle */}
                                                    <line
                                                        x1={s.type === 'rect' ? s.x + s.width / 2 : s.cx}
                                                        y1={s.type === 'rect' ? s.y : s.cy - ((s as any).ry || (s as any).r)}
                                                        x2={s.type === 'rect' ? s.x + s.width / 2 : s.cx}
                                                        y2={(s.type === 'rect' ? s.y : s.cy - ((s as any).ry || (s as any).r)) - 20 / zoom}
                                                        stroke="#3b82f6" strokeWidth={1 / zoom}
                                                    />
                                                    <circle
                                                        cx={s.type === 'rect' ? s.x + s.width / 2 : s.cx}
                                                        cy={(s.type === 'rect' ? s.y : s.cy - ((s as any).ry || (s as any).r)) - 20 / zoom}
                                                        r={4 / zoom}
                                                        fill="white"
                                                        stroke="#3b82f6"
                                                        strokeWidth={1 / zoom}
                                                        style={{ cursor: 'crosshair' }}
                                                        data-id={s.id}
                                                        data-handle="rot"
                                                    />
                                                    {[
                                                        { h: 'nw', x: s.x, y: s.y },
                                                        { h: 'n', x: s.x + s.width / 2, y: s.y },
                                                        { h: 'ne', x: s.x + s.width, y: s.y },
                                                        { h: 'e', x: s.x + s.width, y: s.y + s.height / 2 },
                                                        { h: 'se', x: s.x + s.width, y: s.y + s.height },
                                                        { h: 's', x: s.x + s.width / 2, y: s.y + s.height },
                                                        { h: 'sw', x: s.x, y: s.y + s.height },
                                                        { h: 'w', x: s.x, y: s.y + s.height / 2 },
                                                    ].map(hand => (
                                                        <rect
                                                            key={hand.h}
                                                            x={hand.x - 4 / zoom}
                                                            y={hand.y - 4 / zoom}
                                                            width={8 / zoom}
                                                            height={8 / zoom}
                                                            fill="white"
                                                            stroke="#3b82f6"
                                                            strokeWidth={1 / zoom}
                                                            style={{ cursor: hand.h.includes('n') || hand.h.includes('s') ? 'ns-resize' : 'ew-resize' }}
                                                            data-id={s.id}
                                                            data-handle={hand.h}
                                                        />
                                                    ))}
                                                </g>
                                            )}
                                        </>
                                    )}
                                    {s.type === 'circle' && (
                                        <>
                                            <ellipse
                                                data-id={s.id}
                                                cx={s.cx}
                                                cy={s.cy}
                                                rx={(s as any).rx || (s as any).r}
                                                ry={(s as any).ry || (s as any).r}
                                                stroke={s.stroke}
                                                strokeWidth={s.strokeWidth}
                                                fill={s.fill}
                                                className={`${styles.shape} ${selectedIds.includes(s.id) ? styles.shapeSelected : ''}`}
                                                transform={`rotate(${s.rotation || 0} ${s.cx} ${s.cy})`}
                                            />
                                            {selectedIds.length === 1 && selectedIds[0] === s.id && (
                                                <g transform={`rotate(${s.rotation || 0} ${s.cx} ${s.cy})`}>
                                                    {/* Rotation handle */}
                                                    <line
                                                        x1={s.cx} y1={s.cy - ((s as any).ry || (s as any).r)}
                                                        x2={s.cx} y2={s.cy - ((s as any).ry || (s as any).r) - 20 / zoom}
                                                        stroke="#3b82f6" strokeWidth={1 / zoom}
                                                    />
                                                    <circle
                                                        cx={s.cx} cy={s.cy - ((s as any).ry || (s as any).r) - 20 / zoom}
                                                        r={4 / zoom}
                                                        fill="white"
                                                        stroke="#3b82f6"
                                                        strokeWidth={1 / zoom}
                                                        style={{ cursor: 'crosshair' }}
                                                        data-id={s.id}
                                                        data-handle="rot"
                                                    />
                                                    {[
                                                        { h: 'n', x: s.cx, y: s.cy - ((s as any).ry || (s as any).r) },
                                                        { h: 's', x: s.cx, y: s.cy + ((s as any).ry || (s as any).r) },
                                                        { h: 'e', x: s.cx + ((s as any).rx || (s as any).r), y: s.cy },
                                                        { h: 'w', x: s.cx - ((s as any).rx || (s as any).r), y: s.cy },
                                                    ].map(hand => (
                                                        <rect
                                                            key={hand.h}
                                                            x={hand.x - 4 / zoom}
                                                            y={hand.y - 4 / zoom}
                                                            width={8 / zoom}
                                                            height={8 / zoom}
                                                            fill="white"
                                                            stroke="#3b82f6"
                                                            strokeWidth={1 / zoom}
                                                            style={{ cursor: hand.h === 'n' || hand.h === 's' ? 'ns-resize' : 'ew-resize' }}
                                                            data-id={s.id}
                                                            data-handle={hand.h}
                                                        />
                                                    ))}
                                                </g>
                                            )}
                                        </>
                                    )}
                                    {(s.type === 'line' || s.type === 'arrow') && (
                                        <>
                                            <line
                                                data-id={s.id}
                                                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                                                stroke={s.stroke}
                                                strokeWidth={s.strokeWidth}
                                                className={`${styles.shape} ${selectedIds.includes(s.id) ? styles.shapeSelected : ''}`}
                                            />
                                            {s.type === 'arrow' && (
                                                <polygon
                                                    points={(() => {
                                                        const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
                                                        const size = 10 / zoom;
                                                        const ax1 = s.x2 - size * Math.cos(angle - Math.PI / 6);
                                                        const ay1 = s.y2 - size * Math.sin(angle - Math.PI / 6);
                                                        const ax2 = s.x2 - size * Math.cos(angle + Math.PI / 6);
                                                        const ay2 = s.y2 - size * Math.sin(angle + Math.PI / 6);
                                                        return `${ax1},${ay1} ${s.x2},${s.y2} ${ax2},${ay2}`;
                                                    })()}
                                                    fill={s.stroke} stroke={s.stroke} strokeWidth={s.strokeWidth / 2}
                                                />
                                            )}
                                            {selectedIds.length === 1 && selectedIds[0] === s.id && (
                                                <>
                                                    <circle
                                                        cx={s.x1}
                                                        cy={s.y1}
                                                        r={8 / zoom}
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth={2 / zoom}
                                                        className={styles.lineNode}
                                                        data-line-id={s.id}
                                                        data-point="start"
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <circle
                                                        cx={s.x2}
                                                        cy={s.y2}
                                                        r={8 / zoom}
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth={2 / zoom}
                                                        className={styles.lineNode}
                                                        data-line-id={s.id}
                                                        data-point="end"
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                    {s.type === 'curve' && (
                                        <>
                                            <path
                                                data-id={s.id}
                                                d={`M ${s.x1} ${s.y1} Q ${s.qx} ${s.qy} ${s.x2} ${s.y2}`}
                                                stroke={s.stroke}
                                                strokeWidth={s.strokeWidth}
                                                fill="none"
                                                className={`${styles.shape} ${selectedIds.includes(s.id) ? styles.shapeSelected : ''}`}
                                            />
                                            {selectedIds.length === 1 && selectedIds[0] === s.id && (
                                                <>
                                                    <circle
                                                        cx={s.x1}
                                                        cy={s.y1}
                                                        r={8 / zoom}
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth={2 / zoom}
                                                        className={styles.lineNode}
                                                        data-line-id={s.id}
                                                        data-point="start"
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <circle
                                                        cx={s.qx}
                                                        cy={s.qy}
                                                        r={8 / zoom}
                                                        fill="#f59e0b"
                                                        stroke="white"
                                                        strokeWidth={2 / zoom}
                                                        className={styles.lineNode}
                                                        data-line-id={s.id}
                                                        data-point="control"
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <circle
                                                        cx={s.x2}
                                                        cy={s.y2}
                                                        r={8 / zoom}
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth={2 / zoom}
                                                        className={styles.lineNode}
                                                        data-line-id={s.id}
                                                        data-point="end"
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                    {s.type === 'text' && (
                                        <text
                                            data-id={s.id}
                                            x={s.x}
                                            y={s.y}
                                            fill={s.stroke}
                                            fontSize={s.fontSize}
                                            fontFamily="Arial"
                                            className={`${styles.shapeText} ${selectedIds.includes(s.id) ? styles.shapeTextSelected : ''}`}
                                        >
                                            {s.text}
                                        </text>
                                    )}
                                </React.Fragment>
                            ))}

                            {/* Current Drawing Draft */}
                            {currentShape && (
                                <>
                                    {currentShape.type === 'rect' && (
                                        <rect
                                            x={currentShape.x}
                                            y={currentShape.y}
                                            width={currentShape.width}
                                            height={currentShape.height}
                                            stroke="#3b82f6"
                                            strokeWidth={2 / zoom}
                                            fill="rgba(59, 130, 246, 0.1)"
                                            strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                                        />
                                    )}
                                    {currentShape.type === 'circle' && (
                                        <circle
                                            cx={currentShape.cx}
                                            cy={currentShape.cy}
                                            r={currentShape.r}
                                            stroke="#3b82f6"
                                            strokeWidth={2 / zoom}
                                            fill="rgba(59, 130, 246, 0.1)"
                                            strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                                        />
                                    )}
                                    {(currentShape.type === 'line' || currentShape.type === 'arrow') && (
                                        <g>
                                            <line
                                                x1={currentShape.x1} y1={currentShape.y1}
                                                x2={currentShape.x2} y2={currentShape.y2}
                                                stroke="#3b82f6" strokeWidth={2 / zoom}
                                                strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                                            />
                                            {currentShape.type === 'arrow' && (
                                                <polygon
                                                    points={(() => {
                                                        const angle = Math.atan2(currentShape.y2 - currentShape.y1, currentShape.x2 - currentShape.x1);
                                                        const size = 10 / zoom;
                                                        const ax1 = currentShape.x2 - size * Math.cos(angle - Math.PI / 6);
                                                        const ay1 = currentShape.y2 - size * Math.sin(angle - Math.PI / 6);
                                                        const ax2 = currentShape.x2 - size * Math.cos(angle + Math.PI / 6);
                                                        const ay2 = currentShape.y2 - size * Math.sin(angle + Math.PI / 6);
                                                        return `${ax1},${ay1} ${currentShape.x2},${currentShape.y2} ${ax2},${ay2}`;
                                                    })()}
                                                    fill="#3b82f6" stroke="#3b82f6" strokeWidth={1 / zoom}
                                                />
                                            )}
                                        </g>
                                    )}
                                    {currentShape.type === 'curve' && (
                                        <path
                                            d={`M ${currentShape.x1} ${currentShape.y1} Q ${currentShape.qx} ${currentShape.qy} ${currentShape.x2} ${currentShape.y2}`}
                                            stroke="#3b82f6" strokeWidth={2 / zoom} fill="none"
                                            strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                                        />
                                    )}
                                </>
                            )}
                        </g>
                    </svg>

                    {/* Floating Tooltips / Hint */}
                    <div className={styles.canvasHints}>
                        <div className={styles.hintBadge}>
                            <span className={styles.hintItem}><kbd className={styles.kbd}>G</kbd> Grilla: {showGrid ? 'ON' : 'OFF'}</span>
                            <span className={styles.hintItem}><kbd className={styles.kbd}>S</kbd> Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
                            <span className={styles.hintItem}>Origen: ({mousePos.x - origin.x}, {mousePos.y - origin.y})</span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarContent}>
                        <div className={styles.settingsPanel}>
                            <h3 className={styles.settingsTitle}>Ejes y Origen</h3>
                            <button
                                onClick={() => {
                                    setShapes(currentShapes => {
                                        if (currentShapes.length === 0) return currentShapes;
                                        const r = (v: number) => Math.round(v);
                                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                        currentShapes.forEach(s => {
                                            if (s.type === 'rect') { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height); }
                                            else if (s.type === 'circle') {
                                                minX = Math.min(minX, s.cx - s.rx); minY = Math.min(minY, s.cy - s.ry);
                                                maxX = Math.max(maxX, s.cx + s.rx); maxY = Math.max(maxY, s.cy + s.ry);
                                            }
                                            else if (s.type === 'line' || s.type === 'arrow') { minX = Math.min(minX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2); maxX = Math.max(maxX, s.x1, s.x2); maxY = Math.max(maxY, s.y1, s.y2); }
                                            else if (s.type === 'curve') { minX = Math.min(minX, s.x1, s.x2, s.qx); minY = Math.min(minY, s.y1, s.y2, s.qy); maxX = Math.max(maxX, s.x1, s.x2, s.qx); maxY = Math.max(maxY, s.y1, s.y2, s.qy); }
                                            else if (s.type === 'text') { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y - s.fontSize); maxX = Math.max(maxX, s.x + s.text.length * s.fontSize * 0.6); maxY = Math.max(maxY, s.y); }
                                        });
                                        if (minX === Infinity) return currentShapes;
                                        const dx = -r((minX + maxX) / 2);
                                        const dy = -r((minY + maxY) / 2);
                                        console.log('OVE_DEBUG: Re-center dx=', dx, 'dy=', dy, 'bbox=', { minX, minY, maxX, maxY });
                                        return currentShapes.map(s => {
                                            if (s.type === 'rect') return { ...s, x: r(s.x + dx), y: r(s.y + dy), width: r(s.width), height: r(s.height) };
                                            if (s.type === 'circle') return { ...s, cx: r(s.cx + dx), cy: r(s.cy + dy), rx: r(s.rx), ry: r(s.ry) };
                                            if (s.type === 'text') return { ...s, x: r(s.x + dx), y: r(s.y + dy) };
                                            if (s.type === 'line' || s.type === 'arrow') return { ...s, x1: r(s.x1 + dx), y1: r(s.y1 + dy), x2: r(s.x2 + dx), y2: r(s.y2 + dy) };
                                            if (s.type === 'curve') return { ...s, x1: r(s.x1 + dx), y1: r(s.y1 + dy), qx: r(s.qx + dx), qy: r(s.qy + dy), x2: r(s.x2 + dx), y2: r(s.y2 + dy) };
                                            return s;
                                        });
                                    });
                                    setOrigin({ x: 0, y: 0 });
                                }}
                                className={styles.actionButton}
                                style={{ width: '100%', marginBottom: '12px' }}
                            >
                                Re-centrar Dibujo al (0,0)
                            </button>
                            <p className={styles.tipText} style={{ fontSize: '10px' }}>
                                Mueve todo tu dibujo para que el centro sea el (0,0).
                            </p>
                        </div>

                        {/* Import Reference Path */}
                        <div className={styles.settingsPanel}>
                            <h3 className={styles.settingsTitle}>Importar Referencia</h3>
                            <textarea
                                value={referencePath}
                                onChange={(e) => setReferencePath(e.target.value)}
                                placeholder='Pegá un pathdata aquí (ej: M -10 0 L 10 0...)'
                                style={{
                                    width: '100%',
                                    minHeight: '60px',
                                    maxHeight: '100px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'Consolas, Monaco, monospace',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    resize: 'vertical',
                                    background: referencePath ? '#eff6ff' : '#f8fafc',
                                    color: '#334155',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {referencePath && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    <button
                                        onClick={() => {
                                            const importedShapes = parsePathToShapes(referencePath);
                                            if (importedShapes.length > 0) {
                                                setHistory(prev => [...prev, [...shapes]]);
                                                setShapes(prev => [...prev, ...importedShapes]);
                                                // Opcional: limpiar la referencia para que no se superponga
                                                // setReferencePath(''); 
                                            }
                                        }}
                                        className={styles.actionButton}
                                        style={{ flex: 1, fontSize: '11px', background: '#3b82f6', color: 'white' }}
                                    >
                                        Cargar p/ Editar
                                    </button>
                                    <button
                                        onClick={() => setReferencePath('')}
                                        className={styles.actionButton}
                                        style={{ flex: 1, fontSize: '11px' }}
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            )}
                            <p className={styles.tipText} style={{ fontSize: '10px', marginTop: '6px' }}>
                                El path se muestra como línea azul punteada para calcar. "Cargar p/ Editar" lo convierte en formas manipulables.
                            </p>
                        </div>

                        <div className={styles.settingsPanel}>
                            <h3 className={styles.settingsTitle}>Configuración</h3>
                            <div className={styles.settingsList}>
                                <div className={styles.settingItem}>
                                    <span className={styles.settingLabel}>Mostrar Grilla</span>
                                    <button
                                        onClick={() => setShowGrid(!showGrid)}
                                        className={`${styles.toggle} ${showGrid ? styles.toggleActive : ''}`}
                                    >
                                        <div className={styles.toggleThumb} />
                                    </button>
                                </div>
                                <div className={styles.settingItem}>
                                    <span className={styles.settingLabel}>Ajuste Magnético</span>
                                    <button
                                        onClick={() => setSnapToGrid(!snapToGrid)}
                                        className={`${styles.toggle} ${snapToGrid ? styles.toggleActive : ''}`}
                                    >
                                        <div className={styles.toggleThumb} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.tipBox}>
                                <p className={styles.tipText}>
                                    <b>Tip:</b> Usa la grilla para mantener proporciones estándar en simbología eléctrica.
                                    Los componentes suelen diseñarse en múltiplos de {GRID_SIZE}px.
                                </p>
                            </div>
                        </div>
                    </div>
                    <SymbolEditorExport
                        shapes={shapes}
                        canvasSize={canvasSize}
                        origin={origin}
                    />
                </div>
            </div>
        </div>
    );
};

export default SymbolEditor;
