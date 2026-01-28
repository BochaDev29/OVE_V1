import { useState } from 'react';
import type { Floor, PaperFormat } from '../../types/floors';
import { PAPER_FORMATS } from '../../types/floors';

interface EditFloorModalProps {
    floor: Floor;
    onClose: () => void;
    onConfirm: (name: string, format: PaperFormat) => void;
}

export const EditFloorModal = ({ floor, onClose, onConfirm }: EditFloorModalProps) => {
    const [name, setName] = useState(floor.name);
    const currentFormatKey = `${floor.format.name}-${floor.format.orientation}`;
    const [formatKey, setFormatKey] = useState(currentFormatKey);

    const handleConfirm = () => {
        if (!name.trim()) {
            alert('Por favor ingresa un nombre para la planta');
            return;
        }
        onConfirm(name, PAPER_FORMATS[formatKey]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h2 className="text-xl font-bold mb-4">Editar Planta</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Planta Alta"
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Formato</label>
                        <select
                            value={formatKey}
                            onChange={(e) => setFormatKey(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="A4-landscape">A4 Horizontal (297 × 210 mm)</option>
                            <option value="A4-portrait">A4 Vertical (210 × 297 mm)</option>
                            <option value="A3-landscape">A3 Horizontal (420 × 297 mm)</option>
                            <option value="A3-portrait">A3 Vertical (297 × 420 mm)</option>
                            <option value="Letter-landscape">Carta Horizontal (279 × 216 mm)</option>
                            <option value="Letter-portrait">Carta Vertical (216 × 279 mm)</option>
                        </select>
                    </div>

                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <strong>Tamaño:</strong> {PAPER_FORMATS[formatKey].widthMm} × {PAPER_FORMATS[formatKey].heightMm} mm
                        <br />
                        <strong>Píxeles:</strong> {PAPER_FORMATS[formatKey].widthPx} × {PAPER_FORMATS[formatKey].heightPx} px
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={!name.trim()}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
