import { SymbolDefinition } from '../../../../types/planner';

/**
 * Catálogo de Símbolos Eléctricos - Normalizados según AEA
 * 
 * Definiciones SVG de todos los símbolos eléctricos utilizados
 * en planos de planta y esquemas unifilares.
 */

export const electricalSymbols: SymbolDefinition[] = [
    // ========== SÍMBOLOS DE PLANTA ==========
    {
        id: 'light',
        name: 'Boca de Techo',
        category: 'electrical',
        svgPath: 'M-10,0 A10,10 0 1,0 10,0 A10,10 0 1,0 -10,0 M-7,-7 L7,7 M-7,7 L7,-7',
        strokeColor: '#dc2626',
        metadata: {
            description: 'Punto de luz en techo (caja octogonal)',
            normative: 'AEA 90364-5-51',
            defaultLabel: 'IL'
        }
    },
    {
        id: 'wall_light',
        name: 'Boca de Pared (Aplique)',
        category: 'electrical',
        svgPath: 'M-8,0 A8,8 0 1,0 8,0 A8,8 0 1,0 -8,0 M0,8 L0,15 M-5,15 L5,15',
        strokeColor: '#dc2626',
        metadata: {
            description: 'Punto de luz en pared (aplique)',
            normative: 'AEA 90364-5-51',
            defaultLabel: 'AP'
        }
    },
    {
        id: 'outlet',
        name: 'Tomacorriente Simple',
        category: 'electrical',
        svgPath: 'M-18,0 L18,0 M-10,0 A10,10 0 0,1 10,0 M0,-10 L0,-20',
        strokeColor: '#2563eb',
        metadata: {
            description: 'Toma de uso general (TUG)',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'TUG'
        }
    },
    {
        id: 'double_outlet',
        name: 'Tomacorriente Doble',
        category: 'electrical',
        svgPath: 'M-22,0 L22,0 M-10,0 A10,10 0 0,1 10,0 M-20,0 A10,10 0 0,1 0,0 M0,-10 L0,-20',
        strokeColor: '#2563eb',
        metadata: {
            description: 'Toma doble de uso general',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'TUG x2'
        }
    },
    {
        id: 'switch',
        name: 'Llave de Luz',
        category: 'electrical',
        svgPath: 'M-5,0 A5,5 0 1,0 5,0 A5,5 0 1,0 -5,0 M0,0 L15,-15',
        strokeColor: '#475569',
        fillColor: '#475569',
        metadata: {
            description: 'Interruptor simple',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'S'
        }
    },
    {
        id: 'switch_2e',
        name: 'Llave de 2 Efectos',
        category: 'electrical',
        svgPath: 'M-5,0 A5,5 0 1,0 5,0 A5,5 0 1,0 -5,0 M0,0 L15,-15 M0,0 L18,-10',
        strokeColor: '#475569',
        fillColor: '#475569',
        metadata: {
            description: 'Interruptor de dos efectos',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'S2'
        }
    },
    {
        id: 'switch_3e',
        name: 'Llave de 3 Efectos',
        category: 'electrical',
        svgPath: 'M-5,0 A5,5 0 1,0 5,0 A5,5 0 1,0 -5,0 M0,0 L15,-15 M0,0 L18,-10 M0,0 L10,-18',
        strokeColor: '#475569',
        fillColor: '#475569',
        metadata: {
            description: 'Interruptor de tres efectos',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'S3'
        }
    },
    {
        id: 'switch_3way',
        name: 'Llave Combinada',
        category: 'electrical',
        svgPath: 'M-5,0 A5,5 0 1,0 5,0 A5,5 0 1,0 -5,0 M-5,0 L-15,-5 M5,0 L15,5',
        strokeColor: '#475569',
        fillColor: '#475569',
        metadata: {
            description: 'Interruptor de combinación',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'C'
        }
    },
    {
        id: 'bell_button',
        name: 'Pulsador de Timbre',
        category: 'electrical',
        svgPath: 'M-8,0 A8,8 0 1,0 8,0 A8,8 0 1,0 -8,0 M-4,-4 L4,4 M-4,4 L4,-4 M0,0 L0,12',
        strokeColor: '#f59e0b',
        metadata: {
            description: 'Pulsador para timbre o portero',
            normative: 'AEA 90364-5-56',
            defaultLabel: 'T'
        }
    },
    {
        id: 'cp',
        name: 'Caja de Paso/Derivación',
        category: 'electrical',
        svgPath: 'M-10,0 A10,10 0 1,0 10,0 A10,10 0 1,0 -10,0',
        strokeColor: '#64748b',
        metadata: {
            description: 'Caja de paso o derivación',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'CP'
        }
    },
    {
        id: 'ac',
        name: 'Toma Aire Acondicionado',
        category: 'electrical',
        svgPath: 'M-18,0 L18,0 M-10,0 A10,10 0 0,1 10,0 M0,-10 L0,-20',
        strokeColor: '#7c3aed',
        fillColor: '#7c3aed',
        metadata: {
            description: 'Toma de uso específico para aire acondicionado (TUE)',
            normative: 'AEA 90364-5-55',
            defaultLabel: 'TUE-AC'
        }
    },
    {
        id: 'fan',
        name: 'Ventilador de Techo',
        category: 'electrical',
        svgPath: 'M-2,0 A2,2 0 1,0 2,0 A2,2 0 1,0 -2,0 M0,0 L0,-12 M0,0 L10,6 M0,0 L-10,6',
        strokeColor: '#059669',
        metadata: {
            description: 'Punto para ventilador de techo',
            normative: 'AEA 90364-5-55',
            defaultLabel: 'VENT'
        }
    },
    {
        id: 'board',
        name: 'Tablero General',
        category: 'electrical',
        svgPath: 'M-15,-10 h30 v20 h-30 z M-15,-10 L15,10 M-15,10 L15,-10',
        strokeColor: '#b91c1c',
        fillColor: '#fee2e2',
        metadata: {
            description: 'Tablero general de distribución',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'TG'
        }
    },
    {
        id: 'tpu',
        name: 'Tablero de Puesta a Tierra (TPU)',
        category: 'electrical',
        svgPath: 'M-15,-10 h30 v20 h-30 z M-15,10 L15,-10',
        strokeColor: '#b91c1c',
        fillColor: '#fee2e2',
        metadata: {
            description: 'Tablero de puesta a tierra',
            normative: 'AEA 90364-5-54',
            defaultLabel: 'TPU'
        }
    },
    {
        id: 'ground',
        name: 'Puesta a Tierra (PAT)',
        category: 'electrical',
        svgPath: 'M0,-5 L0,5 M-8,5 L8,5 M-5,9 L5,9 M-2,13 L2,13',
        strokeColor: '#15803d',
        metadata: {
            description: 'Jabalina de puesta a tierra',
            normative: 'AEA 90364-5-54',
            defaultLabel: 'PAT'
        }
    },
    {
        id: 'motion_sensor',
        name: 'Sensor de Movimiento',
        category: 'electrical',
        svgPath: 'M-10,-10 h20 v20 h-20 z M0,0 L5,5 M0,0 L-5,5 M0,0 L0,-7',
        strokeColor: '#f59e0b',
        metadata: {
            description: 'Detector de movimiento PIR',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'PIR'
        }
    },
    {
        id: 'photo_cell',
        name: 'Fotocélula',
        category: 'electrical',
        svgPath: 'M-10,0 A10,10 0 0,1 10,0 L10,10 L-10,10 z M-12,-10 L-7,-5 M0,-12 L0,-7 M12,-10 L7,-5',
        strokeColor: '#f59e0b',
        metadata: {
            description: 'Sensor de iluminación (Fotocélula)',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'FC'
        }
    },
    {
        id: 'motor_1p',
        name: 'Motor Monofásico',
        category: 'electrical',
        svgPath: 'M-15,0 A15,15 0 1,0 15,0 A15,15 0 1,0 -15,0 M-7,5 L-7,-5 L7,5 L7,-5 M-5,10 Q0,6 5,10',
        strokeColor: '#059669',
        metadata: {
            description: 'Motor eléctrico monofásico',
            normative: 'AEA 90364-5-55',
            defaultLabel: 'M 1~'
        }
    },
    {
        id: 'motor_3p',
        name: 'Motor Trifásico',
        category: 'electrical',
        svgPath: 'M-15,0 A15,15 0 1,0 15,0 A15,15 0 1,0 -15,0 M-7,5 L-7,-5 L7,5 L7,-5 M-8,10 L-4,10 M-2,10 L2,10 M4,10 L8,10',
        strokeColor: '#059669',
        metadata: {
            description: 'Motor eléctrico trifásico',
            normative: 'AEA 90364-5-55',
            defaultLabel: 'M 3~'
        }
    },
    {
        id: 'riser',
        name: 'Montante (Sube/Baja)',
        category: 'electrical',
        svgPath: 'M-10,-10 h20 v20 h-20 z M0,0 L0,-14 M-5,-9 L0,-14 L5,-9',
        strokeColor: '#000000',
        metadata: {
            description: 'Pase de cañería entre plantas (Montante)',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'MON'
        }
    },

    // ========== SÍMBOLOS UNIFILARES ==========
    {
        id: 'feed_point',
        name: 'Punto de Alimentación',
        category: 'electrical',
        svgPath: 'M-10,0 A10,10 0 1,0 10,0 A10,10 0 1,0 -10,0',
        strokeColor: '#000000',
        fillColor: '#000000',
        metadata: {
            description: 'Punto de alimentación de red',
            normative: 'AEA 90364-4-41',
            defaultLabel: 'RED'
        }
    },
    {
        id: 'meter',
        name: 'Medidor de Energía',
        category: 'electrical',
        svgPath: 'M-35,-45 h70 v90 h-70 Z M-35,-28 h70',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        metadata: {
            description: 'Medidor de energía eléctrica',
            normative: 'AEA 90364-4-41',
            defaultLabel: 'kWh'
        }
    },
    {
        id: 'main_breaker',
        name: 'Disyuntor General',
        category: 'electrical',
        svgPath: 'M-10,-10 h20 v20 h-20 z',
        strokeColor: '#dc2626',
        fillColor: '#ffffff',
        metadata: {
            description: 'Disyuntor o llave general',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'DG'
        }
    },
    {
        id: 'diff_switch',
        name: 'Interruptor Diferencial',
        category: 'electrical',
        svgPath: 'M-10,-10 h20 v20 h-20 z M-10,0 L10,0',
        strokeColor: '#7c3aed',
        fillColor: '#ffffff',
        metadata: {
            description: 'Interruptor diferencial (ID)',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'ID'
        }
    },
    {
        id: 'tm_1p',
        name: 'Térmica Monopolar',
        category: 'electrical',
        svgPath: 'M-8,-8 h16 v16 h-16 z',
        strokeColor: '#2563eb',
        fillColor: '#ffffff',
        metadata: {
            description: 'Llave termomagnética 1 polo',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'TM-1P'
        }
    },
    {
        id: 'tm_2p',
        name: 'Térmica Bipolar',
        category: 'electrical',
        svgPath: 'M 0,31 L 0,75 M 4,25 A 4,4 0 1,0 -4,25 A 4,4 0 1,0 4,25 M 3,20 L 23,-11 M 0,-10 L 0,-50 M -10,-10 L 10,-10 M -10,-19 L 10,-29 M -10,-29 L 10,-19 M 17,-2 L 26,4 M 24,4 L 29,-2 M 28,-1 L 36,4 M 35,3 L 32,8 M 32,7 L 40,13 M 12,6 L 36,21 M 26,20 L 36,21 L 31,12',
        strokeColor: '#2563eb',
        fillColor: '#ffffff',
        metadata: {
            description: 'Llave termomagnética 2 polos (Diseño Personalizado)',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'TM-2P'
        }
    },
    {
        id: 'tm_4p',
        name: 'Térmica Tetrapolar',
        category: 'electrical',
        svgPath: 'M-10,-10 h20 v20 h-20 z M-5,-10 L-5,10 M0,-10 L0,10 M5,-10 L5,10',
        strokeColor: '#2563eb',
        fillColor: '#ffffff',
        metadata: {
            description: 'Llave termomagnética 4 polos',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'TM-4P'
        }
    },
    {
        id: 'dist_block',
        name: 'Bornera de Distribución',
        category: 'electrical',
        svgPath: 'M-30,-5 h60 v10 h-60 z M-20,-5 L-20,5 M-10,-5 L-10,5 M0,-5 L0,5 M10,-5 L10,5 M20,-5 L20,5',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'load_arrow',
        name: 'Salida de Carga',
        category: 'electrical',
        svgPath: 'M0,0 L0,20 M-5,15 L0,20 L5,15',
        strokeColor: '#000000',
        metadata: {
            description: 'Flecha de salida a circuito',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'CIRCUITO'
        }
    }
];
