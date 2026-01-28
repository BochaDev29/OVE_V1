import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, TrendingUp } from 'lucide-react';
import type { BudgetItem, BudgetCategory, CreateBudgetItemInput } from '../../types/budget';

interface BudgetItemFormProps {
    item?: BudgetItem;
    onSave: (input: CreateBudgetItemInput) => void;
    onCancel: () => void;
}

const CATEGORIES: BudgetCategory[] = [
    'Eléctrico',
    'Cableado',
    'Cañería',
    'Tableros',
    'Protecciones',
    'Obra Civil',
    'Mano de Obra',
    'Otros'
];

const UNITS = ['unidad', 'metro', 'global'] as const;

export const BudgetItemForm: React.FC<BudgetItemFormProps> = ({
    item,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState<CreateBudgetItemInput>({
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || 'Eléctrico',
        unit: item?.unit || 'unidad',
        unit_price: item?.unit_price || 0
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        if (formData.unit_price < 0) {
            newErrors.unit_price = 'El precio debe ser mayor o igual a 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold text-slate-900">
                        {item ? 'Editar Item' : 'Nuevo Item'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-slate-100 rounded-full"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-slate-300'
                                }`}
                            placeholder="Ej: Cableado monofásico"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            rows={2}
                            placeholder="Descripción detallada del item"
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Categoría *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as BudgetCategory })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Unidad */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Unidad *
                        </label>
                        <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        >
                            {UNITS.map(unit => (
                                <option key={unit} value={unit}>
                                    {unit === 'unidad' ? 'Unidad' : unit === 'metro' ? 'Metro' : 'Global'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Precio */}
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
                                className={`w-full pl-8 pr-3 py-2 border rounded-lg ${errors.unit_price ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                placeholder="0.00"
                            />
                        </div>
                        {errors.unit_price && (
                            <p className="text-xs text-red-500 mt-1">{errors.unit_price}</p>
                        )}
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
                            {item ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
