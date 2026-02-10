
import React from 'react';
import { Shape } from '../types';

interface PropertyPanelProps {
  selectedShape: Shape | null;
  onUpdate: (updates: Partial<Shape>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedShape, onUpdate }) => {
  if (!selectedShape) {
    return (
      <div className="p-4 text-slate-400 italic text-sm text-center">
        Selecciona un elemento para editar sus propiedades
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Propiedades</h3>
      
      {/* Basic Styles */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Color de Trazo</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={selectedShape.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="h-8 w-12 rounded border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={selectedShape.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="text-xs flex-1 border border-slate-200 rounded px-2 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Grosor ({selectedShape.strokeWidth}px)</label>
          <input
            type="range"
            min="1"
            max="20"
            value={selectedShape.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {selectedShape.type !== 'line' && selectedShape.type !== 'text' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Color de Relleno</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={selectedShape.fill === 'none' ? '#ffffff' : selectedShape.fill}
                onChange={(e) => onUpdate({ fill: e.target.value })}
                className="h-8 w-12 rounded border border-slate-200 cursor-pointer"
              />
              <button
                onClick={() => onUpdate({ fill: selectedShape.fill === 'none' ? '#000000' : 'none' })}
                className={`text-xs px-2 border rounded transition-colors ${
                  selectedShape.fill === 'none' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200'
                }`}
              >
                {selectedShape.fill === 'none' ? 'Con Relleno' : 'Sin Relleno'}
              </button>
            </div>
          </div>
        )}

        {selectedShape.type === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contenido</label>
              <textarea
                value={selectedShape.text}
                onChange={(e) => onUpdate({ text: e.target.value } as any)}
                className="w-full text-sm border border-slate-200 rounded p-2 min-h-[60px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tamaño Fuente</label>
              <input
                type="number"
                value={selectedShape.fontSize}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) } as any)}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Geometry for fine-tuning */}
      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">Posición</h4>
        <div className="grid grid-cols-2 gap-2">
           {selectedShape.type === 'rect' && (
             <>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">X</label>
                 <input type="number" value={Math.round(selectedShape.x)} onChange={e => onUpdate({x: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Y</label>
                 <input type="number" value={Math.round(selectedShape.y)} onChange={e => onUpdate({y: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Ancho</label>
                 <input type="number" value={Math.round(selectedShape.width)} onChange={e => onUpdate({width: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Alto</label>
                 <input type="number" value={Math.round(selectedShape.height)} onChange={e => onUpdate({height: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
             </>
           )}
           {selectedShape.type === 'circle' && (
             <>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">CX</label>
                 <input type="number" value={Math.round(selectedShape.cx)} onChange={e => onUpdate({cx: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">CY</label>
                 <input type="number" value={Math.round(selectedShape.cy)} onChange={e => onUpdate({cy: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Radio</label>
                 <input type="number" value={Math.round(selectedShape.r)} onChange={e => onUpdate({r: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
             </>
           )}
           {selectedShape.type === 'line' && (
             <>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">X1</label>
                 <input type="number" value={Math.round(selectedShape.x1)} onChange={e => onUpdate({x1: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Y1</label>
                 <input type="number" value={Math.round(selectedShape.y1)} onChange={e => onUpdate({y1: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">X2</label>
                 <input type="number" value={Math.round(selectedShape.x2)} onChange={e => onUpdate({x2: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] text-slate-400">Y2</label>
                 <input type="number" value={Math.round(selectedShape.y2)} onChange={e => onUpdate({y2: parseInt(e.target.value)} as any)} className="w-full text-xs border rounded px-1 py-1" />
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
