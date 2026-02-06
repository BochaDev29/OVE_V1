import { useMemo } from 'react';
import { Layer } from '../../../types/planner';
import { ProjectConfig, CircuitInventoryItemForCAD, Panel } from '../../electrical-rules';

/**
 * Hook: useCircuitLayers
 * 
 * Genera capas dinámicas basadas en el inventario de circuitos del Wizard
 * y la estructura de alimentadores (LP, CS) y PAT.
 * 
 * ARQUITECTURA DE CAPAS:
 * - Layer 0: Arquitectura
 * - Layer LP: Línea Principal (desde acometida/TP)
 * - Layer CS: Circuitos Seccionales (alimentadores de TS)
 * - Layer PAT: Puesta a Tierra
 * - Layer 1+: Un layer por cada circuito terminal
 */
export function useCircuitLayers(
    config?: ProjectConfig
): Layer[] {
    return useMemo(() => {
        if (!config) return [];

        const circuitInventory = config.circuitInventoryForCAD as CircuitInventoryItemForCAD[];
        const panels = config.panels as Panel[] || [];

        const layers: Layer[] = [];

        // 1. LAYER 0: Arquitectura (siempre presente)
        layers.push({
            id: 'layer-0',
            name: '🏗️ Arquitectura',
            visible: true,
            locked: false,
            opacity: 1.0,
            color: '#000000',
            circuitId: null,
        });

        // 2. LAYERS DE ALIMENTACIÓN (LP y CS)
        const tp = panels.find(p => p.type === 'TP');
        if (tp && tp.incomingLine) {
            layers.push({
                id: 'layer-lp',
                name: '⚡ Línea Principal (LP)',
                visible: true,
                locked: false,
                opacity: 1.0,
                color: '#1e40af', // Azul oscuro
                circuitId: 'LP',
                circuit: {
                    id: 'LP',
                    type: 'ALIMENTACION',
                    designation: 'LP',
                    description: 'Línea Principal (Medidor ➔ TP)',
                    nature: tp.nature || 'proyectado',
                    cable: {
                        section: tp.incomingLine.section || config.acometida?.seccion || 6,
                        conductors: config.voltage === '380V' ? 4 : 2,
                        material: tp.incomingLine.material || config.acometida?.material || 'Cu'
                    },
                    conduit: {
                        size: tp.incomingLine.conduitDiameter || 'Ø 25mm',
                        method: tp.incomingLine.method || 'B1',
                        type: tp.incomingLine.conduitMaterial || 'PVC'
                    }
                } as any
            });
        }

        // Circuitos Seccionales (CS) para cada tablero seccional
        panels.forEach(p => {
            if ((p.type === 'TSG' || p.type === 'TS') && p.parentId) {
                const line = p.incomingLine;
                if (!line) return;

                layers.push({
                    id: `layer-cs-${p.id}`,
                    name: `🔌 Seccional (CS) ➔ ${p.name}`,
                    visible: true,
                    locked: false,
                    opacity: 1.0,
                    color: '#1e3a8a', // Azul muy oscuro
                    circuitId: `CS-${p.id}`,
                    circuit: {
                        id: `CS-${p.id}`,
                        type: 'ALIMENTACION',
                        designation: `CS-${p.name}`,
                        description: `Alimentación ${p.name}`,
                        nature: p.nature || 'proyectado',
                        cable: {
                            section: line.section || 4,
                            conductors: p.voltage === '380V' ? 4 : 2,
                            material: line.material || 'Cu'
                        },
                        conduit: {
                            size: line.conduitDiameter || 'Ø 22mm',
                            method: line.method || 'B1',
                            type: line.conduitMaterial || 'PVC'
                        }
                    } as any
                });
            }
        });

        // 3. LAYER PAT: Puesta a Tierra
        const panelWithPAT = panels.find(p => p.grounding?.hasPAT);
        if (panelWithPAT) {
            const patInfo = panelWithPAT.grounding?.materials?.cablePAT;
            layers.push({
                id: 'layer-pat',
                name: '🟢 Puesta a Tierra (PAT)',
                visible: true,
                locked: false,
                opacity: 1.0,
                color: '#16a34a', // Verde
                circuitId: 'PAT',
                circuit: {
                    id: 'PAT',
                    type: 'PAT',
                    designation: 'PAT',
                    description: 'Red de Puesta a Tierra',
                    nature: 'proyectado',
                    cable: { section: patInfo?.section || 4, conductors: 1, material: 'Cu' },
                    conduit: { size: 'Ø 19mm', method: 'B1', type: 'PVC' }
                } as any
            });
        }

        // 4. LAYERS TERMINALES (Circuitos del Inventario)
        if (circuitInventory && circuitInventory.length > 0) {
            circuitInventory.forEach((circuit, index) => {
                const color = circuit.nature === 'relevado'
                    ? '#94a3b8'
                    : getCircuitColor(circuit.type);

                const opacity = circuit.nature === 'relevado' ? 0.6 : 1.0;

                layers.push({
                    id: `layer-${index + 1}`,
                    name: `${getNatureEmoji(circuit.nature)} ${circuit.designation} - ${circuit.description || circuit.type}`,
                    visible: true,
                    locked: false,
                    opacity,
                    color,
                    circuitId: circuit.id,
                    circuit,
                });
            });
        }

        return layers;
    }, [config]);
}

/**
 * Helper: Obtener color por tipo de circuito
 */
function getCircuitColor(circuitType: string): string {
    const colorMap: Record<string, string> = {
        'IUG': '#dc2626',  // Rojo
        'TUG': '#2563eb',  // Azul
        'TUE': '#7c3aed',  // Violeta
        'ACU': '#16a34a',  // Verde
        'APM': '#ea580c',  // Naranja
        'MBT': '#78350f',  // Marrón
    };
    return colorMap[circuitType] || '#64748b';
}

function getNatureEmoji(nature: 'proyectado' | 'relevado'): string {
    return nature === 'proyectado' ? '🆕' : '📋';
}

export function getLayerById(layers: Layer[], layerId: string): Layer | undefined {
    return layers.find(l => l.id === layerId);
}

export function getLayerByCircuitId(layers: Layer[], circuitId: string): Layer | undefined {
    return layers.find(l => l.circuitId === circuitId);
}

export function isArchitectureLayer(layer: Layer): boolean {
    return layer.circuitId === null;
}

