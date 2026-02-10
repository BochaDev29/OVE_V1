import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EditorShape, ShapeType, Point, RectShape, CircleShape, LineShape, TextShape } from './symbolEditorTypes';
import SymbolEditorToolbar from './SymbolEditorToolbar';
import SymbolEditorExport from './SymbolEditorExport';
import SymbolEditorPropertyPanel from './SymbolEditorPropertyPanel';
import { saveToLocalStorage, loadFromLocalStorage } from '../../lib/planner/utils/svgHelper';
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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentShape, setCurrentShape] = useState<EditorShape | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Canvas Settings
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [origin, setOrigin] = useState<Point>({ x: 400, y: 400 });
    const hasSetInitialOrigin = useRef(false);

    // Mouse position tracking for hint
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

    // Line node dragging
    const [draggingLineNode, setDraggingLineNode] = useState<{ lineId: string; point: 'start' | 'end' } | null>(null);

    const canvasRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const savedShapes = loadFromLocalStorage();
        if (savedShapes.length > 0) {
            setShapes(savedShapes);
        }
    }, []);

    // Save to localStorage whenever shapes change
    useEffect(() => {
        if (shapes.length > 0) {
            saveToLocalStorage(shapes);
        }
    }, [shapes]);

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

    // Set initial origin to center of viewport on first load
    useEffect(() => {
        if (canvasSize.width > 0 && !hasSetInitialOrigin.current) {
            setOrigin({
                x: Math.round(canvasSize.width / 2 / GRID_SIZE) * GRID_SIZE,
                y: Math.round(canvasSize.height / 2 / GRID_SIZE) * GRID_SIZE
            });
            hasSetInitialOrigin.current = true;
        }
    }, [canvasSize]);

    const snap = (val: number) => snapToGrid ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;

    const getPointFromEvent = (e: React.MouseEvent): Point => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: snap(e.clientX - rect.left),
            y: snap(e.clientY - rect.top),
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
                setSelectedId(id);
                setIsDragging(true);
                const shape = shapes.find(s => s.id === id);
                if (shape) {
                    let ox = 0, oy = 0;
                    if (shape.type === 'rect') { ox = point.x - shape.x; oy = point.y - shape.y; }
                    else if (shape.type === 'circle') { ox = point.x - shape.cx; oy = point.y - shape.cy; }
                    else if (shape.type === 'line') { ox = point.x - shape.x1; oy = point.y - shape.y1; }
                    else if (shape.type === 'text') { ox = point.x - shape.x; oy = point.y - shape.y; }
                    setDragOffset({ x: ox, y: oy });
                }
            } else {
                setSelectedId(null);
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
                newShape = { ...base, type: 'circle', cx: point.x, cy: point.y, r: 0 } as CircleShape;
                break;
            case 'line':
                newShape = { ...base, type: 'line', x1: point.x, y1: point.y, x2: point.x, y2: point.y } as LineShape;
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

        if (!isDrawing && !isDragging && !draggingLineNode) return;

        if (draggingLineNode) {
            setShapes(prev => prev.map(s => {
                if (s.id !== draggingLineNode.lineId || s.type !== 'line') return s;
                if (draggingLineNode.point === 'start') {
                    return { ...s, x1: point.x, y1: point.y };
                } else {
                    return { ...s, x2: point.x, y2: point.y };
                }
            }));
            return;
        }

        if (isDragging && selectedId) {
            setShapes(prev => prev.map(s => {
                if (s.id !== selectedId) return s;
                if (s.type === 'rect') return { ...s, x: point.x - dragOffset.x, y: point.y - dragOffset.y };
                if (s.type === 'circle') return { ...s, cx: point.x - dragOffset.x, cy: point.y - dragOffset.y };
                if (s.type === 'text') return { ...s, x: point.x - dragOffset.x, y: point.y - dragOffset.y };
                if (s.type === 'line') {
                    const dx = point.x - dragOffset.x - s.x1;
                    const dy = point.y - dragOffset.y - s.y1;
                    return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
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
                updated.r = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
            } else if (updated.type === 'line') {
                updated.x2 = point.x;
                updated.y2 = point.y;
            }
            setCurrentShape(updated);
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentShape) {
            setShapes(prev => [...prev, currentShape]);
            setSelectedId(currentShape.id);
        }
        setIsDrawing(false);
        setIsDragging(false);
        setDraggingLineNode(null);
        setCurrentShape(null);
        setStartPoint(null);
    };

    const handleClear = () => {
        if (confirm('¿Limpiar todo el dibujo?')) {
            setHistory(prev => [...prev, [...shapes]]);
            setShapes([]);
            setSelectedId(null);
            saveToLocalStorage([]);
        }
    };

    const handleUndo = useCallback(() => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setShapes(prev);
            setHistory(history.slice(0, -1));
            setSelectedId(null);
        }
    }, [history]);

    const handleUpdateShape = useCallback((updates: Partial<EditorShape>) => {
        if (!selectedId) return;
        setHistory(prev => [...prev, [...shapes]]);
        setShapes(prev => prev.map(s =>
            s.id === selectedId ? { ...s, ...updates } as EditorShape : s
        ));
    }, [selectedId, shapes]);

    const handleDelete = useCallback((e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            const activeEl = document.activeElement;
            if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

            setHistory(prev => [...prev, [...shapes]]);
            setShapes(prev => prev.filter(s => s.id !== selectedId));
            setSelectedId(null);
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
            if (e.key === 'g') setShowGrid(prev => !prev);
            if (e.key === 's') setSnapToGrid(prev => !prev);
        }
    }, [selectedId, shapes, handleUndo]);

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

                {/* Property Panel in Header */}
                <div className={styles.headerPropertyPanel}>
                    <SymbolEditorPropertyPanel
                        selectedShape={shapes.find(s => s.id === selectedId) || null}
                        onUpdateShape={handleUpdateShape}
                    />
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
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        className={styles.canvas}
                    >
                        {/* SVG Grid Definition */}
                        <defs>
                            <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                                <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth="1" />
                            </pattern>
                            <pattern id="grid" width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} patternUnits="userSpaceOnUse">
                                <rect width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} fill="url(#smallGrid)" />
                                <path d={`M ${MAJOR_GRID_SIZE} 0 L 0 0 0 ${MAJOR_GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                            </pattern>
                        </defs>

                        {showGrid && (
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        )}

                        {/* Origin Guides (Internal Only) */}
                        <line
                            x1="0" y1={origin.y}
                            x2="100%" y2={origin.y}
                            stroke="#ef4444"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                        />
                        <line
                            x1={origin.x} y1="0"
                            x2={origin.x} y2="100%"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                        />
                        <circle
                            cx={origin.x}
                            cy={origin.y}
                            r="4"
                            fill="#3b82f6"
                            opacity="0.8"
                        />

                        {shapes.map((s) => (
                            <React.Fragment key={s.id}>
                                {s.type === 'rect' && (
                                    <rect
                                        data-id={s.id}
                                        x={s.x}
                                        y={s.y}
                                        width={s.width}
                                        height={s.height}
                                        stroke={s.stroke}
                                        strokeWidth={s.strokeWidth}
                                        fill={s.fill}
                                        className={`${styles.shape} ${selectedId === s.id ? styles.shapeSelected : ''}`}
                                    />
                                )}
                                {s.type === 'circle' && (
                                    <circle
                                        data-id={s.id}
                                        cx={s.cx}
                                        cy={s.cy}
                                        r={s.r}
                                        stroke={s.stroke}
                                        strokeWidth={s.strokeWidth}
                                        fill={s.fill}
                                        className={`${styles.shape} ${selectedId === s.id ? styles.shapeSelected : ''}`}
                                    />
                                )}
                                {s.type === 'line' && (
                                    <>
                                        <line
                                            data-id={s.id}
                                            x1={s.x1}
                                            y1={s.y1}
                                            x2={s.x2}
                                            y2={s.y2}
                                            stroke={s.stroke}
                                            strokeWidth={s.strokeWidth}
                                            className={`${styles.shape} ${selectedId === s.id ? styles.shapeSelected : ''}`}
                                        />
                                        {/* Editable nodes for line endpoints */}
                                        {selectedId === s.id && (
                                            <>
                                                <circle
                                                    cx={s.x1}
                                                    cy={s.y1}
                                                    r="5"
                                                    fill="#3b82f6"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                    className={styles.lineNode}
                                                    data-line-id={s.id}
                                                    data-point="start"
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <circle
                                                    cx={s.x2}
                                                    cy={s.y2}
                                                    r="5"
                                                    fill="#3b82f6"
                                                    stroke="white"
                                                    strokeWidth="2"
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
                                        className={`${styles.shapeText} ${selectedId === s.id ? styles.shapeTextSelected : ''}`}
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
                                        strokeWidth={2}
                                        fill="rgba(59, 130, 246, 0.1)"
                                        strokeDasharray="4 2"
                                    />
                                )}
                                {currentShape.type === 'circle' && (
                                    <circle
                                        cx={currentShape.cx}
                                        cy={currentShape.cy}
                                        r={currentShape.r}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="rgba(59, 130, 246, 0.1)"
                                        strokeDasharray="4 2"
                                    />
                                )}
                                {currentShape.type === 'line' && (
                                    <line
                                        x1={currentShape.x1}
                                        y1={currentShape.y1}
                                        x2={currentShape.x2}
                                        y2={currentShape.y2}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="4 2"
                                    />
                                )}
                            </>
                        )}
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
