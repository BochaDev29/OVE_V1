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
        svgPath: 'M -6 43 L 6 43 M -10 34 L 10 34 M -20 24 L 20 24 M -30 14 L 30 14 M 0 14 L 0 -27 M -7 -43 h 15 v 15 h -15 z M -1,-36 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
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
        id: 'meter',
        name: 'Medidor de Energía',
        category: 'electrical',
        svgPath: 'M-35,-45 h70 v90 h-70 Z M-35,-28 h70',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        textElements: [
            { text: 'kWh', x: -35, y: 12, width: 70, fontSize: 24, fontStyle: 'bold', align: 'center', fill: '#000000' }
        ],
        metadata: {
            description: 'Medidor de energía eléctrica',
            normative: 'AEA 90364-4-41',
            defaultLabel: 'kWh'
        }
    },

    // --- Líneas, Conectores y Circuitos ---
    {
        id: 'lp_220',
        name: 'Línea Principal 220V',
        category: 'electrical',
        svgPath: 'M -1 -40 L -1 40 M -11 0 L 9 -20 M -1 0 L 9 -10 M 8,-10 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Línea principal monofásica 220V',
            normative: 'AEA 90364',
            defaultLabel: 'LP 220V'
        }
    },
    {
        id: 'lp_380',
        name: 'Línea Principal 380V',
        category: 'electrical',
        svgPath: 'M -1 -40 L -1 40 M -11 10 L 9 -10 M -11 0 L 9 -20 M -11 -10 L 9 -30 M -1 10 L 9 0 M 8,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Línea principal trifásica 380V',
            normative: 'AEA 90364',
            defaultLabel: 'LP 380V'
        }
    },
    {
        id: 'cs_220',
        name: 'Circuito Seccional 220V',
        category: 'electrical',
        svgPath: 'M -1 -40 L -1 40 M -11 0 L 9 -20 M -1 0 L 9 -10 M 8,-10 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Circuito seccional monofásico 220V',
            normative: 'AEA 90364',
            defaultLabel: 'CS 220V'
        }
    },
    {
        id: 'cs_380',
        name: 'Circuito Seccional 380V',
        category: 'electrical',
        svgPath: 'M -1 -40 L -1 40 M -11 10 L 9 -10 M -11 0 L 9 -20 M -11 -10 L 9 -30 M -1 10 L 9 0 M 8,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Circuito seccional trifásico 380V',
            normative: 'AEA 90364',
            defaultLabel: 'CS 380V'
        }
    },
    {
        id: 'ct_220',
        name: 'Circuito Terminal 220V',
        category: 'electrical',
        svgPath: 'M -1 -35 L -1 35 M -6 26 L -1 35 L 4 26 M 4 -9 L -6 1 M 5 -2 L -1 4 M 4,-1 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Circuito terminal monofásico 220V',
            normative: 'AEA 90364',
            defaultLabel: 'CT 220V'
        }
    },
    {
        id: 'ct_380',
        name: 'Circuito Terminal 380V',
        category: 'electrical',
        svgPath: 'M -1 -35 L -1 35 M -6 26 L -1 35 L 4 26 M 4 -21 L -6 -11 M 4 -16 L -6 -6 M 4 -9 L -6 1 M 5 -2 L -1 4 M 4,-1 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
        strokeColor: '#000000',
        metadata: {
            description: 'Circuito terminal trifásico 380V',
            normative: 'AEA 90364',
            defaultLabel: 'CT 380V'
        }
    },

    // --- Borneras de distribución (PAT + N bornes CT) ---
    {
        id: 'dist_block_2',
        name: 'Bornera (PAT + 2 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -20 h 15 v 40 h -15 z M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 2 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_3',
        name: 'Bornera (PAT + 3 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -20 h 15 v 50 h -15 z M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 3 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_4',
        name: 'Bornera (PAT + 4 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -30 h 15 v 60 h -15 z M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 4 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_5',
        name: 'Bornera (PAT + 5 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -40 h 15 v 70 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 5 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_6',
        name: 'Bornera (PAT + 6 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -40 h 15 v 80 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,30 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 6 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_7',
        name: 'Bornera (PAT + 7 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -40 h 15 v 90 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,30 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 7 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_8',
        name: 'Bornera (PAT + 8 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -50 h 15 v 100 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,30 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 8 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_9',
        name: 'Bornera (PAT + 9 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -60 h 15 v 110 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-50 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,30 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 9 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },
    {
        id: 'dist_block_10',
        name: 'Bornera (PAT + 10 bornes)',
        category: 'electrical',
        svgPath: 'M -2,-10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -8 -60 h 15 v 120 h -15 z M -2,-31 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-20 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-50 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,30 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,-40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,40 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -2,50 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
        strokeColor: '#64748b',
        fillColor: '#e2e8f0',
        metadata: {
            description: 'Bornera de distribución: 1 borne PAT + 10 bornes CT',
            normative: 'AEA 90364-5-52',
            defaultLabel: 'BORNES'
        }
    },


    {
        id: 'pia_1p',
        name: 'PIA Monofásica',
        category: 'electrical',
        svgPath: 'M 0 12 L 0 49 M 17 -20 L 2 5 M -5 -21 L 5 -21 M -5 -27 L 5 -37 M -5 -37 L 5 -27 M 0 -22 L 0 -52 M -4,8 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M -4,8 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M 12 -11 L 17 -8 M 8 -4 L 24 7 M 14 6 L 24 7 M 24 7 L 20 -2 M 16 -7 L 20 -12 M 19 -12 L 26 -7 M 23 -3 L 26 -8 M 22 -4 L 29 0',
        strokeColor: '#2563eb',
        fillColor: '#ffffff',
        metadata: {
            description: 'Protección integral automática monofásica',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'PIA-1P'
        }
    },
    {
        id: 'pia_3p',
        name: 'PIA Trifásica',
        category: 'electrical',
        svgPath: 'M 0 12 L 0 49 M 17 -20 L 2 5 M -5 -21 L 5 -21 M -5 -27 L 5 -37 M -5 -37 L 5 -27 M 0 -22 L 0 -52 M -4,8 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M -4,8 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M 12 -11 L 17 -8 M 8 -4 L 24 7 M 14 6 L 24 7 M 24 7 L 20 -2 M 16 -7 L 20 -12 M 19 -12 L 26 -7 M 23 -3 L 26 -8 M 22 -4 L 29 0',
        strokeColor: '#2563eb',
        fillColor: '#ffffff',
        metadata: {
            description: 'Protección integral automática trifásica',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'PIA-3P'
        }
    },

    {
        id: 'diff_switch',
        name: 'Interruptor Diferencial Monofásico',
        category: 'electrical',
        svgPath: 'M -4,9 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M -4,9 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M 0 50 L 0 13 M -6 -21 L 6 -21 M 0 -21 L 0 -51 M -7 -28 L 7 -36 M -8 -36 L 7 -28 M 2 5 L 17 -19 M 20 -7 L 32 -7 M 32 -7 L 32 1 M 32 1 L 20 1 M 20 1 L 20 -7 M 7 -3 L 19 -3 M 26 2 L 26 30 M -9,29 a 9,3 0 1,0 18,0 a 9,3 0 1,0 -18,0 M -9,29 a 9,3 0 1,0 18,0 a 9,3 0 1,0 -18,0 M 9 29 L 26 29',
        strokeColor: '#7c3aed',
        fillColor: '#ffffff',
        metadata: {
            description: 'Interruptor diferencial monofásico (ID)',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'ID-1P'
        }
    },
    {
        id: 'id_3p',
        name: 'Interruptor Diferencial Trifásico',
        category: 'electrical',
        svgPath: 'M -4,9 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M -4,9 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0 M 0 50 L 0 13 M -6 -21 L 6 -21 M 0 -21 L 0 -51 M -7 -28 L 7 -36 M -8 -36 L 7 -28 M 2 5 L 17 -19 M 20 -7 L 32 -7 M 32 -7 L 32 1 M 32 1 L 20 1 M 20 1 L 20 -7 M 7 -3 L 19 -3 M 26 2 L 26 30 M -9,29 a 9,3 0 1,0 18,0 a 9,3 0 1,0 -18,0 M -9,29 a 9,3 0 1,0 18,0 a 9,3 0 1,0 -18,0 M 9 29 L 26 29',
        strokeColor: '#7c3aed',
        fillColor: '#ffffff',
        metadata: {
            description: 'Interruptor diferencial trifásico (ID)',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'ID-3P'
        }
    },

    // --- Motores y arranque ---
    {
        id: 'gm_thermo',
        name: 'Guarda Motor Magnetotérmico',
        category: 'electrical',
        svgPath: 'M -7 0 h 15 v 40 h -15 z M 0 -50 L 0 -30 M -5 -30 L 5 -30 M -8 20 L 8 20 M 0 5 L 5 5 M -1 14 L 5 14 M 4 5 L 4 15 M 0 14 L 0 20 M 0 -10 L 0 6 M 0 40 L 0 50 M -40 -26 h 10 v 10 h -10 z M -48 -21 L -11 -21 M -35 -26 L -35 30 M -35 10 L -7 10 M -35 30 L -8 30 M -15 -25 L 0 -10 M -48 -26 L -48 -16',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        textElements: [
            { text: 'Ɪ>', x: -7, y: 27, width: 15, fontSize: 10, fontStyle: 'bold', align: 'center', fill: '#000000' }
        ],
        metadata: {
            description: 'Guarda motor magnetotérmico',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'GM-MT'
        }
    },
    {
        id: 'gm_mag',
        name: 'Guarda Motor Magnético',
        category: 'electrical',
        svgPath: 'M -7 0 h 15 v 18 h -15 z M 0 -50 L 0 -30 M -5 -30 L 5 -30 M 0 -11 L 0 1 M 0 19 L 0 29 M -40 -26 h 10 v 10 h -10 z M -48 -21 L -11 -21 M -35 -26 L -35 11 M -35 10 L -7 10 M -15 -25 L 0 -10 M -48 -26 L -48 -16',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        textElements: [
            { text: 'Ɪ>', x: -7, y: 6, width: 15, fontSize: 10, fontStyle: 'bold', align: 'center', fill: '#000000' }
        ],
        metadata: {
            description: 'Guarda motor magnético',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'GM-M'
        }
    },
    {
        id: 'contactor',
        name: 'Contactor',
        category: 'electrical',
        svgPath: 'M 20 -10 h 15 v 7 h -15 z M 28 -10 L 28 -20 M 28 -2 L 28 8 M 25,-22 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M 26,10 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M -6 -6 L 20 -6 M 0 0 L 0 20 M 0 0 L -10 -10 M 0 -10 L 0 -30',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        metadata: {
            description: 'Contactor',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'KM'
        }
    },
    {
        id: 'thermal_relay',
        name: 'Relé Térmico',
        category: 'electrical',
        svgPath: 'M 0 -4 L 12 -4 M 0 3 L 11 3 M 12 -5 L 12 4 M 0 -23 L 0 -3 M 0 3 L 0 23 M -22 -9 h 45 v 18 h -45 z',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        metadata: {
            description: 'Relé térmico de sobrecarga',
            normative: 'AEA 90364-5-53',
            defaultLabel: 'F'
        }
    }
];
