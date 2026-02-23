import React, { useState, useEffect } from 'react';
import { Type, PaintBucket, Maximize } from 'lucide-react';

interface PropertiesPanelProps {
    selectedId: string | null;
    symbols: any[];
    onUpdateProperty: (id: string, property: string, value: any) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedId,
    symbols,
    onUpdateProperty
}) => {
    const [selectedSymbol, setSelectedSymbol] = useState<any | null>(null);

    useEffect(() => {
        if (selectedId) {
            const sym = symbols.find(s => s.id === selectedId);
            setSelectedSymbol(sym || null);
        } else {
            setSelectedSymbol(null);
        }
    }, [selectedId, symbols]);

    if (!selectedId || !selectedSymbol) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-center h-full">
                <Type className="w-8 h-8 opacity-20 mb-3" />
                <p className="text-xs font-medium">Selecciona un elemento en el lienzo para editar sus propiedades de dibujo</p>
            </div>
        );
    }

    const isShape = ['rect', 'circle', 'triangle', 'line', 'arrow'].includes(selectedSymbol.type);
    const isText = selectedSymbol.type === 'text' || selectedSymbol.type === 'label';

    return (
        <div className="flex flex-col gap-4 p-4 text-sm">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        PROPIEDADES
                    </h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                        {selectedSymbol.type}
                    </span>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-bold">EDICIÓN</span>
            </div>

            {isText && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Type className="w-3 h-3" /> Texto (Multi-línea)
                        </label>
                        <textarea
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                            value={selectedSymbol.label || ''}
                            onChange={(e) => onUpdateProperty(selectedId, 'label', e.target.value)}
                            placeholder="Escribe el texto aquí..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Maximize className="w-3 h-3" /> Tamaño de Fuente
                        </label>
                        <input
                            type="number"
                            min="8"
                            max="72"
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={selectedSymbol.fontSize || 12}
                            onChange={(e) => onUpdateProperty(selectedId, 'fontSize', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <PaintBucket className="w-3 h-3" /> Color {isText ? "del Texto" : "del Símbolo"}
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        value={selectedSymbol.color || '#000000'}
                        onChange={(e) => onUpdateProperty(selectedId, 'color', e.target.value)}
                    />
                    <span className="text-xs font-mono text-slate-600 uppercase">
                        {selectedSymbol.color || '#000000'}
                    </span>
                </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    <strong>Tip:</strong> Puedes escalar y rotar el elemento seleccionándolo y usando los tiradores directamente en el Plano de Diseño.
                </p>
            </div>
        </div>
    );
};
