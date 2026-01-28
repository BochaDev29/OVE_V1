import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileService, type UserProfile } from '../../services/profile.service';
import { BudgetService } from '../../services/budget.service';
import { BudgetItemEditModal } from './BudgetItemEditModal';
import { exportBudgetToPDF, exportBudgetToExcel } from '../../lib/budget/budgetExport';
import type { BudgetLineItem, GeneratedBudget, TaxStatus } from '../../types/budget';
import { supabase } from '../../lib/supabase';

interface BudgetEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'from_compute' | 'flash'; // NUEVO: Modo de presupuesto
    projectId?: string;
    initialItems?: BudgetLineItem[]; // Ahora opcional para modo flash
    projectName?: string;
    clientName?: string;
    street?: string;
    number?: string;
    city?: string;
    province?: string;
}

export const BudgetEditorModal: React.FC<BudgetEditorModalProps> = ({
    isOpen,
    onClose,
    mode = 'from_compute', // Default: desde cómputo
    projectId,
    initialItems = [], // Default: array vacío
    projectName,
    clientName,
    street,
    number,
    city,
    province
}) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [items, setItems] = useState<BudgetLineItem[]>(initialItems);
    const [editingItem, setEditingItem] = useState<BudgetLineItem | null>(null);
    const [markupPercentage, setMarkupPercentage] = useState(15);
    const [vatPercentage, setVatPercentage] = useState(21);
    const [validityDays, setValidityDays] = useState(5);
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            loadProfile();
            loadBudgetData();
        }
    }, [isOpen, user, projectId]);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const loadProfile = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const data = await ProfileService.getProfile(user.id);
            setProfile(data);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBudgetData = async () => {
        if (!projectId) return;

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('documentation_data')
                .eq('id', projectId)
                .single();

            if (error) throw error;

            if (data?.documentation_data?.budget) {
                const budgetData = data.documentation_data.budget;
                setItems(budgetData.items || []);
                setMarkupPercentage(budgetData.markup_percentage || 15);
                setVatPercentage(budgetData.vat_percentage || 21);
                setValidityDays(budgetData.validity_days || 5);
                setAdditionalNotes(budgetData.additional_notes || '');
                console.log('✅ Budget data cargado:', budgetData);
            }
        } catch (error) {
            console.error('Error loading budget data:', error);
        }
    };

    const saveBudgetData = async () => {
        if (!projectId) return;

        try {
            // Primero obtener documentation_data actual
            const { data: currentData } = await supabase
                .from('projects')
                .select('documentation_data')
                .eq('id', projectId)
                .single();

            const budgetData = {
                items,
                markup_percentage: markupPercentage,
                vat_percentage: vatPercentage,
                validity_days: validityDays,
                additional_notes: additionalNotes
            };

            // Merge con documentation_data existente
            const updatedDocData = {
                ...(currentData?.documentation_data || {}),
                budget: budgetData
            };

            const { error } = await supabase
                .from('projects')
                .update({ documentation_data: updatedDocData })
                .eq('id', projectId);

            if (error) throw error;
            console.log('💾 Budget data guardado');
        } catch (error) {
            console.error('Error saving budget data:', error);
        }
    };

    // Auto-guardar cuando cambian los items o configuración
    useEffect(() => {
        if (isOpen && items.length >= 0) {
            const timeoutId = setTimeout(() => {
                saveBudgetData();
            }, 1000); // Debounce de 1 segundo

            return () => clearTimeout(timeoutId);
        }
    }, [items, markupPercentage, vatPercentage, validityDays, additionalNotes]);

    // Obtener tax_status del perfil
    const taxStatus: TaxStatus = profile?.tax_status || 'particular';

    // Calcular totales
    const totals = BudgetService.calculateBudgetTotals(
        items,
        markupPercentage,
        // Si es Monotributista o Particular, IVA = 0 (ya está incluido o no aplica)
        taxStatus === 'responsable_inscripto' ? vatPercentage : 0
    );

    const handleSaveItem = (updatedItem: BudgetLineItem) => {
        setItems(items.map(item =>
            item.id === updatedItem.id ? updatedItem : item
        ));
        setEditingItem(null);
    };

    const handleDeleteItem = (itemId: string) => {
        if (!confirm('¿Eliminar este item del presupuesto?')) return;
        setItems(items.filter(item => item.id !== itemId));
    };

    const handleAddManualItem = () => {
        const newItem: BudgetLineItem = {
            id: `manual-${Date.now()}`,
            concept: 'Nuevo Item',
            quantity: 1,
            unit: 'unidad',
            unit_price: 0,
            subtotal: 0,
            source: 'manual'
        };
        setItems([...items, newItem]);
        setEditingItem(newItem);
    };

    const handleExportPDF = () => {
        if (!profile) {
            alert('Error: No se pudo cargar el perfil de usuario');
            return;
        }

        exportBudgetToPDF(
            {
                items,
                subtotal: totals.subtotal,
                markup_percentage: markupPercentage,
                markup_amount: totals.markup_amount,
                vat_percentage: vatPercentage,
                vat_amount: totals.vat_amount,
                total: totals.total,
                validity_days: validityDays,
                additional_notes: additionalNotes
            },
            profile,
            {
                projectName,
                clientName,
                street,
                number,
                city,
                province
            }
        );
    };

    const handleExportExcel = () => {
        if (!profile) {
            alert('Error: No se pudo cargar el perfil de usuario');
            return;
        }

        exportBudgetToExcel(
            {
                items,
                subtotal: totals.subtotal,
                markup_percentage: markupPercentage,
                markup_amount: totals.markup_amount,
                vat_percentage: vatPercentage,
                vat_amount: totals.vat_amount,
                total: totals.total,
                validity_days: validityDays
            },
            profile,
            {
                projectName,
                clientName
            }
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className={`flex items-center justify-between p-4 border-b ${mode === 'flash' ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gradient-to-r from-green-50 to-blue-50'}`}>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {mode === 'flash' ? '⚡ Presupuesto Flash' : '💰 Presupuesto - Editar antes de Exportar'}
                            </h2>
                            {mode === 'flash' ? (
                                <p className="text-sm text-slate-600 mt-1">
                                    Presupuesto rápido para trabajos simples
                                </p>
                            ) : (
                                projectName && (
                                    <p className="text-sm text-slate-600 mt-1">
                                        Proyecto: {projectName} {clientName && `• Cliente: ${clientName}`}
                                    </p>
                                )
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white rounded-full"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-slate-500">Cargando configuración...</p>
                        </div>
                    ) : (
                        <>
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    {/* Info del perfil fiscal */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-sm text-blue-900">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>
                                                <strong>Perfil Fiscal:</strong>{' '}
                                                {taxStatus === 'responsable_inscripto' && 'Responsable Inscripto (IVA desglosado)'}
                                                {taxStatus === 'monotributista' && 'Monotributista (IVA incluido)'}
                                                {taxStatus === 'particular' && 'Particular (sin datos fiscales)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tabla de items */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-slate-700">Items del Presupuesto</h3>
                                            <button
                                                onClick={handleAddManualItem}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Agregar Item Manual
                                            </button>
                                        </div>

                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Concepto</th>
                                                        <th className="px-4 py-2 text-center text-sm font-semibold text-slate-700">Cant.</th>
                                                        <th className="px-4 py-2 text-center text-sm font-semibold text-slate-700">U.</th>
                                                        <th className="px-4 py-2 text-right text-sm font-semibold text-orange-700">Canal.</th>
                                                        <th className="px-4 py-2 text-right text-sm font-semibold text-blue-700">Inst.</th>
                                                        <th className="px-4 py-2 text-right text-sm font-semibold text-slate-700">Subtotal</th>
                                                        <th className="px-4 py-2 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                                {mode === 'flash'
                                                                    ? 'Click en "Agregar Item Manual" para comenzar'
                                                                    : 'No hay items en el presupuesto'
                                                                }
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        items.map(item => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-slate-900">{item.concept}</div>
                                                                    {item.description && (
                                                                        <div className="text-xs text-slate-500">{item.description}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-center text-slate-600 text-sm">{item.unit}</td>

                                                                {/* Canalización */}
                                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                                    {item.include_canalizacion ? (
                                                                        <span className="text-orange-700">$ {item.price_canalizacion?.toFixed(2)}</span>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </td>

                                                                {/* Instalación */}
                                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                                    {item.include_instalacion ? (
                                                                        <span className="text-blue-700">$ {item.price_instalacion?.toFixed(2)}</span>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                                                                    $ {item.subtotal.toFixed(2)}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => setEditingItem(item)}
                                                                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteItem(item.id)}
                                                                            className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                                                            title="Eliminar"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Configuración de totales */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Configuración */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-slate-700">Configuración</h3>

                                            {/* Ganancia */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Ganancia (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={markupPercentage}
                                                    onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>

                                            {/* IVA - Solo si es Responsable Inscripto */}
                                            {taxStatus === 'responsable_inscripto' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                        IVA (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={vatPercentage}
                                                        onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    />
                                                </div>
                                            )}

                                            {/* Validez */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Validez (días)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={validityDays}
                                                    onChange={(e) => setValidityDays(parseInt(e.target.value) || 5)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>

                                            {/* Notas Adicionales */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Notas adicionales (opcional)
                                                </label>
                                                <textarea
                                                    value={additionalNotes}
                                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                                    placeholder="Ej: Incluye garantía de 12 meses, materiales de primera calidad..."
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        {/* Totales */}
                                        <div>
                                            <h3 className="font-semibold text-slate-700 mb-4">Totales</h3>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-700">Subtotal:</span>
                                                    <span className="font-mono text-lg">$ {totals.subtotal.toFixed(2)}</span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-700">Ganancia ({markupPercentage}%):</span>
                                                    <span className="font-mono text-lg">$ {totals.markup_amount.toFixed(2)}</span>
                                                </div>

                                                {/* IVA - Solo mostrar si es Responsable Inscripto */}
                                                {taxStatus === 'responsable_inscripto' && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-700">IVA ({vatPercentage}%):</span>
                                                        <span className="font-mono text-lg">$ {totals.vat_amount.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                {/* Leyenda para Monotributista */}
                                                {taxStatus === 'monotributista' && (
                                                    <div className="text-xs text-slate-500 italic">
                                                        IVA incluido (Monotributista)
                                                    </div>
                                                )}

                                                <div className="border-t pt-3 flex justify-between items-center">
                                                    <span className="font-bold text-slate-900">TOTAL:</span>
                                                    <span className="font-mono text-2xl font-bold text-green-600">
                                                        $ {totals.total.toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-slate-500 text-center">
                                                    Válido hasta: {new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t bg-slate-50 flex justify-between">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Exportar Excel
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Download className="w-4 h-4" />
                                        Exportar PDF
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Edit Item Modal */}
            {editingItem && (
                <BudgetItemEditModal
                    item={editingItem}
                    onSave={handleSaveItem}
                    onCancel={() => setEditingItem(null)}
                />
            )}
        </>
    );
};
