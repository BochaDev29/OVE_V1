import React from 'react';
import { Zap } from 'lucide-react';

interface QuickBudgetButtonProps {
    onClick: () => void;
    className?: string;
}

/**
 * Botón para crear Presupuesto Flash
 * Permite crear presupuestos rápidos sin pasar por Wizard/Taller
 * Ideal para trabajos simples (cambiar llaves, instalar ventilador, etc.)
 */
export const QuickBudgetButton: React.FC<QuickBudgetButtonProps> = ({
    onClick,
    className = ''
}) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg font-medium ${className}`}
            title="Presupuesto rápido sin Wizard - ideal para trabajos simples"
        >
            <Zap className="w-5 h-5" />
            <span>Presupuesto Flash</span>
        </button>
    );
};
