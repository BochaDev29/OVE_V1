
import React from 'react';
import { MousePointer2, Square, Circle, Minus, Type, Trash2, Download, Copy, RotateCcw } from 'lucide-react';
import { ShapeType } from '../types';

interface ToolbarProps {
  activeTool: ShapeType;
  setActiveTool: (tool: ShapeType) => void;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear, onUndo, canUndo }) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Seleccionar (V)' },
    { id: 'rect', icon: Square, label: 'Rectángulo (R)' },
    { id: 'circle', icon: Circle, label: 'Círculo (C)' },
    { id: 'line', icon: Minus, label: 'Línea (L)' },
    { id: 'text', icon: Type, label: 'Texto (T)' },
  ];

  return (
    <div className="flex flex-col gap-2 p-2 bg-white border-r border-slate-200 h-full shadow-sm z-10">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id as ShapeType)}
          title={tool.label}
          className={`p-3 rounded-lg transition-all duration-200 ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <tool.icon size={20} />
        </button>
      ))}

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4">
        <button
          disabled={!canUndo}
          onClick={onUndo}
          title="Deshacer (Ctrl+Z)"
          className={`p-3 rounded-lg transition-all duration-200 ${
            canUndo ? 'hover:bg-slate-100 text-slate-600' : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={onClear}
          title="Limpiar Canvas"
          className="p-3 rounded-lg hover:bg-red-50 text-red-500 transition-all duration-200"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
