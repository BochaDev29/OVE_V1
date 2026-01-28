import React, { useState } from 'react';
import { X, Edit2 } from 'lucide-react';
import type { BudgetLineItem, BudgetUnit } from '../../types/budget';

interface BudgetItemEditModalProps {
    item: BudgetLineItem;
    onSave: (updatedItem: BudgetLineItem) => void;
    onCancel: () => void;
}

export const BudgetItemEditModal: React.FC<BudgetItemEditModalProps> = ({
    item,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState<BudgetLineItem>({ ...item });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.concept.trim()) {
            newErrors.concept = 'El concepto es requerido';
        }

        if (formData.quantity <= 0) {
            newErrors.quantity = 'La cantidad debe ser mayor a 0';
        }

        // Si no usa etapas, validar precio unitario
        if (!formData.include_canalizacion && !formData.include_instalacion) {
            if (formData.unit_price < 0) {
                newErrors.unit_price = 'El precio debe ser mayor o igual a 0';
            }
        } else {
            // Si usa etapas, al menos una debe estar marcada
            if (!formData.include_canalizacion && !formData.include_instalacion) {
                newErrors.etapas = 'Debe seleccionar al menos una etapa';
            }
            // Validar precios de etapas marcadas
            if (formData.include_canalizacion && (formData.price_canalizacion || 0) < 0) {
                newErrors.price_canalizacion = 'El precio debe ser mayor o igual a 0';
            }
            if (formData.include_instalacion && (formData.price_instalacion || 0) < 0) {
                newErrors.price_instalacion = 'El precio debe ser mayor o igual a 0';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            // Recalcular subtotal según etapas
            let calculatedSubtotal = 0;

            if (formData.include_canalizacion || formData.include_instalacion) {
                // Modo etapas
                const priceCan = formData.include_canalizacion ? (formData.price_canalizacion || 0) : 0;
                const priceInst = formData.include_instalacion ? (formData.price_instalacion || 0) : 0;
                calculatedSubtotal = formData.quantity * (priceCan + priceInst);
            } else {
                // Modo tradicional
                calculatedSubtotal = formData.quantity * formData.unit_price;
            }

            const updatedItem = {
                ...formData,
                subtotal: calculatedSubtotal
            };
            onSave(updatedItem);
        }
    };

    // Calcular subtotal para preview
    const calculateSubtotal = () => {
        if (formData.include_canalizacion || formData.include_instalacion) {
            const priceCan = formData.include_canalizacion ? (formData.price_canalizacion || 0) : 0;
            const priceInst = formData.include_instalacion ? (formData.price_instalacion || 0) : 0;
            return formData.quantity * (priceCan + priceInst);
        }
        return formData.quantity * formData.unit_price;
    };

    const subtotal = calculateSubtotal();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-900">Editar Item</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-slate-100 rounded-full"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Concepto */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Concepto *
                        </label>
                        <input
                            type="text"
                            value={formData.concept}
                            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg ${errors.concept ? 'border-red-500' : 'border-slate-300'
                                }`}
                            placeholder="Nombre del item"
                        />
                        {errors.concept && (
                            <p className="text-xs text-red-500 mt-1">{errors.concept}</p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            rows={2}
                            placeholder="Descripción adicional"
                        />
                    </div>

                    {/* Cantidad y Unidad */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cantidad *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                className={`w-full px-3 py-2 border rounded-lg ${errors.quantity ? 'border-red-500' : 'border-slate-300'
                                    }`}
                            />
                            {errors.quantity && (
                                <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Unidad
                            </label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value as BudgetUnit })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            >
                                <option value="unidad">Unidad</option>
                                <option value="metro">Metro</option>
                                <option value="global">Global</option>
                            </select>
                        </div>
                    </div>

                    {/* NUEVO: Etapas de Obra */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Etapas de Obra (Opcional)</h4>
                        <p className="text-xs text-slate-500 mb-3">
                            Diferencia canalización (obra gruesa) vs instalación (obra fina). Si no marcas ninguna, se usa el precio unitario tradicional.
                        </p>

                        {/* Canalización */}
                        <div className="mb-3">
                            <label className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={formData.include_canalizacion || false}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        include_canalizacion: e.target.checked,
                                        price_canalizacion: e.target.checked ? (formData.price_canalizacion || 0) : undefined
                                    })}
                                    className="w-4 h-4 text-orange-600 rounded"
                                />
                                <span className="text-sm font-medium text-slate-700">Incluir Canalización</span>
                                <span className="text-xs text-slate-500">(picar pared, cañerías, cajas)</span>
                            </label>
                            {formData.include_canalizacion && (
                                <div className="ml-6">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Precio Canalización (por {formData.unit})
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.price_canalizacion || 0}
                                            onChange={(e) => setFormData({ ...formData, price_canalizacion: parseFloat(e.target.value) || 0 })}
                                            className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm ${errors.price_canalizacion ? 'border-red-500' : 'border-orange-300'}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.price_canalizacion && (
                                        <p className="text-xs text-red-500 mt-1">{errors.price_canalizacion}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Instalación */}
                        <div>
                            <label className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={formData.include_instalacion || false}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        include_instalacion: e.target.checked,
                                        price_instalacion: e.target.checked ? (formData.price_instalacion || 0) : undefined
                                    })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-slate-700">Incluir Instalación</span>
                                <span className="text-xs text-slate-500">(cables, artefactos, conexiones)</span>
                            </label>
                            {formData.include_instalacion && (
                                <div className="ml-6">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Precio Instalación (por {formData.unit})
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.price_instalacion || 0}
                                            onChange={(e) => setFormData({ ...formData, price_instalacion: parseFloat(e.target.value) || 0 })}
                                            className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm ${errors.price_instalacion ? 'border-red-500' : 'border-blue-300'}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.price_instalacion && (
                                        <p className="text-xs text-red-500 mt-1">{errors.price_instalacion}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {errors.etapas && (
                            <p className="text-xs text-red-500 mt-2">{errors.etapas}</p>
                        )}
                    </div>

                    {/* Precio Unitario (solo si no usa etapas) */}
                    {!formData.include_canalizacion && !formData.include_instalacion && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Precio Unitario *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                                    className={`w-full pl-8 pr-3 py-2 border rounded-lg ${errors.unit_price ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.unit_price && (
                                <p className="text-xs text-red-500 mt-1">{errors.unit_price}</p>
                            )}
                        </div>
                    )}

                    {/* Subtotal Calculado */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-900">Subtotal:</span>
                            <span className="text-lg font-bold text-blue-900">
                                $ {subtotal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
