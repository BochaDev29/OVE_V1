
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shape, ShapeType, Point, RectShape, CircleShape, LineShape, TextShape } from './types';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/PropertyPanel';
import ExportView from './components/ExportView';
import { v4 as uuidv4 } from 'uuid';

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

  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    return {
      x: snap(clientX - rect.left),
      y: snap(clientY - rect.top),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getPointFromEvent(e);
    
    if (activeTool === 'select') {
      const target = e.target as SVGElement;
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

    let newShape: Shape;
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
        newShape = { ...base, type: 'text', x: point.x, y: point.y, text: 'Click para editar', fontSize: 16 } as TextShape;
        break;
      default: return;
    }
    setCurrentShape(newShape);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing && !isDragging) return;
    const point = getPointFromEvent(e);

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
      let updated: Shape = { ...currentShape };
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
    setCurrentShape(null);
    setStartPoint(null);
  };

  const handleClear = () => {
    if (confirm('¿Limpiar todo el dibujo?')) {
      setHistory(prev => [...prev, [...shapes]]);
      setShapes([]);
      setSelectedId(null);
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
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden">
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative z-0"
        >
          {/* SVG Grid Definition */}
          <defs>
            <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
            <pattern id="grid" width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} patternUnits="userSpaceOnUse">
              <rect width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} fill="url(#smallGrid)"/>
              <path d={`M ${MAJOR_GRID_SIZE} 0 L 0 0 0 ${MAJOR_GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5"/>
            </pattern>
          </defs>

          {showGrid && (
            <rect width="100%" height="100%" fill="url(#grid)" />
          )}

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
                  className={`transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'stroke-blue-500' : ''}`}
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
                  className={`transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'stroke-blue-500' : ''}`}
                />
              )}
              {s.type === 'line' && (
                <line
                  data-id={s.id}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={s.stroke}
                  strokeWidth={s.strokeWidth}
                  className={`transition-all duration-75 pointer-events-auto ${selectedId === s.id ? 'stroke-blue-500' : ''}`}
                />
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
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                        <b>Tip:</b> Usa la grilla para mantener proporciones estándar en simbología eléctrica. 
                        Los componentes suelen diseñarse en múltiplos de {GRID_SIZE}px.
                    </p>
                </div>
             </div>
           )}
        </div>
        <ExportView shapes={shapes} canvasSize={canvasSize} />
      </div>
    </div>
  );
};

export default App;
