import { SymbolItem, Pipe, MaterialReport } from '../../../../types/planner';

/**
 * Cálculo de Materiales para Instalaciones Eléctricas
 * 
 * Calcula el cómputo de materiales basado en los símbolos
 * y cañerías dibujadas en el plano.
 */
export const calculateElectricalMaterials = (
    symbols: SymbolItem[],
    pipes: Pipe[],
    pixelsPerMeter: number
): MaterialReport => {
    const counts: Record<string, number> = {};

    // Contar símbolos por tipo
    symbols.forEach(sym => {
        // Ignorar elementos especiales
        if (sym.type === 'text' || sym.type === 'table') return;

        // Mapear tipos a nombres descriptivos
        const itemName = getItemName(sym.type);
        counts[itemName] = (counts[itemName] || 0) + 1;
    });

    // Calcular longitud total de cañería horizontal
    let totalPipeMeters = 0;
    pipes.forEach(pipe => {
        const dx = pipe.points[2] - pipe.points[0];
        const dy = pipe.points[3] - pipe.points[1];
        const pixelLength = Math.sqrt(dx * dx + dy * dy);
        totalPipeMeters += pixelLength / pixelsPerMeter;
    });

    // Estimar bajadas verticales (desde techo a toma/llave)
    const verticalDrops =
        (counts['Cajas Rectangulares (Tomas)'] || 0) * 1.5 +  // 1.5m por toma
        (counts['Cajas Rectangulares (Llaves)'] || 0) * 1.5 + // 1.5m por llave
        (counts['Bocas de Pared (Apliques)'] || 0) * 0.5;     // 0.5m por aplique

    // Estimar cable (3 conductores por metro de cañería)
    const totalCableMeters = (totalPipeMeters + verticalDrops) * 3;

    return {
        counts,
        totalPipeMeters: totalPipeMeters + verticalDrops,
        totalCableMeters
    };
};

/**
 * Mapea el tipo de símbolo a un nombre descriptivo para el reporte
 */
function getItemName(type: string): string {
    const mapping: Record<string, string> = {
        // Planta
        'light': 'Bocas de Techo (Octogonales)',
        'wall_light': 'Bocas de Pared (Apliques)',
        'outlet': 'Cajas Rectangulares (Tomas)',
        'double_outlet': 'Cajas Rectangulares Dobles (Tomas)',
        'switch': 'Cajas Rectangulares (Llaves)',
        'bell_button': 'Pulsadores de Timbre',
        'cp': 'Cajas de Paso/Derivación',
        'ac': 'Tomas Aire Acondicionado (TUE)',
        'fan': 'Bocas Ventilador',
        'board': 'Tablero General',
        'tpu': 'Tablero TPU',
        'ground': 'Jabalina / PAT',

        // Unifilar
        'feed_point': 'Punto de Alimentación',
        'meter': 'Medidor de Energía',
        'main_breaker': 'Disyuntor General',
        'diff_switch': 'Interruptor Diferencial',
        'tm_1p': 'Térmica Monopolar',
        'tm_2p': 'Térmica Bipolar',
        'tm_4p': 'Térmica Tetrapolar',
        'dist_block': 'Bornera de Distribución',
        'load_arrow': 'Salida de Carga'
    };

    return mapping[type] || type;
}
