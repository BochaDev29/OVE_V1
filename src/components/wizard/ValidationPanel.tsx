import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface ValidationMessage {
    type: 'error' | 'warning';
    message: string;
    field?: string;
}

interface ValidationPanelProps {
    messages: ValidationMessage[];
}

export function ValidationPanel({ messages }: ValidationPanelProps) {
    const errors = messages.filter(m => m.type === 'error');
    const warnings = messages.filter(m => m.type === 'warning');

    if (messages.length === 0) {
        return (
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">
                        ✅ Todo correcto
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Errores */}
            {errors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                    <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                                ❌ Errores que debes corregir:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1">
                                {errors.map((err, i) => (
                                    <li key={i}>• {err.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Advertencias */}
            {warnings.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800 mb-1">
                                ⚠️ Advertencias (revisa si es necesario):
                            </p>
                            <ul className="text-sm text-amber-700 space-y-1">
                                {warnings.map((warn, i) => (
                                    <li key={i}>• {warn.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
