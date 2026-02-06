import { useState, useCallback } from 'react';
import type { Pipe } from '../../../types/planner';

/**
 * Hook para gestionar el renderizado de cañerías (pipes)
 * 
 * Funcionalidades:
 * - Hereda método del wizard (B1/B2 = sólido, D1/D2 = punteado)
 * - Permite toggle manual de strokeDash
 * - Aplica nature-based styling (opacity + color)
 * - Mantiene datos del circuito para cómputo
 */

// Constantes de visualización
const NATURE_OPACITY = {
    proyectado: 1.0,
    relevado: 0.6
};

const NATURE_COLORS = {
    relevado: {
        stroke: '#94a3b8',  // Gris
        fill: '#f1f5f9'     // Gris claro
    }
};

export const usePipeRenderer = () => {
    // Estado para toggle manual de strokeDash
    const [dashedPipes, setDashedPipes] = useState<Set<string>>(new Set());

    /**
     * Toggle manual del strokeDash de una pipe
     */
    const togglePipeDash = useCallback((pipeId: string) => {
        setDashedPipes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pipeId)) {
                newSet.delete(pipeId);
            } else {
                newSet.add(pipeId);
            }
            return newSet;
        });
    }, []);

    /**
     * 🆕 Registrar una pipe recién dibujada en modo punteado
     * Se llama desde useDrawingTools cuando el usuario dibuja con dashMode='dashed'
     */
    const registerPipe = useCallback((pipeId: string, dashMode: 'solid' | 'dashed') => {
        if (dashMode === 'dashed') {
            setDashedPipes(prev => new Set(prev).add(pipeId));
        }
    }, []);

    /**
     * Obtener estilo de strokeDash para una pipe
     * Prioridad: Toggle manual > Método heredado del wizard > Sólido por defecto
     */
    const getPipeDash = useCallback((pipe: Pipe, circuitMethod?: string) => {
        // Si hay toggle manual, usarlo
        if (dashedPipes.has(pipe.id)) {
            return [5, 5]; // Punteado
        }

        // ✅ REMOVIDO: No forzar curved → punteado
        // El usuario puede dibujar curvas sólidas o rectas punteadas libremente

        // Si no hay método del circuito, sólido por defecto
        if (!circuitMethod) {
            return undefined;
        }

        // Método del wizard: D1/D2 = punteado, B1/B2 = sólido
        const isDashedMethod = circuitMethod === 'D1' || circuitMethod === 'D2';
        return isDashedMethod ? [5, 5] : undefined;
    }, [dashedPipes]);

    /**
     * Obtener estilo de color/opacity según nature
     */
    const getPipeStyle = useCallback((pipe: Pipe, selectedId: string | null) => {
        const isSelected = selectedId === pipe.id;
        const strokeColor = isSelected
            ? "#3b82f6"
            : pipe.nature === 'relevado'
                ? NATURE_COLORS.relevado.stroke
                : pipe.color;

        const opacity = pipe.nature === 'relevado'
            ? NATURE_OPACITY.relevado
            : NATURE_OPACITY.proyectado;

        return { strokeColor, opacity };
    }, []);

    /**
     * Resetear todos los toggles manuales
     */
    const resetDashToggles = useCallback(() => {
        setDashedPipes(new Set());
    }, []);

    /**
     * Verificar si una pipe está manualmente punteada
     */
    const isPipeManuallyDashed = useCallback((pipeId: string) => {
        return dashedPipes.has(pipeId);
    }, [dashedPipes]);

    return {
        getPipeDash,
        getPipeStyle,
        togglePipeDash,
        registerPipe, // 🆕 Exportar para uso desde drawing tools
        resetDashToggles,
        isPipeManuallyDashed,
    };
};
