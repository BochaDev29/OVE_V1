import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { BudgetService } from '../../services/budget.service';
import { BudgetItemForm } from './BudgetItemForm';
import type { BudgetItem, BudgetCategory, CreateBudgetItemInput } from '../../types/budget';
import { useAuth } from '../../contexts/AuthContext';

interface BudgetItemsConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BudgetItemsConfigModal: React.FC<BudgetItemsConfigModalProps> = ({
    isOpen,
    onClose
}) => {
    const { user } = useAuth();
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<BudgetItem | undefined>();
    const [multiplier, setMultiplier] = useState<string>('');
    const [applyingMultiplier, setApplyingMultiplier] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            loadItems();
        }
    }, [isOpen, user]);

    const loadItems = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const data = await BudgetService.getUserBudgetItems(user.id);
            setItems(data);
        } catch (error) {
            console.error('Error loading budget items:', error);
            alert('Error al cargar items de presupuesto');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async (input: CreateBudgetItemInput) => {
        if (!user) return;

        try {
            if (editingItem) {
                await BudgetService.updateBudgetItem(editingItem.id, input);
            } else {
                await BudgetService.createBudgetItem(user.id, input);
            }

            await loadItems();
            setShowForm(false);
            setEditingItem(undefined);
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error al guardar item');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('¿Estás seguro de eliminar este item?')) return;

        try {
            await BudgetService.deleteBudgetItem(itemId);
            await loadItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al eliminar item');
        }
    };

    const handleApplyMultiplier = async () => {
        if (!user) return;

        const percentage = parseFloat(multiplier);
        if (isNaN(percentage)) {
            alert('Ingrese un porcentaje válido');
            return;
        }

        if (!confirm(`¿Aplicar ${percentage > 0 ? '+' : ''}${percentage}% a todos los precios?`)) {
            return;
        }

        try {
            setApplyingMultiplier(true);
            await BudgetService.applyPriceMultiplier(user.id, percentage);
            await loadItems();
            setMultiplier('');
            alert('Precios actualizados correctamente');
        } catch (error) {
            console.error('Error applying multiplier:', error);
            alert('Error al actualizar precios');
        } finally {
            setApplyingMultiplier(false);
        }
    };

    // Agrupar items por categoría
    const itemsByCategory = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<BudgetCategory, BudgetItem[]>);

    const categories = Object.keys(itemsByCategory) as BudgetCategory[];

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900">
                                ⚙️ Configuración de Items de Presupuesto
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-100 rounded-full"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">
                                Cargando items...
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Items por categoría */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-700">
                                            📊 Mis Items Personalizados
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setEditingItem(undefined);
                                                setShowForm(true);
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nuevo Item
                                        </button>
                                    </div>

                                    {categories.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                                            <p>No hay items configurados</p>
                                            <p className="text-sm mt-1">Crea tu primer item o inicializa la plantilla AEA</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {categories.map(category => (
                                                <div key={category} className="border rounded-lg overflow-hidden">
                                                    <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                                                        {category}
                                                    </div>
                                                    <div className="divide-y">
                                                        {itemsByCategory[category].map(item => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between p-3 hover:bg-slate-50"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-slate-900">
                                                                        {item.name}
                                                                    </div>
                                                                    {item.description && (
                                                                        <div className="text-sm text-slate-500">
                                                                            {item.description}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-sm text-slate-600 mt-1">
                                                                        <span className="font-mono">
                                                                            $ {item.unit_price.toFixed(2)}
                                                                        </span>
                                                                        <span className="text-slate-400 mx-2">•</span>
                                                                        <span>{item.unit}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingItem(item);
                                                                            setShowForm(true);
                                                                        }}
                                                                        className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteItem(item.id)}
                                                                        className="p-2 hover:bg-red-50 rounded text-red-600"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Multiplicador de actualización */}
                                {items.length > 0 && (
                                    <div className="border-t pt-6">
                                        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-orange-600" />
                                            Actualización Masiva de Precios
                                        </h3>
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                        Aplicar ajuste a todos los precios:
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={multiplier}
                                                            onChange={(e) => setMultiplier(e.target.value)}
                                                            className="w-32 px-3 py-2 border border-slate-300 rounded-lg"
                                                            placeholder="10"
                                                        />
                                                        <span className="text-slate-700">%</span>
                                                        <button
                                                            onClick={handleApplyMultiplier}
                                                            disabled={!multiplier || applyingMultiplier}
                                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {applyingMultiplier ? 'Aplicando...' : 'Aplicar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2 text-sm text-orange-700">
                                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <p>
                                                    Esto actualizará todos los precios. Ejemplo: +10% aumenta $100 a $110, -5% reduce $100 a $95.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-slate-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <BudgetItemForm
                    item={editingItem}
                    onSave={handleSaveItem}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingItem(undefined);
                    }}
                />
            )}
        </>
    );
};
