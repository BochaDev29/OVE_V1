import type { ProjectConfig } from '../../../lib/electrical-rules';
import type { SymbolItem } from '../../../types/planner';
import type { PaperFormat } from '../../../types/floors';

/**
 * Generador automático de diagrama unifilar
 * 
 * Genera la estructura base del diagrama unifilar a partir de la configuración
 * del Wizard Step 3, incluyendo:
 * - Acometida (medidor, térmica general)
 * - Tableros (TP, TS, TSG)
 * - Protecciones (diferenciales, PIAs)
 * - Circuitos terminales
 * - Sistema PAT (bornera, jabalina)
 * 
 * El diagrama generado es 100% editable por el usuario.
 */

// ============================================================================
// SISTEMA DE GRILLA
// ============================================================================

/** Configuración del rótulo (fijo en esquina inferior derecha) */
const ROTULO_CONFIG = {
    altoMm: 50,      // Alto del rótulo en mm
    altoPx: Math.round((50 / 25.4) * 96),  // ~189px a 96 DPI
    margenMm: 10     // Margen de seguridad
};

/** Márgenes de la hoja */
const MARGENES = {
    superior: 20,    // px
    inferior: 20,    // px
    izquierdo: 20,   // px
    derecho: 20      // px
};

/** Tamaño de celda de grilla */
const CELDA_CONFIG = {
    ancho: 120,  // px
    alto: 80     // px
};

// ============================================================================
// SISTEMA DE JERARQUÍA (ÁRBOL)
// ============================================================================

/** Nodo del árbol jerárquico de tableros y circuitos */
interface TreeNode {
    panel: any | null;  // Panel o null para raíz (acometida)
    circuits: any[];    // Circuitos que pertenecen a este panel
    children: TreeNode[];  // Tableros hijos
    level: number;      // Profundidad en el árbol (0 = acometida, 1 = TP, 2 = TSG/TS)
    row: number;        // Fila de grilla asignada (-1 = no asignada)
    col: number;        // Columna de grilla (relativa al centro, 0 = centro)
}

/**
 * Construye árbol jerárquico desde la configuración del Wizard
 * Usa parentId para determinar relaciones padre-hijo
 */
function buildHierarchyTree(config: ProjectConfig): TreeNode {
    console.log('🌳 Construyendo árbol jerárquico...');

    // Función recursiva para construir nodos
    function buildNode(panel: any | null, level: number): TreeNode {
        const children: TreeNode[] = [];

        if (panel) {
            // Encontrar tableros hijos (usan parentId)
            const childPanels = config.panels?.filter(p => p.parentId === panel.id) || [];
            console.log(`  📦 Panel ${panel.name} tiene ${childPanels.length} hijos`);
            children.push(...childPanels.map(cp => buildNode(cp, level + 1)));
        }

        // Encontrar circuitos de este panel
        const circuits = config.circuitInventoryForCAD?.filter(
            c => c.panelId === panel?.id
        ) || [];

        if (circuits.length > 0) {
            console.log(`  🔌 Panel ${panel?.name || 'Acometida'} tiene ${circuits.length} circuitos`);
        }

        return {
            panel,
            circuits,
            children,
            level,
            row: -1,  // Se asignará después
            col: 0    // Se asignará después
        };
    }

    // Raíz del árbol: Acometida (no es un panel, es el punto de entrada)
    // Luego viene TP (Tablero Principal) que NO tiene parentId
    const rootPanel = config.panels?.find(p => p.type === 'TP' && !p.parentId) || null;

    if (!rootPanel) {
        console.warn('⚠️ No se encontró Tablero Principal (TP) sin parentId');
    }

    const tree = buildNode(rootPanel, 1);  // TP es nivel 1 (acometida sería nivel 0)

    console.log('✅ Árbol construido:', tree);
    return tree;
}

/**
 * Asigna posiciones de grilla a cada nodo del árbol
 * Reglas:
 * - Hermanos (mismo padre) → Misma fila, columnas adyacentes
 * - Hijos → Fila siguiente, centrados bajo el padre
 * - Líneas conectoras (LP, CS, CT) → Ocupan 1 fila cada una
 */
function assignGridPositions(
    node: TreeNode,
    currentRow: number,
    col: number
): number {
    node.row = currentRow;
    node.col = col;

    console.log(`  📍 Asignando posición: ${node.panel?.name || 'Acometida'} → fila ${currentRow}, col ${col}`);

    // Si no tiene hijos, solo ocupa su fila + espacio para circuitos terminales
    if (node.children.length === 0) {
        const circuitRows = node.circuits.length > 0 ? 2 : 0; // Fila para PIAs + fila para CTs
        return currentRow + 1 + circuitRows;
    }

    // Calcular distribución horizontal de hijos
    const childCount = node.children.length;
    const totalWidth = childCount;
    const startCol = col - Math.floor(totalWidth / 2);

    // Fila para línea conectora (LP o CS)
    const connectorRow = currentRow + 1;

    // Fila para hijos
    const childRow = connectorRow + 1;

    // Asignar posiciones a hijos recursivamente
    let maxChildRow = childRow;
    node.children.forEach((child, index) => {
        const childCol = startCol + index;
        const childEndRow = assignGridPositions(child, childRow, childCol);
        maxChildRow = Math.max(maxChildRow, childEndRow);
    });

    return maxChildRow;
}

/**
 * Genera símbolos y conexiones desde el árbol jerárquico
 * Usa las posiciones asignadas en el árbol para posicionar elementos
 */
function generateFromTree(
    node: TreeNode,
    grilla: ConfigGrilla,
    areaTrabajo: AreaDeTrabajo,
    config: ProjectConfig,
    isTrifasico: boolean,
    parentSymbol: SymbolItem | null = null
): { symbols: SymbolItem[]; pipes: any[] } {
    const symbols: SymbolItem[] = [];
    const pipes: any[] = [];

    console.log(`🔨 Generando desde nodo: ${node.panel?.name || 'Raíz'} (fila ${node.row}, col ${node.col})`);

    // 1. GENERAR PANEL (si existe)
    let panelSymbols: SymbolItem[] = [];
    if (node.panel) {
        const panelPx = grillaAPixeles(
            { fila: node.row, col: node.col, filaSpan: 1, colSpan: 1 }
        );

        const panelResult = generatePanel(node.panel, config, panelPx.x, panelPx.y, isTrifasico);
        symbols.push(...panelResult.symbols);
        pipes.push(...panelResult.pipes);
        panelSymbols = panelResult.symbols;

        // 2. LÍNEA CONECTORA desde padre (LP o CS)
        // Solo para nodos que NO son la raíz (TP)
        // La LP desde acometida→TP se genera en la función principal
        if (parentSymbol && panelSymbols.length > 0 && node.level > 1) {
            const lineType = node.level === 2 ? 'CS' : 'CS';  // Nivel 2+ siempre es CS
            const connectorRow = node.row - 1;  // Fila anterior al panel
            const connectorPx = grillaAPixeles(
                { fila: connectorRow, col: node.col, filaSpan: 1, colSpan: 1 }
            );

            // Línea vertical desde padre hasta este panel
            pipes.push({
                id: generateSymbolId(`${lineType.toLowerCase()}-${node.panel.id}`),
                type: 'line',
                points: [
                    parentSymbol.x,
                    parentSymbol.y + 20,
                    connectorPx.x,
                    connectorPx.y + grilla.altoCelda
                ],
                color: '#000000',
                strokeWidth: 2,
                layer: 'layer-0',
                label: lineType
            });
        }
    }

    // 3. GENERAR HIJOS RECURSIVAMENTE
    if (node.children.length > 0) {
        const lastSymbol = panelSymbols.length > 0
            ? panelSymbols[panelSymbols.length - 1]
            : parentSymbol;

        node.children.forEach(child => {
            const childResult = generateFromTree(
                child,
                grilla,
                areaTrabajo,
                config,
                isTrifasico,
                lastSymbol
            );
            symbols.push(...childResult.symbols);
            pipes.push(...childResult.pipes);
        });
    }

    return { symbols, pipes };
}

/** Área de trabajo disponible (hoja - rótulo - márgenes) */
interface AreaDeTrabajo {
    origenX: number;  // Píxeles desde borde izquierdo
    origenY: number;  // Píxeles desde borde superior
    ancho: number;    // Ancho disponible en píxeles
    alto: number;     // Alto disponible en píxeles
}

/** Configuración de la grilla */
interface ConfigGrilla {
    anchoCelda: number;   // px
    altoCelda: number;    // px
    columnas: number;     // Total de columnas
    filas: number;        // Total de filas
    colCentro: number;    // Índice de columna central (columna 0)
}

/** Posición en la grilla (con columna 0 centrada) */
interface PosicionGrilla {
    fila: number;      // 0-indexado desde arriba
    col: number;       // Relativo al centro (ej: -2, -1, 0, 1, 2)
    filaSpan: number;  // Cuántas filas ocupa
    colSpan: number;   // Cuántas columnas ocupa
}

/**
 * Calcula el área de trabajo disponible
 * (hoja - rótulo - márgenes)
 */
function calcularAreaDeTrabajo(formato: PaperFormat): AreaDeTrabajo {
    return {
        origenX: MARGENES.izquierdo,
        origenY: MARGENES.superior,
        ancho: formato.widthPx - MARGENES.izquierdo - MARGENES.derecho,
        alto: formato.heightPx - MARGENES.superior - MARGENES.inferior - ROTULO_CONFIG.altoPx - 10
    };
}

/**
 * Crea la configuración de grilla basada en el área de trabajo
 */
function crearGrilla(areaTrabajo: AreaDeTrabajo): ConfigGrilla {
    const totalCols = Math.floor(areaTrabajo.ancho / CELDA_CONFIG.ancho);
    const totalFilas = Math.floor(areaTrabajo.alto / CELDA_CONFIG.alto);

    return {
        anchoCelda: CELDA_CONFIG.ancho,
        altoCelda: CELDA_CONFIG.alto,
        columnas: totalCols,
        filas: totalFilas,
        colCentro: Math.floor(totalCols / 2)  // Columna central
    };
}

/**
 * Convierte posición de grilla a píxeles
 * SIMPLIFICADO: Usa posiciones fijas centradas
 */
function grillaAPixeles(
    pos: PosicionGrilla
): { x: number, y: number } {
    // Posición X fija centrada (mitad de la hoja)
    const centroX = 500;  // Centro fijo para A4 landscape (~1000px de ancho)

    // Posición Y simple desde arriba
    const y = 20 + (pos.fila * 80);  // 20px margen + 80px por fila

    return {
        x: centroX + (pos.col * 120),  // Offset horizontal desde centro
        y: y
    };
}

// ============================================================================
// OPCIONES DE GENERACIÓN (LEGACY - mantener por compatibilidad)
// ============================================================================

interface UnifilarGenerationOptions {
    /** Espaciado vertical entre elementos (px) */
    verticalSpacing?: number;
    /** Espaciado horizontal para jerarquía (px) */
    horizontalSpacing?: number;
    /** Posición inicial X */
    startX?: number;
    /** Posición inicial Y */
    startY?: number;
    /** Formato de hoja (para sistema de grilla) */
    sheetFormat?: PaperFormat;
}

const DEFAULT_OPTIONS: UnifilarGenerationOptions = {
    verticalSpacing: 80,
    horizontalSpacing: 200,
    startX: 100,
    startY: 100
};

let symbolIdCounter = 0;

/**
 * Genera un ID único para símbolos
 */
function generateSymbolId(prefix: string = 'unifilar'): string {
    return `${prefix}-${Date.now()}-${symbolIdCounter++}`;
}

/**
 * Crea una línea de conexión (pipe) entre dos símbolos
 */
function createConnectionPipe(from: SymbolItem, to: SymbolItem): any {
    return {
        id: generateSymbolId('pipe'),
        points: [from.x, from.y, to.x, to.y],
        color: '#000000',
        type: 'straight',
        layer: 'layer-0'
    };
}

/**
 * Genera el diagrama unifilar completo desde la configuración del proyecto
 * Usa sistema de grilla con columna 0 centrada
 */
export function generateUnifilarDiagram(
    config: ProjectConfig,
    options: UnifilarGenerationOptions = {}
): { symbols: SymbolItem[]; pipes: any[] } {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const symbols: SymbolItem[] = [];
    const pipes: any[] = [];

    // Detectar si es trifásico (desde voltage del proyecto)
    const isTrifasico = config.voltage === '380V';

    // ============================================================================
    // SISTEMA DE GRILLA
    // ============================================================================

    // Si no se proporciona formato de hoja, usar valores legacy
    if (!opts.sheetFormat) {
        console.warn('⚠️ No se proporcionó formato de hoja, usando posicionamiento legacy');
        const legacyOpts = {
            verticalSpacing: opts.verticalSpacing || DEFAULT_OPTIONS.verticalSpacing!,
            horizontalSpacing: opts.horizontalSpacing || DEFAULT_OPTIONS.horizontalSpacing!,
            startX: opts.startX || DEFAULT_OPTIONS.startX!,
            startY: opts.startY || DEFAULT_OPTIONS.startY!
        };
        return generateUnifilarDiagramLegacy(config, legacyOpts, isTrifasico);
    }

    // Calcular área de trabajo y grilla
    const areaTrabajo = calcularAreaDeTrabajo(opts.sheetFormat);
    const grilla = crearGrilla(areaTrabajo);

    console.log('📐 Sistema de Grilla:', {
        formato: `${opts.sheetFormat.name} ${opts.sheetFormat.orientation}`,
        areaTrabajo: `${areaTrabajo.ancho}×${areaTrabajo.alto}px`,
        grilla: `${grilla.columnas} cols × ${grilla.filas} filas`,
        colCentro: grilla.colCentro,
        isTrifasico,
        panels: config.panels?.length || 0,
        circuits: config.circuitInventoryForCAD?.length || 0
    });

    // ============================================================================
    // 🆕 CONSTRUCCIÓN DEL ÁRBOL JERÁRQUICO
    // ============================================================================

    const hierarchyTree = buildHierarchyTree(config);

    console.log('🌳 Árbol jerárquico completo:', {
        rootPanel: hierarchyTree.panel?.name || 'Sin TP',
        level: hierarchyTree.level,
        circuits: hierarchyTree.circuits.length,
        children: hierarchyTree.children.length,
        childrenNames: hierarchyTree.children.map(c => c.panel?.name)
    });

    // ============================================================================
    // 🆕 ASIGNACIÓN DE POSICIONES EN GRILLA
    // ============================================================================

    console.log('📍 Asignando posiciones en grilla...');

    // Acometida ocupa filas 0-2 (feed, meter, breaker)
    // Fila 3 para LP
    // Fila 4 para TP
    const tpStartRow = 2;  // TP empieza en fila 2 (más arriba para evitar rótulo)
    const maxRow = assignGridPositions(hierarchyTree, tpStartRow, 0);

    console.log(`✅ Posiciones asignadas. Filas totales: ${maxRow}`);

    let filaActual = 0;

    // ============================================================================
    // 1. ACOMETIDA (centrada en col 0)
    // ============================================================================

    const acometidaPos: PosicionGrilla = { fila: filaActual, col: 0, filaSpan: 2, colSpan: 1 };
    const acometidaPx = grillaAPixeles(acometidaPos);

    const acometidaResult = generateAcometida(config, acometidaPx.x, acometidaPx.y, isTrifasico);
    symbols.push(...acometidaResult.symbols);

    // Conexiones verticales dentro de acometida
    if (acometidaResult.symbols.length >= 2) {
        pipes.push(createConnectionPipe(acometidaResult.symbols[0], acometidaResult.symbols[1]));
    }
    if (acometidaResult.symbols.length >= 3) {
        pipes.push(createConnectionPipe(acometidaResult.symbols[1], acometidaResult.symbols[2]));
    }

    filaActual += 3; // Acometida ocupa 3 filas (feed, meter, breaker)

    // ============================================================================
    // 2. TABLEROS (GENERACIÓN JERÁRQUICA)
    // ============================================================================

    console.log('🌳 Generando tableros desde árbol jerárquico...');

    // Generar línea LP desde acometida hasta TP
    if (acometidaResult.symbols.length > 0 && hierarchyTree.panel) {
        const lpEndRow = tpStartRow;
        const lpEndPx = grillaAPixeles({ fila: lpEndRow, col: 0, filaSpan: 1, colSpan: 1 });

        const lastAcometidaSymbol = acometidaResult.symbols[acometidaResult.symbols.length - 1];
        pipes.push({
            id: generateSymbolId('lp-main'),
            type: 'line',
            points: [lastAcometidaSymbol.x, lastAcometidaSymbol.y + 20, lpEndPx.x, lpEndPx.y],
            color: '#000000',
            strokeWidth: 2,
            layer: 'layer-0',
            label: 'LP'
        });
    }

    // Generar tableros desde el árbol jerárquico
    const treeResult = generateFromTree(
        hierarchyTree,
        grilla,
        areaTrabajo,
        config,
        isTrifasico,
        acometidaResult.symbols.length > 0 ? acometidaResult.symbols[acometidaResult.symbols.length - 1] : null
    );

    symbols.push(...treeResult.symbols);
    pipes.push(...treeResult.pipes);

    console.log(`✅ Diagrama generado: ${symbols.length} símbolos, ${pipes.length} conexiones`);

    return { symbols, pipes };
}

/**
 * Generación legacy (sin grilla) - mantener por compatibilidad
 */
function generateUnifilarDiagramLegacy(
    config: ProjectConfig,
    opts: { verticalSpacing: number; horizontalSpacing: number; startX: number; startY: number },
    isTrifasico: boolean
): { symbols: SymbolItem[]; pipes: any[] } {
    const symbols: SymbolItem[] = [];
    const pipes: any[] = [];

    let currentY = opts.startY;
    const baseX = opts.startX;

    console.log('🔧 Generando diagrama unifilar (legacy):', {
        isTrifasico,
        panels: config.panels?.length || 0,
        circuits: config.circuitInventoryForCAD?.length || 0
    });

    // 1. ACOMETIDA (Red → Medidor → Térmica General)
    const acometidaResult = generateAcometida(config, baseX, currentY, isTrifasico);
    symbols.push(...acometidaResult.symbols);
    currentY = acometidaResult.nextY;

    // Conexiones de acometida
    if (acometidaResult.symbols.length >= 2) {
        // Línea: Feed Point → Meter
        pipes.push(createConnectionPipe(
            acometidaResult.symbols[0],
            acometidaResult.symbols[1]
        ));

        // Línea: Meter → Main Breaker
        if (acometidaResult.symbols.length >= 3) {
            pipes.push(createConnectionPipe(
                acometidaResult.symbols[1],
                acometidaResult.symbols[2]
            ));
        }
    }

    // 2. TABLEROS (TP, TS, TSG)
    if (config.panels && config.panels.length > 0) {
        currentY += opts.verticalSpacing!;

        config.panels.forEach((panel, index) => {
            const panelX = baseX + (index * opts.horizontalSpacing!);
            const panelResult = generatePanel(panel, config, panelX, currentY, isTrifasico);
            symbols.push(...panelResult.symbols);

            // Conexión: Main Breaker → Panel Label
            if (acometidaResult.symbols.length > 0 && panelResult.symbols.length > 0) {
                pipes.push(createConnectionPipe(
                    acometidaResult.symbols[acometidaResult.symbols.length - 1],
                    panelResult.symbols[0]
                ));
            }

            // Conexiones internas del panel
            pipes.push(...panelResult.pipes);
        });
    }

    console.log(`✅ Diagrama generado: ${symbols.length} símbolos, ${pipes.length} conexiones`);

    return { symbols, pipes };
}

/**
 * Genera símbolos de acometida (red → medidor → térmica general)
 */
function generateAcometida(
    config: ProjectConfig,
    x: number,
    y: number,
    isTrifasico: boolean
): { symbols: SymbolItem[]; nextY: number } {
    const symbols: SymbolItem[] = [];
    let currentY = y;

    // 1. Punto de alimentación (red)
    symbols.push({
        id: generateSymbolId('feed'),
        type: 'feed_point',
        x,
        y: currentY,
        rotation: 0,
        label: isTrifasico ? '3x380V + N + PE' : '220V + PE',
        fontSize: 12,
        layer: 'layer-0',
        autoGenerated: true
    });

    currentY += 60;

    // 2. Medidor
    symbols.push({
        id: generateSymbolId('meter'),
        type: 'meter',
        x,
        y: currentY,
        rotation: 0,
        label: 'kWh',
        fontSize: 12,
        layer: 'layer-0',
        autoGenerated: true
    });

    currentY += 60;

    // 3. Térmica general (main breaker)
    // Obtener rating desde el primer panel TP
    const tpPanel = (config as any).panels?.find((p: any) => p.type === 'TP');
    const mainBreakerRating = tpPanel?.protections?.headers?.[0]?.rating || (isTrifasico ? 63 : 40);
    const mainBreakerLabel = isTrifasico
        ? `4x${mainBreakerRating}A`
        : `2x${mainBreakerRating}A`;

    symbols.push({
        id: generateSymbolId('main-breaker'),
        type: 'main_breaker',
        x,
        y: currentY,
        rotation: 0,
        label: mainBreakerLabel,
        fontSize: 12,
        layer: 'layer-0',
        autoGenerated: true
    });

    currentY += 80;

    return { symbols, nextY: currentY };
}

/**
 * Genera símbolos de un tablero como contenedor con protecciones internas
 */
function generatePanel(
    panel: any,
    config: ProjectConfig,
    x: number,
    y: number,
    isTrifasico: boolean
): { symbols: SymbolItem[]; pipes: any[]; nextY: number } {
    const symbols: SymbolItem[] = [];
    const pipes: any[] = [];

    const BOARD_WIDTH = 300;
    const HEADER_HEIGHT = 50;
    const PROTECTION_HEIGHT = 60;
    const PADDING = 20;

    let internalY = y + HEADER_HEIGHT + PADDING;

    // 1. ENCABEZADO DEL TABLERO
    const headerText = `${panel.name} - ${panel.results?.modules || 12} módulos ${panel.results?.ip || 'IP40'}`;
    symbols.push({
        id: generateSymbolId('board-header'),
        type: 'text',
        x: x,
        y: y + 20,
        rotation: 0,
        label: headerText,
        fontSize: 14,
        color: '#1e40af',
        layer: 'layer-0',
        autoGenerated: true
    });

    // 2. PROTECCIONES DE CABECERA
    const headers = panel.protections?.headers || [];

    console.log(`📋 Panel ${panel.name}:`, {
        hasProtections: !!panel.protections,
        headersCount: headers.length,
        headers: headers.map((h: any) => ({ id: h.id, type: h.type, rating: h.rating, feeds: h.feeds })),
        hasGrounding: !!panel.grounding,
        hasPAT: panel.grounding?.hasPAT
    });

    const mainHeader = headers[0]; // Protección principal (ID o PIA)

    if (mainHeader) {
        const headerLabel = mainHeader.type === 'ID'
            ? generateDiffLabel(mainHeader, isTrifasico)
            : generatePIALabel({ protection: mainHeader });

        const headerType = mainHeader.type === 'ID' ? 'diff_switch' :
            (isTrifasico ? 'tm_4p' : 'tm_2p');

        // Símbolo de protección de cabecera (centrado)
        const headerSymbol: SymbolItem = {
            id: generateSymbolId('header-prot'),
            type: headerType as any,
            x: x,  // Centrado en X (igual que el tablero)
            y: internalY,
            rotation: 0,
            label: headerLabel,
            fontSize: 11,
            layer: 'layer-0',
            autoGenerated: true
        };
        symbols.push(headerSymbol);

        // 2.1 BORNERA PAT (al costado de la protección de cabecera si aplica)
        if (panel.grounding?.hasPAT) {
            symbols.push({
                id: generateSymbolId('ground-busbar'),
                type: 'rect',  // Temporal: usar rect hasta crear símbolo ground_busbar
                x: x + BOARD_WIDTH - 80,
                y: internalY,
                rotation: 0,
                label: 'Bornera PAT',
                fontSize: 9,
                layer: 'layer-0',
                autoGenerated: true
            });
        }

        internalY += PROTECTION_HEIGHT + 20;

        // 3. ELEMENTOS QUE ALIMENTA LA CABECERA
        let fedElements = mainHeader.feeds || [];

        // Obtener todos los circuitos del panel
        const panelCircuits = config.circuitInventoryForCAD?.filter(
            c => c.panelId === panel.id
        ) || [];
        let fedCircuits = fedElements; // Initialize fedCircuits

        // Si no hay feeds definidos, usar todos los circuitos del panel
        if (fedElements.length === 0) {
            fedCircuits = panelCircuits;
            console.log(`⚠️ No feeds defined, using all ${fedCircuits.length} circuits from panel`);
        }

        console.log(`🔌 Fed elements:`, fedCircuits.map((c: any) => c.id));

        if (fedCircuits.length > 1) {
            // PEINE HORIZONTAL (busbar)
            const busbarY = internalY;

            // 🆕 Calcular ancho del peine basado en cantidad de PIAs
            const piaSpacing = 60;
            // El peine debe cubrir desde el primer PIA hasta el último: (n-1) espacios
            const busbarWidth = (fedCircuits.length - 1) * piaSpacing;

            // 🆕 Centrar peine bajo el tablero (x es el centro del tablero)
            const busbarStartX = x - (busbarWidth / 2);
            const busbarEndX = x + (busbarWidth / 2);

            // ✅ LÍNEA HORIZONTAL: ambos puntos Y deben ser iguales
            pipes.push({
                id: generateSymbolId('busbar'),
                type: 'line',
                points: [busbarStartX, busbarY, busbarEndX, busbarY],  // Mismo Y para ambos puntos
                color: '#000000',
                strokeWidth: 3,
                layer: 'layer-0',
                isBusbar: true
            });

            // Línea vertical desde cabecera al peine
            const busbarCenterX = x;  // El centro del peine es el centro del tablero
            pipes.push({
                id: generateSymbolId('header-to-busbar'),
                type: 'line',
                points: [headerSymbol.x, headerSymbol.y + 20, busbarCenterX, busbarY],
                color: '#000000',
                strokeWidth: 2,
                layer: 'layer-0'
            });

            internalY += 40;

            // PIAs de circuitos conectados al peine
            // Las PIAs extremas deben estar en los extremos del peine
            const piasStartX = busbarStartX; // Primera PIA en el inicio del peine

            fedCircuits.forEach((circuit: any, index: number) => {
                const elementX = piasStartX + (index * piaSpacing);

                const piaType = (isTrifasico && circuit.cable?.conductors === 4 ? 'tm_4p' : 'tm_2p') as 'tm_2p' | 'tm_4p';

                const piaSymbol: SymbolItem = {
                    id: generateSymbolId(`pia-${circuit.id}`),
                    type: piaType,
                    x: elementX,
                    y: internalY,
                    rotation: 0,
                    label: `${circuit.designation || circuit.id}`,
                    fontSize: 9,
                    layer: 'layer-0',
                    autoGenerated: true,
                    circuitId: circuit.id
                };
                symbols.push(piaSymbol);

                // Línea desde peine a PIA (vertical)
                pipes.push({
                    id: generateSymbolId('busbar-to-pia'),
                    type: 'line',
                    points: [elementX, busbarY, elementX, internalY],
                    color: '#000000',
                    strokeWidth: 2,
                    layer: 'layer-0'
                });

                // 🆕 LÍNEA CT (Circuito Terminal) - Flecha saliendo de la PIA
                const ctArrowY = internalY + PROTECTION_HEIGHT + 20;
                pipes.push({
                    id: generateSymbolId(`ct-${circuit.id}`),
                    type: 'arrow',
                    points: [elementX, internalY + PROTECTION_HEIGHT, elementX, ctArrowY],
                    color: '#000000',
                    strokeWidth: 1.5,
                    layer: 'layer-0',
                    label: circuit.designation || circuit.id
                });
            });

            internalY += PROTECTION_HEIGHT + 40; // Espacio para PIAs + flechas CT
        } else if (fedCircuits.length === 1) {
            // Solo un circuito, conexión directa
            const circuit = fedCircuits[0];
            const piaLabel = generatePIALabel(circuit);
            const piaType = (isTrifasico && circuit.cable?.conductors === 4 ? 'tm_4p' : 'tm_2p') as 'tm_2p' | 'tm_4p';

            const piaSymbol: SymbolItem = {
                id: generateSymbolId(`pia-${circuit.id}`),
                type: piaType,
                x: x + PADDING,
                y: internalY,
                rotation: 0,
                label: `${circuit.designation || circuit.id} - ${piaLabel}`,
                fontSize: 10,
                layer: 'layer-0',
                autoGenerated: true,
                circuitId: circuit.id
            };
            symbols.push(piaSymbol);

            // Conexión directa
            pipes.push(createConnectionPipe(headerSymbol, piaSymbol));

            internalY += PROTECTION_HEIGHT;
        }
    }

    // 4. TODO: RECTÁNGULO CONTENEDOR DEL TABLERO
    // Necesitamos crear un tipo de geometría apropiado para el contenedor
    // Por ahora, las protecciones se generan sin contenedor visual

    return { symbols, pipes, nextY: internalY + PADDING };
}

/**
 * Genera etiqueta técnica para una PIA
 */
function generatePIALabel(circuit: any): string {
    const poles = circuit.cable?.conductors === 4 ? 4 : 2;
    const rating = circuit.protection?.rating || 10;
    const curve = circuit.protection?.curve || 'C';
    const icu = circuit.protection?.breakingCapacity || 3;

    return `${poles}x${rating}A ${curve} ${icu}kA`;
}

/**
 * Genera etiqueta técnica para un diferencial
 */
function generateDiffLabel(diffHeader: any, isTrifasico: boolean): string {
    const poles = isTrifasico ? 4 : 2;
    const rating = diffHeader.rating || 25;
    const sensitivity = diffHeader.sensitivity || 30;

    return `${poles}x${rating}A ${sensitivity}mA`;
}


