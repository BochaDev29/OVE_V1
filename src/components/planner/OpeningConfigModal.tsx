import { useState } from 'react';
import { X } from 'lucide-react';
import { DOOR_WIDTHS, WINDOW_SIZES, DEFAULT_SILL_HEIGHT } from '../../types/openings';

interface OpeningConfigModalProps {
    type: 'door' | 'window';
    onClose: () => void;
    onConfirm: (config: DoorConfig | WindowConfig) => void;
}

export interface DoorConfig {
    type: 'door';
    width: number;
    doorSwing: 'left' | 'right';
}

export interface WindowConfig {
    type: 'window';
    width: number;
    height: number;
    sillHeight: number;
}

export const OpeningConfigModal = ({ type, onClose, onConfirm }: OpeningConfigModalProps) => {
    // Estados para puerta
    const [doorWidth, setDoorWidth] = useState(0.80);
    const [doorSwing, setDoorSwing] = useState<'left' | 'right'>('right');

    // Estados para ventana
    const [windowWidth, setWindowWidth] = useState(1.00);
    const [windowHeight, setWindowHeight] = useState(1.20);
    const [sillHeight, setSillHeight] = useState(DEFAULT_SILL_HEIGHT);

    const handleConfirm = () => {
        if (type === 'door') {
            onConfirm({
                type: 'door',
                width: doorWidth,
                doorSwing
            });
        } else {
            onConfirm({
                type: 'window',
                width: windowWidth,
                height: windowHeight,
                sillHeight
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {type === 'door' ? '🚪 Configurar Puerta' : '🪟 Configurar Ventana'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Configuración de Puerta */}
                {type === 'door' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Ancho</label>
                            <select
                                value={doorWidth}
                                onChange={(e) => setDoorWidth(parseFloat(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {DOOR_WIDTHS.map(({ label, value }) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Sentido de Apertura</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDoorSwing('left')}
                                    className={`flex-1 px-4 py-2 border rounded transition-colors ${doorSwing === 'left'
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    ◀ Izquierda
                                </button>
                                <button
                                    onClick={() => setDoorSwing('right')}
                                    className={`flex-1 px-4 py-2 border rounded transition-colors ${doorSwing === 'right'
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Derecha ▶
                                </button>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Altura:</strong> 2.00m (estándar)
                        </div>
                    </div>
                )}

                {/* Configuración de Ventana */}
                {type === 'window' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Dimensiones</label>
                            <select
                                value={`${windowWidth}-${windowHeight}`}
                                onChange={(e) => {
                                    const [w, h] = e.target.value.split('-').map(parseFloat);
                                    setWindowWidth(w);
                                    setWindowHeight(h);
                                }}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {WINDOW_SIZES.map(({ label, width, height }) => (
                                    <option key={`${width}-${height}`} value={`${width}-${height}`}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Altura del Alféizar (desde el piso)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={sillHeight}
                                    onChange={(e) => setSillHeight(parseFloat(e.target.value))}
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">m</span>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Ancho:</strong> {windowWidth}m<br />
                            <strong>Alto:</strong> {windowHeight}m<br />
                            <strong>Alféizar:</strong> {sillHeight}m
                        </div>
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};
