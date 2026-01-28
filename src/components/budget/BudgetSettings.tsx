import React, { useState, useEffect } from 'react';
import { DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileService, type UserProfile } from '../../services/profile.service';
import { BudgetService } from '../../services/budget.service';
import { BudgetItemsConfigModal } from './BudgetItemsConfigModal';
import type { TaxStatus } from '../../types/budget';

/**
 * Componente de configuración de presupuestos
 * Incluye perfil fiscal y gestión de items
 */
export const BudgetSettings: React.FC = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showItemsConfig, setShowItemsConfig] = useState(false);
    const [hasInitializedTemplate, setHasInitializedTemplate] = useState(false);

    useEffect(() => {
        if (user) {
            loadProfile();
            checkTemplateInitialization();
        }
    }, [user]);

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

    const checkTemplateInitialization = async () => {
        if (!user) return;

        try {
            const items = await BudgetService.getUserBudgetItems(user.id);
            setHasInitializedTemplate(items.length > 0);
        } catch (error) {
            console.error('Error checking template:', error);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !profile) return;

        try {
            setSaving(true);
            await ProfileService.upsertProfile({
                ...profile,
                user_id: user.id
            });
            alert('Perfil actualizado correctamente');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error al guardar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleInitializeTemplate = async () => {
        if (!user) return;

        if (!confirm('¿Inicializar plantilla AEA con items predefinidos?')) return;

        try {
            await BudgetService.initializeAEATemplate(user.id);
            setHasInitializedTemplate(true);
            alert('Plantilla AEA inicializada correctamente');
        } catch (error) {
            console.error('Error initializing template:', error);
            alert('Error al inicializar plantilla');
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-slate-500">
                Cargando configuración...
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                {/* Header */}
                <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        Configuración de Presupuestos
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Perfil Fiscal */}
                    <div>
                        <h3 className="font-semibold text-slate-700 mb-3">
                            💼 Perfil Fiscal
                        </h3>
                        <div className="space-y-4">
                            {/* Selector de perfil fiscal */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tipo de Contribuyente *
                                </label>
                                <select
                                    value={profile?.tax_status || 'particular'}
                                    onChange={(e) => setProfile({
                                        ...profile!,
                                        tax_status: e.target.value as TaxStatus
                                    })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                >
                                    <option value="responsable_inscripto">
                                        Responsable Inscripto (con IVA desglosado)
                                    </option>
                                    <option value="monotributista">
                                        Monotributista (IVA incluido)
                                    </option>
                                    <option value="particular">
                                        Particular / Independiente (sin datos fiscales)
                                    </option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Esto afecta cómo se muestra el IVA en los presupuestos
                                </p>
                            </div>

                            {/* CUIT (solo si NO es particular) */}
                            {profile?.tax_status !== 'particular' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        CUIT *
                                    </label>
                                    <input
                                        type="text"
                                        value={profile?.tax_id || ''}
                                        onChange={(e) => setProfile({
                                            ...profile!,
                                            tax_id: e.target.value
                                        })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        placeholder="20-12345678-9"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Perfil Fiscal'}
                            </button>
                        </div>
                    </div>

                    {/* Items de Presupuesto */}
                    <div className="border-t pt-6">
                        <h3 className="font-semibold text-slate-700 mb-3">
                            📋 Items de Presupuesto
                        </h3>
                        <div className="space-y-3">
                            {!hasInitializedTemplate ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-900 mb-3">
                                        Inicializa la plantilla AEA con 30+ items predefinidos (bocas, cableado, cañerías, etc.)
                                    </p>
                                    <button
                                        onClick={handleInitializeTemplate}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Inicializar Plantilla AEA
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-900 mb-3">
                                        ✅ Plantilla inicializada. Configura tus precios y agrega items personalizados.
                                    </p>
                                    <button
                                        onClick={() => setShowItemsConfig(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                        Configurar Items y Precios
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Información */}
                    <div className="border-t pt-6">
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                            <p className="font-semibold text-slate-700 mb-2">💡 Cómo funciona:</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li>Configura tu perfil fiscal según cómo trabajes</li>
                                <li>Inicializa la plantilla AEA con items comunes</li>
                                <li>Edita precios según tu zona y costos</li>
                                <li>Agrega items personalizados (ej: "Cableado monofásico/m")</li>
                                <li>Usa el multiplicador para actualizar todos los precios (+10%, -5%, etc.)</li>
                                <li>Genera presupuestos automáticamente desde el cómputo de materiales</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de configuración de items */}
            {showItemsConfig && (
                <BudgetItemsConfigModal
                    isOpen={showItemsConfig}
                    onClose={() => setShowItemsConfig(false)}
                />
            )}
        </>
    );
};
