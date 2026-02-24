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
    const [localText, setLocalText] = useState<string>('');
    const prevSelectedId = React.useRef<string | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (selectedId) {
            const sym = symbols.find(s => s.id === selectedId);
            setSelectedSymbol(sym || null);

            // Sincronizar el texto local SOLO al cambiar de símbolo seleccionado
            // Esto evita que actualizaciones ascendentes (re-renders del Canvas) roben el cursor en el textarea
            if (selectedId !== prevSelectedId.current) {
                setLocalText(sym?.label || '');
                prevSelectedId.current = selectedId;
            }
        } else {
            setSelectedSymbol(null);
            setLocalText('');
            prevSelectedId.current = null;
        }
    }, [selectedId, symbols]);

    // Manejador central para cambiar textos sin perder foco
    const handleTextChange = (newText: string) => {
        setLocalText(newText);
        // Pequeño debounce o propagación directa (si Konva aguanta)
        if (selectedId) {
            onUpdateProperty(selectedId, 'label', newText);
        }
    };

    const handleInsertSymbol = (symbol: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const textBefore = localText.substring(0, start);
            const textAfter = localText.substring(end);

            const newText = textBefore + symbol + textAfter;
            handleTextChange(newText);

            // Forzar el foco y la posición del cursor un milisegundo después
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start + symbol.length, start + symbol.length);
                }
            }, 10);
        } else {
            handleTextChange(localText + symbol);
        }
    };

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
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Type className="w-3 h-3" /> Texto (Multi-línea)
                            </label>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleInsertSymbol('Ø')}
                                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs"
                                    title="Insertar Diámetro"
                                >Ø</button>
                                <button
                                    onClick={() => handleInsertSymbol('Ω')}
                                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs"
                                    title="Insertar Ohm"
                                >Ω</button>
                                <button
                                    onClick={() => handleInsertSymbol('²')}
                                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs"
                                    title="Insertar Cuadrado"
                                >²</button>
                            </div>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                            value={localText}
                            onChange={(e) => handleTextChange(e.target.value)}
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
