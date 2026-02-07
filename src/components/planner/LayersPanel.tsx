import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus } from 'lucide-react';
import type { Layer } from '../../types/planner';

interface LayersPanelProps {
    layers: Layer[];
    currentLayerId: string;
    onLayerChange: (layerId: string) => void;
    onToggleVisibility: (layerId: string) => void;
    onToggleLock: (layerId: string) => void;
    onColorChange: (layerId: string, color: string) => void;
    onAddLayer?: () => void;
}

export const LayersPanel = ({
    layers,
    currentLayerId,
    onLayerChange,
    onToggleVisibility,
    onToggleLock,
    onColorChange,
    onAddLayer
}: LayersPanelProps) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="w-full flex flex-col">
            {/* Header */}
            <div
                className="p-3 bg-gray-100 font-semibold flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>🎨 CAPAS</span>
                <span className="text-sm">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Layers List */}
            {isOpen && (
                <div className="p-2 space-y-1 overflow-y-auto flex-1">
                    {layers.map(layer => (
                        <div
                            key={layer.id}
                            className={`p-2 rounded flex items-center gap-2 cursor-pointer transition-colors ${currentLayerId === layer.id
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'hover:bg-gray-100 border-2 border-transparent'
                                }`}
                            onClick={() => onLayerChange(layer.id)}
                        >
                            {/* Visibility Toggle */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisibility(layer.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                            >
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} className="text-gray-400" />}
                            </button>

                            {/* Lock Toggle */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLock(layer.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title={layer.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                            >
                                {layer.locked ? <Lock size={16} className="text-red-500" /> : <Unlock size={16} />}
                            </button>

                            {/* Layer Name */}
                            <span className="flex-1 text-sm font-medium truncate">{layer.name}</span>



                            {/* Color Picker */}
                            <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onColorChange(layer.id, e.target.value);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                                onClick={(e) => e.stopPropagation()}
                                title="Cambiar color de capa"
                            />

                            {/* Active Indicator */}
                            {currentLayerId === layer.id && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-medium">
                                    Activa
                                </span>
                            )}
                        </div>
                    ))}

                    {/* Add Layer Button */}
                    {onAddLayer && (
                        <button
                            onClick={onAddLayer}
                            className="w-full p-2 mt-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus size={16} />
                            <span className="text-sm font-medium">Nueva Capa</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
