import React from 'react';
import { X, Zap, Building2, FileCheck } from 'lucide-react';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectType: (type: 'flash' | 'complete' | 'regulated') => void;
}

export default function NewProjectModal({ isOpen, onClose, onSelectType }: NewProjectModalProps) {
    if (!isOpen) return null;

    const projectTypes = [
        {
            id: 'flash' as const,
            icon: Zap,
            title: 'Presupuesto Flash',
            description: 'Trabajos rápidos y simples',
            details: 'Cambiar llaves, instalar ventilador, reparaciones menores',
            color: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            hoverColor: 'hover:border-yellow-400',
        },
        {
            id: 'complete' as const,
            icon: Building2,
            title: 'Proyecto Completo',
            description: 'Instalaciones eléctricas nuevas',
            details: 'Wizard completo, Taller CAD, Documentación',
            color: 'from-blue-500 to-indigo-500',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            hoverColor: 'hover:border-blue-400',
        },
        {
            id: 'regulated' as const,
            icon: FileCheck,
            title: 'Trabajo Reglamentado',
            description: 'Certificación y relevamiento',
            details: 'Instalaciones existentes, certificación ERSEP',
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            hoverColor: 'hover:border-green-400',
        },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Nuevo Proyecto</h2>
                        <p className="text-sm text-slate-600 mt-1">Selecciona el tipo de trabajo que vas a realizar</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {projectTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        onSelectType(type.id);
                                        onClose();
                                    }}
                                    className={`
                    group relative p-6 rounded-xl border-2 ${type.borderColor} ${type.bgColor}
                    ${type.hoverColor} hover:shadow-lg
                    transition-all duration-200 transform hover:scale-105
                    text-left
                  `}
                                >
                                    {/* Icon */}
                                    <div className={`
                    w-16 h-16 rounded-xl bg-gradient-to-br ${type.color}
                    flex items-center justify-center mb-4
                    shadow-lg group-hover:shadow-xl transition-shadow
                  `}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                                        {type.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm font-medium text-slate-700 mb-2">
                                        {type.description}
                                    </p>

                                    {/* Details */}
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {type.details}
                                    </p>

                                    {/* Hover indicator */}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                                            <span className="text-xs">→</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Help text */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                            <strong>💡 Ayuda:</strong> Si no estás seguro, elige <strong>Proyecto Completo</strong> para tener acceso a todas las funcionalidades.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
