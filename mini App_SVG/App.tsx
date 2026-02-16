
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shape, ShapeType, Point, RectShape, EllipseShape as CircleShape, LineShape, TextShape } from './types';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/PropertyPanel';
import ExportView from './components/ExportView';
import { v4 as uuidv4 } from 'uuid';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/svgHelper';

const GRID_SIZE = 10;
const MAJOR_GRID_SIZE = 50;

const App: React.FC = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [activeTool, setActiveTool] = useState<ShapeType>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Canvas Settings
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [origin, setOrigin] = useState<Point>({ x: 400, y: 400 });
  const [zoom, setZoom] = useState(1);
  const [draggingLineNode, setDraggingLineNode] = useState<{ lineId: string; point: 'start' | 'end' | 'control' } | null>(null);
  const [draggingResizeNode, setDraggingResizeNode] = useState<{ id: string; handle: string } | null>(null);
  const hasSetInitialOrigin = useRef(false);

  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const { shapes: savedShapes, origin: savedOrigin } = loadFromLocalStorage();
    if (savedShapes.length > 0) {
      setShapes(savedShapes);
    }
    if (savedOrigin) {
      setOrigin(savedOrigin);
      hasSetInitialOrigin.current = true;
    }
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

  // Set initial origin to center of viewport (only for first drawing)
  useEffect(() => {
    if (canvasSize.width > 0 && !hasSetInitialOrigin.current && shapes.length === 0) {
      setOrigin({
        x: Math.round(canvasSize.width / 2 / GRID_SIZE) * GRID_SIZE,
        y: Math.round(canvasSize.height / 2 / GRID_SIZE) * GRID_SIZE
      });
      hasSetInitialOrigin.current = true;
      console.log('OVE_DEBUG_MINI: Initial origin set to center (empty canvas)');
    } else if (canvasSize.width > 0 && !hasSetInitialOrigin.current) {
      // Migration: calculate center based on existing shapes to avoid drift
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      shapes.forEach(s => {
        if (s.type === 'rect') {
          minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
          maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height);
        } else if (s.type === 'circle') {
          const el = s as any;
          const rx = el.rx || el.r || 0;
          const ry = el.ry || el.r || 0;
          minX = Math.min(minX, s.cx - rx); minY = Math.min(minY, s.cy - ry);
          maxX = Math.max(maxX, s.cx + rx); maxY = Math.max(maxY, s.cy + ry);
        } else if (s.type === 'line') {
          minX = Math.min(minX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2);
          maxX = Math.max(maxX, s.x1, s.x2); maxY = Math.max(maxY, s.y1, s.y2);
        } else if (s.type === 'text') {
          minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
          maxX = Math.max(maxX, s.x + 100); maxY = Math.max(maxY, s.y + 20);
        }
      });

      if (minX !== Infinity) {
        const centerX = Math.round((minX + maxX) / 2 / GRID_SIZE) * GRID_SIZE;
        const centerY = Math.round((minY + maxY) / 2 / GRID_SIZE) * GRID_SIZE;
        setOrigin({ x: centerX, y: centerY });
        console.log('OVE_DEBUG_MINI: Migrated origin calculated from shapes:', { centerX, centerY });
      }
      hasSetInitialOrigin.current = true;
    }
  }, [canvasSize, shapes.length]);

  useEffect(() => {
    console.log('OVE_DEBUG_MINI: App Component Loaded. Zoom:', zoom, 'Origin:', origin);
  }, []);

  const snap = (val: number) => snapToGrid ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;

  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // El centro físico del canvas es (rect.width/2, rect.height/2)
    const physicalX = clientX - rect.left;
    const physicalY = clientY - rect.top;

    const logicalX = (physicalX - rect.width / 2) / zoom;
    const logicalY = (physicalY - rect.height / 2) / zoom;

    return {
      x: snap(logicalX),
      y: snap(logicalY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getPointFromEvent(e);

    if (activeTool === 'select') {
      const target = e.target as SVGElement;
      const id = target.getAttribute('data-id');

      if (id) {
        const handle = target.getAttribute('data-handle');
        if (handle) {
          setDraggingResizeNode({ id, handle });
          setHistory(prev => [...prev, [...shapes]]);
          return;
        }
        setSelectedId(id);
        setIsDragging(true);
        const shape = shapes.find(s => s.id === id);
        if (shape) {
          let ox = 0, oy = 0;
          if (shape.type === 'rect') { ox = point.x - shape.x; oy = point.y - shape.y; }
          else if (shape.type === 'circle') { ox = point.x - shape.cx; oy = point.y - shape.cy; }
          else if (shape.type === 'line' || shape.type === 'arrow' || shape.type === 'curve') { ox = point.x - shape.x1; oy = point.y - shape.y1; }
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

    // Si es el primer dibujo, fijar el origen en este punto si no estaba fijado
    if (!hasSetInitialOrigin.current && shapes.length === 0) {
      setOrigin(point);
      hasSetInitialOrigin.current = true;
    }

    const base = {
      id: uuidv4(),
      stroke: '#000000',
      strokeWidth: 2,
      fill: 'none',
    };

    let newShape: Shape;
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
        newShape = { ...base, type: 'arrow', x1: point.x, y1: point.y, x2: point.x, y2: point.y } as any;
        break;
      case 'curve':
        newShape = { ...base, type: 'curve', x1: point.x, y1: point.y, qx: point.x, qy: point.y, x2: point.x, y2: point.y } as any;
        break;
      case 'text':
        newShape = { ...base, type: 'text', x: point.x, y: point.y, text: 'Click para editar', fontSize: 16 } as TextShape;
        break;
      default: return;
    }
    setCurrentShape(newShape);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getPointFromEvent(e);
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

    if (draggingResizeNode && selectedId) {
      setShapes(prev => prev.map(s => {
        if (s.id !== selectedId) return s;
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

    if (isDragging && selectedId) {
      setShapes(prev => prev.map(s => {
        if (s.id !== selectedId) return s;
        const targetX = point.x - dragOffset.x;
        const targetY = point.y - dragOffset.y;

        if (s.type === 'rect') return { ...s, x: targetX, y: targetY };
        if (s.type === 'circle') return { ...s, cx: targetX, cy: targetY };
        if (s.type === 'text') return { ...s, x: targetX, y: targetY };
        if (s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
          const dx = targetX - s.x1;
          const dy = targetY - s.y1;
          const res = { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy } as any;
          if (s.type === 'curve') {
            res.qx = s.qx + dx;
            res.qy = s.qy + dy;
          }
          return res;
        }
        return s;
      }));
      return;
    }

    if (isDrawing && currentShape && startPoint) {
      let updated: Shape = { ...currentShape };
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
        updated.qx = (startPoint.x + point.x) / 2;
        updated.qy = (startPoint.y + point.y) / 2 - 30;
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
    setDraggingResizeNode(null);
    setCurrentShape(null);
    setStartPoint(null);
  };

  const handleClear = () => {
    if (confirm('¿Limpiar todo el dibujo?')) {
      setHistory(prev => [...prev, [...shapes]]);
      setShapes([]);
      setSelectedId(null);
      saveToLocalStorage([], origin);
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
      if (e.key === 'a') setActiveTool('curve');
      if (e.key === 'f') setActiveTool('arrow');
      if (e.key === 't') setActiveTool('text');
      if (e.key === 'g') setShowGrid(prev => !prev);
      if (e.key === 's') setSnapToGrid(prev => !prev);
    }
  }, [selectedId, shapes, handleUndo]);

  useEffect(() => {
    window.addEventListener('keydown', handleDelete);
    return () => window.removeEventListener('keydown', handleDelete);
  }, [handleDelete]);

  const updateShape = (updates: Partial<Shape>) => {
    if (!selectedId) return;
    setShapes(prev => prev.map(s => s.id === selectedId ? { ...s, ...updates } as any : s));
  };

  const selectedShape = shapes.find(s => s.id === selectedId) || null;

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden relative">
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Header Bar with Zoom */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Creador de Símbolos SVG</h1>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Zoom</span>
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 shadow-sm">-</button>
              <span className="w-12 text-center font-bold text-slate-700 text-sm">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 shadow-sm">+</button>
              <button onClick={() => setZoom(1)} className="ml-2 text-[10px] font-bold text-blue-600 hover:underline">100%</button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            Dibuja símbolos eléctricos en 1:1
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar */}
          <Toolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onClear={handleClear}
            onUndo={handleUndo}
            canUndo={history.length > 0}
          />

          {/* Main Drawing Area */}
          <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white cursor-crosshair group">
            <svg
              ref={canvasRef}
              width="100%"
              height="100%"
              viewBox={`${-canvasSize.width / 2 / zoom} ${-canvasSize.height / 2 / zoom} ${canvasSize.width / zoom} ${canvasSize.height / zoom}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative z-0"
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

                {/* Origin Guides */}
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

                {shapes.map((s) => (
                  <React.Fragment key={s.id}>
                    {s.type === 'rect' && (
                      <g>
                        <rect
                          data-id={s.id}
                          x={s.x} y={s.y} width={s.width} height={s.height}
                          stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.fill}
                          className={`transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'stroke-blue-500 stroke-[3px]' : ''}`}
                          transform={`rotate(${s.rotation || 0} ${s.x + s.width / 2} ${s.y + s.height / 2})`}
                        />
                        {selectedId === s.id && (
                          <g transform={`rotate(${s.rotation || 0} ${s.x + s.width / 2} ${s.y + s.height / 2})`}>
                            {/* Rotation Handle */}
                            <line x1={s.x + s.width / 2} y1={s.y} x2={s.x + s.width / 2} y2={s.y - 20 / zoom} stroke="#3b82f6" strokeWidth={1 / zoom} />
                            <circle
                              cx={s.x + s.width / 2} cy={s.y - 20 / zoom} r={4 / zoom}
                              fill="white" stroke="#3b82f6" strokeWidth={1 / zoom}
                              style={{ cursor: 'crosshair' }}
                              data-id={s.id} data-handle="rot"
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
                                x={hand.x - 4 / zoom} y={hand.y - 4 / zoom}
                                width={8 / zoom} height={8 / zoom}
                                fill="white" stroke="#3b82f6" strokeWidth={1 / zoom}
                                style={{ cursor: hand.h.includes('n') || hand.h.includes('s') ? 'ns-resize' : 'ew-resize' }}
                                data-id={s.id} data-handle={hand.h}
                              />
                            ))}
                          </g>
                        )}
                      </g>
                    )}
                    {s.type === 'circle' && (
                      <g>
                        <ellipse
                          data-id={s.id}
                          cx={s.cx} cy={s.cy} rx={(s as any).rx || (s as any).r} ry={(s as any).ry || (s as any).r}
                          stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.fill}
                          className={`transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'stroke-blue-500 stroke-[3px]' : ''}`}
                          transform={`rotate(${s.rotation || 0} ${s.cx} ${s.cy})`}
                        />
                        {selectedId === s.id && (
                          <g transform={`rotate(${s.rotation || 0} ${s.cx} ${s.cy})`}>
                            {/* Rotation Handle */}
                            <line x1={s.cx} y1={s.cy - ((s as any).ry || (s as any).r)} x2={s.cx} y2={s.cy - ((s as any).ry || (s as any).r) - 20 / zoom} stroke="#3b82f6" strokeWidth={1 / zoom} />
                            <circle
                              cx={s.cx} cy={s.cy - ((s as any).ry || (s as any).r) - 20 / zoom} r={4 / zoom}
                              fill="white" stroke="#3b82f6" strokeWidth={1 / zoom}
                              style={{ cursor: 'crosshair' }}
                              data-id={s.id} data-handle="rot"
                            />
                            {[
                              { h: 'n', x: s.cx, y: s.cy - ((s as any).ry || (s as any).r) },
                              { h: 's', x: s.cx, y: s.cy + ((s as any).ry || (s as any).r) },
                              { h: 'e', x: s.cx + ((s as any).rx || (s as any).r), y: s.cy },
                              { h: 'w', x: s.cx - ((s as any).rx || (s as any).r), y: s.cy },
                            ].map(hand => (
                              <rect
                                key={hand.h}
                                x={hand.x - 4 / zoom} y={hand.y - 4 / zoom}
                                width={8 / zoom} height={8 / zoom}
                                fill="white" stroke="#3b82f6" strokeWidth={1 / zoom}
                                style={{ cursor: hand.h === 'n' || hand.h === 's' ? 'ns-resize' : 'ew-resize' }}
                                data-id={s.id} data-handle={hand.h}
                              />
                            ))}
                          </g>
                        )}
                      </g>
                    )}
                    {(s.type === 'line' || s.type === 'arrow') && (
                      <g className="pointer-events-auto transition-all duration-75">
                        <line
                          data-id={s.id}
                          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                          stroke={s.stroke} strokeWidth={s.strokeWidth}
                          className={`${selectedId === s.id ? 'stroke-blue-500' : ''}`}
                        />
                        {s.type === 'arrow' && (
                          <path
                            d={(() => {
                              const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
                              const size = 10 / zoom;
                              const ax1 = s.x2 - size * Math.cos(angle - Math.PI / 6);
                              const ay1 = s.y2 - size * Math.sin(angle - Math.PI / 6);
                              const ax2 = s.x2 - size * Math.cos(angle + Math.PI / 6);
                              const ay2 = s.y2 - size * Math.sin(angle + Math.PI / 6);
                              return `M ${ax1} ${ay1} L ${s.x2} ${s.y2} L ${ax2} ${ay2}`;
                            })()}
                            stroke={s.stroke} strokeWidth={s.strokeWidth} fill="none"
                          />
                        )}
                        {selectedId === s.id && (
                          <g>
                            <circle
                              cx={s.x1} cy={s.y1} r={8 / zoom}
                              fill="#3b82f6" stroke="white" strokeWidth={2 / zoom}
                              onMouseDown={(e) => { e.stopPropagation(); setDraggingLineNode({ lineId: s.id, point: 'start' }); setIsDragging(true); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <circle
                              cx={s.x2} cy={s.y2} r={8 / zoom}
                              fill="#3b82f6" stroke="white" strokeWidth={2 / zoom}
                              onMouseDown={(e) => { e.stopPropagation(); setDraggingLineNode({ lineId: s.id, point: 'end' }); setIsDragging(true); }}
                              style={{ cursor: 'pointer' }}
                            />
                          </g>
                        )}
                      </g>
                    )}
                    {s.type === 'curve' && (
                      <g className="pointer-events-auto transition-all duration-75">
                        <path
                          data-id={s.id}
                          d={`M ${s.x1} ${s.y1} Q ${s.qx} ${s.qy} ${s.x2} ${s.y2}`}
                          stroke={s.stroke} strokeWidth={s.strokeWidth} fill="none"
                          className={`${selectedId === s.id ? 'stroke-blue-500' : ''}`}
                        />
                        {selectedId === s.id && (
                          <g>
                            <circle
                              cx={s.x1} cy={s.y1} r={8 / zoom}
                              fill="#3b82f6" stroke="white" strokeWidth={2 / zoom}
                              onMouseDown={(e) => { e.stopPropagation(); setDraggingLineNode({ lineId: s.id, point: 'start' }); setIsDragging(true); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <circle
                              cx={s.qx} cy={s.qy} r={8 / zoom}
                              fill="#f59e0b" stroke="white" strokeWidth={2 / zoom}
                              onMouseDown={(e) => { e.stopPropagation(); setDraggingLineNode({ lineId: s.id, point: 'control' }); setIsDragging(true); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <circle
                              cx={s.x2} cy={s.y2} r={8 / zoom}
                              fill="#3b82f6" stroke="white" strokeWidth={2 / zoom}
                              onMouseDown={(e) => { e.stopPropagation(); setDraggingLineNode({ lineId: s.id, point: 'end' }); setIsDragging(true); }}
                              style={{ cursor: 'pointer' }}
                            />
                          </g>
                        )}
                      </g>
                    )}
                    {s.type === 'text' && (
                      <text
                        data-id={s.id}
                        x={s.x}
                        y={s.y}
                        fill={s.stroke}
                        fontSize={s.fontSize}
                        fontFamily="Arial"
                        className={`select-none transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'fill-blue-500 underline decoration-blue-200' : ''}`}
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
                      <ellipse
                        cx={currentShape.cx}
                        cy={currentShape.cy}
                        rx={(currentShape as any).rx}
                        ry={(currentShape as any).ry}
                        stroke="#3b82f6"
                        strokeWidth={2 / zoom}
                        fill="rgba(59, 130, 246, 0.1)"
                        strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                      />
                    )}
                    {currentShape.type === 'line' && (
                      <line
                        x1={currentShape.x1}
                        y1={currentShape.y1}
                        x2={currentShape.x2}
                        y2={currentShape.y2}
                        stroke="#3b82f6"
                        strokeWidth={2 / zoom}
                        strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                      />
                    )}
                  </>
                )}
              </g>
            </svg>

            {/* Floating Tooltips / Hint */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <div className="bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] text-slate-500 shadow-sm flex items-center gap-2">
                <span className="flex items-center gap-1"><kbd className="bg-slate-100 px-1 border rounded">G</kbd> Grilla: {showGrid ? 'ON' : 'OFF'}</span>
                <span className="flex items-center gap-1"><kbd className="bg-slate-100 px-1 border rounded">S</kbd> Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex flex-col bg-white border-l border-slate-200 shadow-lg overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {selectedId ? (
                <PropertyPanel selectedShape={selectedShape} onUpdate={updateShape} />
              ) : (
                <div className="p-4 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Zoom</h3>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-bold">VER 1.1</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50">-</button>
                      <span className="flex-1 text-center font-bold text-slate-700 text-xs">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50">+</button>
                      <button onClick={() => setZoom(1)} className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700">100%</button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-4">Lienzo</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Mostrar Grilla</span>
                        <button
                          onClick={() => setShowGrid(!showGrid)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${showGrid ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showGrid ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Ajuste Magnético</span>
                        <button
                          onClick={() => setSnapToGrid(!snapToGrid)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${snapToGrid ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${snapToGrid ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider mb-4">Ejes y Origen</h3>
                    <button
                      onClick={() => {
                        if (shapes.length === 0) return;
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        shapes.forEach(s => {
                          if (s.type === 'rect') { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height); }
                          else if (s.type === 'circle') {
                            const el = s as any;
                            const rx = el.rx || el.r || 0;
                            const ry = el.ry || el.r || 0;
                            minX = Math.min(minX, s.cx - rx); minY = Math.min(minY, s.cy - ry);
                            maxX = Math.max(maxX, s.cx + rx); maxY = Math.max(maxY, s.cy + ry);
                          }
                          else if (s.type === 'line' || s.type === 'arrow') { minX = Math.min(minX, (s as any).x1, (s as any).x2); minY = Math.min(minY, (s as any).y1, (s as any).y2); maxX = Math.max(maxX, (s as any).x1, (s as any).x2); maxY = Math.max(maxY, (s as any).y1, (s as any).y2); }
                          else if (s.type === 'curve') { minX = Math.min(minX, (s as any).x1, (s as any).x2, (s as any).qx); minY = Math.min(minY, (s as any).y1, (s as any).y2, (s as any).qy); maxX = Math.max(maxX, (s as any).x1, (s as any).x2, (s as any).qx); maxY = Math.max(maxY, (s as any).y1, (s as any).y2, (s as any).qy); }
                          else if (s.type === 'text') { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x + 100); maxY = Math.max(maxY, s.y + 20); }
                        });
                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        const dx = -centerX;
                        const dy = -centerY;
                        setShapes(prev => prev.map(s => {
                          if (s.type === 'rect') return { ...s, x: s.x + dx, y: s.y + dy };
                          if (s.type === 'circle') return { ...s, cx: s.cx + dx, cy: s.cy + dy };
                          if (s.type === 'text') return { ...s, x: s.x + dx, y: s.y + dy };
                          if (s.type === 'line' || s.type === 'arrow') return { ...s, x1: (s as any).x1 + dx, y1: (s as any).y1 + dy, x2: (s as any).x2 + dx, y2: (s as any).y2 + dy } as any;
                          if (s.type === 'curve') return { ...s, x1: (s as any).x1 + dx, y1: (s as any).y1 + dy, qx: (s as any).qx + dx, qy: (s as any).qy + dy, x2: (s as any).x2 + dx, y2: (s as any).y2 + dy } as any;
                          return s;
                        }));
                        setOrigin({ x: 0, y: 0 });
                      }}
                      className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 shadow-sm transition-all"
                    >
                      Re-centrar Dibujo al (0,0)
                    </button>
                    <p className="mt-2 text-[10px] text-slate-400 italic">
                      Mueve todo tu dibujo para que el centro sea el (0,0).
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      <b>Tip:</b> Usa la grilla para mantener proporciones estándar en simbología eléctrica.
                      Los componentes suelen diseñarse en múltiplos de {GRID_SIZE}px.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <ExportView shapes={shapes} canvasSize={canvasSize} origin={origin} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
