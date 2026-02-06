import { ProjectConfig, CircuitInventoryItemForCAD, ComponentNature } from '../../electrical-rules';

/**
 * Genera el inventario extendido de circuitos para el Taller CAD
 * Transforma cada circuito asignado en un CircuitInventoryItemForCAD con todos sus atributos
 * 
 * @param config - Configuración del proyecto con panels y circuitInventory
 * @returns Array de CircuitInventory ItemForCAD listos para generar capas
 */
export function generateCircuitInventoryForCAD(config: ProjectConfig): CircuitInventoryItemForCAD[] {
    if (!config.circuitInventory?.circuits || !config.panels) {
        return [];
    }

    const result: CircuitInventoryItemForCAD[] = [];

    // Iterar sobre todos los circuitos asignados
    const assignedCircuits = config.circuitInventory.circuits.filter(c => c.isAssigned && c.assignedPanelId);

    for (const circuit of assignedCircuits) {
        const panel = config.panels.find(p => p.id === circuit.assignedPanelId);
        if (!panel) continue;

        // Extraer información del circuito
        const cableInfo = parseCableString(circuit.cable);
        const breakerInfo = parseBreakerString(circuit.breaker);
        // 🆕 CORRECCIÓN: Usar terminalLine.conduitDiameter si existe (SSOT del Wizard Step 3)
        const conduitStr = circuit.terminalLine?.conduitDiameter || circuit.conduitDiameter || '';
        const conduitInfo = parseConduitDiameter(conduitStr, circuit.terminalLine?.method || 'B1');

        // Determinar naturaleza (proyectado por defecto, relevado solo si viene del wizard)
        const nature: ComponentNature = circuit.nature || 'proyectado';

        // Crear designation (nombre corto del circuito)
        const designation = circuit.id; // Ej: "IUG-1", "TUG-2"

        const cadCircuit: CircuitInventoryItemForCAD = {
            // Identificación
            id: `${panel.id}-${designation}`,
            panelId: panel.id,
            panelName: panel.name,
            designation,
            type: circuit.type,
            description: circuit.description,

            // Naturaleza
            nature,

            // Cable
            cable: {
                section: cableInfo.section,
                type: cableInfo.type,
                conductors: cableInfo.conductors,
                material: circuit.terminalLine?.material || 'Cu',
            },

            // Protección
            protection: {
                rating: breakerInfo.rating,
                type: breakerInfo.type,
                curve: breakerInfo.curve,
                breakingCapacity: breakerInfo.breakingCapacity,
            },

            // Conduit
            conduit: {
                size: conduitInfo.size,
                method: circuit.terminalLine?.method || 'B1',
                type: conduitInfo.type,
                material: conduitInfo.material,
            },

            // Panel padre
            panel: {
                id: panel.id,
                name: panel.name,
                type: panel.type,
                voltage: panel.voltage,
            },
        };

        result.push(cadCircuit);
    }

    return result;
}

/**
 * Helper: Parsear string de cable "2.5mm² TW" → {section, type, conductors}
 */
function parseCableString(cableStr: string): { section: number; type: string; conductors: number } {
    if (!cableStr || cableStr === 'N/A') {
        console.warn(`⚠️ parseCableString: Recibido '${cableStr}', usando fallback 2.5mm²`);
        return { section: 2.5, type: 'TW', conductors: 2 };
    }

    // Intentar extraer sección (soporta "2.5", "2,5", "2.5mm²", "1.5", etc.)
    const sectionMatch = cableStr.match(/(\d+[.,]?\d*)/);

    if (!sectionMatch) {
        console.warn(`⚠️ parseCableString: No se pudo extraer sección de '${cableStr}', usando fallback 2.5mm²`);
        return { section: 2.5, type: 'TW', conductors: 2 };
    }

    const section = parseFloat(sectionMatch[1].replace(',', '.'));

    // Intentar extraer tipo
    const type = cableStr.includes('TW') ? 'TW' :
        cableStr.includes('THW') ? 'THW' :
            cableStr.includes('247-3') ? 'IRAM NM-247-3' : 'TW';

    // Determinar conductores (por ahora lógica simple: 247-3 suele ser unipolar, pero en OVE 3 conductores = F+N+PE)
    const conductors = cableStr.includes('247-3') || cableStr.includes('3x') ? 3 : 2;

    return { section, type, conductors };
}

/**
 * Helper: Parsear string de breaker "2x16A C" → {rating, type, curve, breakingCapacity}
 */
function parseBreakerString(breakerStr: string): { rating: number; type: string; curve: string; breakingCapacity?: string } {
    if (!breakerStr) return { rating: 10, type: '2P', curve: 'C' };

    // Extraer polos (1x, 2x, 4x)
    const polesMatch = breakerStr.match(/(\d+)x/);
    const poles = polesMatch ? parseInt(polesMatch[1]) : 2;

    // Extraer amperaje (10A, 16A, etc)
    const ratingMatch = breakerStr.match(/(\d+)A/);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 10;

    // Extraer curva (B, C, D)
    const curveMatch = breakerStr.match(/\s+([BCD])(\s+|$)/i);
    const curve = (curveMatch ? curveMatch[1].toUpperCase() : 'C');

    // Poder de corte (3kA, 6kA, etc)
    const bcMatch = breakerStr.match(/(\d+(?:\.\d+)?kA)/);
    const breakingCapacity = bcMatch ? bcMatch[1] : undefined;

    const type = poles === 1 ? '1P' : poles === 2 ? '2P' : '4P';

    return { rating, type, curve, breakingCapacity };
}

/**
 * Helper: Parsear diámetro de conduit y método → {size, type, material}
 */
function parseConduitDiameter(conduitDiameterStr: string, method: string): { size: string; type: string; material: 'PVC' | 'Metal' } {
    // Formato: "19mm" o "Ø 19mm" o "25mm"
    const diameter = conduitDiameterStr.replace(/[Øø\s]/g, '');

    if (!diameter || diameter === 'N/A') {
        return { size: 'N/A', type: 'Ninguno', material: 'PVC' };
    }

    // Determinar tipo y material según método
    const isEmbedded = ['B1', 'B2'].includes(method);
    const isExposed = ['E', 'F', 'G'].includes(method);

    const type = isEmbedded ? 'PVC Embutido' : isExposed ? 'PVC Exterior' : 'PVC';
    const material: 'PVC' | 'Metal' = 'PVC'; // Por ahora solo PVC

    return {
        size: `Ø ${diameter}`,
        type,
        material,
    };
}
