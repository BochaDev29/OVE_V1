/**
 * ============================================================================
 * PASO 3: CONFIGURACIÓN DE TABLEROS Y DISTRIBUCIÓN
 * ============================================================================
 * 
 * RESPONSABILIDADES:
 * 1. Crear estructura jerárquica de tableros (TP → TSG → TS)
 * 2. Configurar líneas de entrada para cada tablero (LP, CS)
 * 3. Asignar circuitos del inventario a tableros específicos
 * 4. Configurar protecciones (PIA, ID) y gabinetes
 * 5. Configurar método de instalación para circuitos terminales (CT)
 * 
 * FLUJO DE DATOS:
 * - ENTRADA: config.circuitInventory (generado en Step 2)
 * - SALIDA: config.panels (estructura de tableros con circuitos asignados)
 * 
 * CONCEPTOS CLAVE:
 * - LP (Línea Principal): Cable desde Medidor (M) hasta Tablero Principal (TP)
 *   - Distancia máxima: 2m (AEA 770 Cl. 770.4.2)
 *   - Método típico: B1 (Embutido en pared)
 * 
 * - CS (Circuito Seccional): Cable desde TP hasta TSG/TS
 *   - Distancia variable según proyecto
 *   - Método configurable (B1, B2, D1, D2)
 * 
 * - CT (Circuito Terminal): Cable desde Tablero hasta Boca/Punto de utilización
 *   - Configurado en terminalLine de cada CircuitInventoryItem
 *   - Longitud promedio: 10m (editable por usuario)
 *   - Método configurable por circuito individual
 * 
 * JERARQUÍA DE TABLEROS:
 * - TP (Tablero Principal): Siempre presente, recibe LP desde M
 * - TSG (Tablero Seccional General): Opcional, para distribución interior
 * - TS (Tablero Seccional): Opcional, para dependencias/plantas adicionales
 * 
 * NORMATIVA:
 * - Todos los tableros DEBEN tener PIA de cabecera (para cortar energía)
 * - ID (Diferencial) es opcional por flexibilidad económica
 * - Solo se usa Cobre (Cu) en instalaciones no fabriles
 * 
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Plus, Trash2, GitMerge, AlertCircle, Box, ChevronDown, ChevronUp, ChevronRight, Shield, ShieldCheck, AlertTriangle, Zap, Package, ArrowRight, Activity, TrendingDown, MessageSquare, MessageSquareText } from 'lucide-react';
import {
    ProjectConfig,
    Panel,
    CircuitInventory,
    CircuitInventoryItem,
    getOrphanCircuits,
    getCircuitsForPanel,
    calculatePanelDPMS,
    calculatePanelIb,
    hasOrphanCircuits,
    getDiagnostics,
    LineLink,
    selectOptimalCableAndProtection,
    calculateIz,
    LOADED_CIRCUIT_TYPES
} from '../../lib/electrical-rules';
import { PanelInputSection } from './panels/PanelInputSection';
import { PanelContentSection } from './panels/PanelContentSection';
import { PanelOutputSection } from './panels/PanelOutputSection';
import HelpPanel from './HelpPanel';
import { generateCircuitInventoryForCAD } from '../../lib/planner/helpers/circuitInventoryGenerator';


// Tabla de diámetros de cañería según método de instalación
const CONDUIT_SIZES: Record<string, Array<{ diameter: string; maxSection: number }>> = {
    'B1': [ // Embutido en pared
        { diameter: '13mm', maxSection: 2.5 },
        { diameter: '19mm', maxSection: 6 },
        { diameter: '25mm', maxSection: 10 },
        { diameter: '32mm', maxSection: 25 },
    ],
    'B2': [ // Sobre pared / Bandeja
        { diameter: '19mm', maxSection: 4 },
        { diameter: '25mm', maxSection: 10 },
        { diameter: '32mm', maxSection: 25 },
        { diameter: '40mm', maxSection: 35 },
    ],
    'D1': [ // Caño enterrado
        { diameter: '25mm', maxSection: 6 },
        { diameter: '32mm', maxSection: 16 },
        { diameter: '40mm', maxSection: 35 },
        { diameter: '50mm', maxSection: 50 },
    ],
    'D2': [ // Directamente enterrado
        { diameter: 'N/A', maxSection: 999 }, // Sin caño
    ]
};

// Función para sugerir diámetro de cañería
function getSuggestedConduit(method: string, section: number): string {
    const sizes = CONDUIT_SIZES[method] || CONDUIT_SIZES['B1'];
    const suggested = sizes.find(s => section <= s.maxSection);
    return suggested?.diameter || sizes[sizes.length - 1].diameter;
}

// Función para obtener opciones válidas de breaker para un circuito
function getValidBreakerOptions(circuit: CircuitInventoryItem): string[] {
    const allOptions = ['6A', '10A', '16A', '20A', '25A', '32A'];

    // Obtener límites del tipo de circuito desde CSV
    const circuitType = LOADED_CIRCUIT_TYPES.find(ct => ct.sigla === circuit.type);
    const maxProtection = circuitType?.max_proteccion_a ?? 32;

    // Calcular Iz del circuito según su método de instalación
    const method = circuit.terminalLine?.method || 'B1';
    const section = parseFloat(circuit.cable?.replace('mm²', '') || '2.5');

    const line: LineLink = {
        method,
        section,
        material: 'Cu',
        length: circuit.terminalLine?.averageLength || 10,
        groupingCount: 1,
        ambientTemp: 40,
        conduitMaterial: 'PVC'
    };

    const iz = calculateIz(line, circuit.voltage || '220V');
    const ib = circuit.ib || 0;

    // 🆕 Si es modo relevamiento y no se ha seleccionado cable, devolver todas las opciones básicas
    if (isNaN(section)) {
        return allOptions;
    }

    // Filtrar opciones válidas: Ib ≤ In ≤ min(Iz, maxProtection)
    // Si maxProtection es -1, solo usar Iz como límite
    const maxAllowed = (maxProtection === -1 || maxProtection <= 0) ? iz : Math.min(iz, maxProtection);

    return allOptions.filter(option => {
        const inValue = parseInt(option);
        return inValue >= ib && inValue <= maxAllowed;
    });
}

interface Step3Props {
    config: ProjectConfig;
    onChange: (config: ProjectConfig) => void;
    onBack: () => void;
    onCalculate: () => void;
}

/**
 * Componente: Árbol Visual de Jerarquía de Tableros
 * Muestra la estructura M → LP → TP → CS → TSG/TS de forma horizontal
 */
interface PanelHierarchyTreeProps {
    panels: Panel[];
    circuitInventory?: CircuitInventory;
    onSelectPanel: (panelId: string) => void;
    onSelectLine: (lineType: 'LP' | 'CS', panelId: string) => void;
    config: ProjectConfig; // 🆕 Necesario para lógica de includesPillar
}


function PanelHierarchyTree({ panels, circuitInventory, onSelectPanel, onSelectLine, config }: PanelHierarchyTreeProps) {
    // Encontrar TP (siempre existe)
    const tp = panels.find(p => p.type === 'TP');
    if (!tp) return null;

    // Helper: Obtener circuitos de un panel
    const getCircuitsForPanel = (panelId: string) => {
        if (!circuitInventory) return [];
        return circuitInventory.circuits.filter(c => c.assignedPanelId === panelId);
    };

    // Helper: Calcular profundidad máxima del árbol
    const getMaxDepth = (panelId: string, currentDepth: number = 0): number => {
        const children = panels.filter(p => p.parentId === panelId);
        if (children.length === 0) return currentDepth;
        return Math.max(...children.map(child => getMaxDepth(child.id, currentDepth + 1)));
    };

    const maxDepth = getMaxDepth(tp.id);

    // Helper: Renderizar panel hijo recursivamente
    const renderChildPanel = (panel: Panel, depth: number = 1) => {
        const children = panels.filter(p => p.parentId === panel.id);
        // Indentación responsiva según profundidad
        const indentClass = depth === 1 ? 'pl-2 sm:pl-20' : depth === 2 ? 'pl-4 sm:pl-40' : 'pl-6 sm:pl-56';

        return (
            <React.Fragment key={panel.id}>
                <div className={`flex items-center gap-2 text-sm ${indentClass}`}>
                    {/* Conector visual desde el padre */}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <div className="w-6 h-px bg-slate-300"></div>
                    </div>

                    {/* CS */}
                    <div
                        onClick={() => onSelectLine('CS', panel.id)}
                        className="flex items-center gap-1 text-xs text-green-700 cursor-pointer hover:bg-green-100 px-2 py-1 rounded transition-colors"
                        title="Click para configurar Circuito Seccional"
                    >
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-mono font-bold">
                            CS({panel.feederDistance || 10}m)
                        </span>
                        <ArrowRight className="w-3 h-3" />
                    </div>

                    {/* Tablero */}
                    <div
                        onClick={() => onSelectPanel(panel.id)}
                        className={`${panel.type === 'TSG' ? 'bg-green-600' : 'bg-purple-600'
                            } text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity shadow-md whitespace-nowrap`}
                        title="Click para editar tablero"
                    >
                        {panel.type}
                    </div>

                    {/* Spacer para empujar circuitos a la derecha */}
                    <div className="flex-1"></div>

                    {/* Circuitos Terminales - Alineados a la derecha */}
                    {getCircuitsForPanel(panel.id).length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <ArrowRight className="w-3 h-3" />
                                <ArrowRight className="w-3 h-3" />
                                <ArrowRight className="w-3 h-3" />
                            </div>
                            <div className="flex items-center gap-2">
                                {getCircuitsForPanel(panel.id).map((circuit) => (
                                    <div
                                        key={circuit.id}
                                        className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold text-slate-700 border border-slate-300"
                                    >
                                        {circuit.type}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Renderizar hijos recursivamente */}
                {children.map(child => renderChildPanel(child, depth + 1))}
            </React.Fragment>
        );
    };


    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-6 rounded-xl border-2 border-blue-200 mb-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center mb-3 sm:mb-4">
                <h3 className="text-[10px] sm:text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                    <GitMerge className="w-3.5 h-3.5 sm:w-4 h-4" /> Arquitectura del Proyecto
                </h3>
            </div>

            {/* Árbol Vertical tipo Diagrama de Flujo */}
            <div className="space-y-2 overflow-x-auto no-scrollbar py-1">
                <div className="min-w-fit">
                    {/* Fila 1: M → LP → TP → Circuitos del TP */}
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        {/* M */}
                        <div className="bg-slate-700 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs whitespace-nowrap">
                            M
                        </div>

                        {/* LP - Solo si incluye pilar */}
                        {config.includesPillar && (
                            <div
                                onClick={() => onSelectLine('LP', tp.id)}
                                className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-700 cursor-pointer hover:bg-blue-100 px-1 sm:px-2 py-0.5 sm:py-1 rounded transition-colors"
                                title="Click para configurar Línea Principal"
                            >
                                <ArrowRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                                <span className="font-mono font-bold">LP({tp.feederDistance || 2}m)</span>
                                <ArrowRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                            </div>
                        )}

                        {/* TP - Condicional según includesPillar */}
                        {config.includesPillar ? (
                            <div
                                onClick={() => onSelectPanel(tp.id)}
                                className="bg-blue-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs cursor-pointer hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap"
                                title="Click para editar tablero"
                            >
                                TP
                            </div>
                        ) : (
                            <div
                                className="bg-slate-400 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-md whitespace-nowrap relative group"
                                title="TP existente - Fuera del alcance de certificación"
                            >
                                TP
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Fuera de alcance
                                </span>
                            </div>
                        )}

                        {/* Spacer para empujar circuitos a la derecha */}
                        <div className="flex-1"></div>

                        {/* Circuitos Terminales del TP - Alineados a la derecha */}
                        {getCircuitsForPanel(tp.id).length > 0 && (
                            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400">
                                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    {getCircuitsForPanel(tp.id).map((circuit) => (
                                        <div
                                            key={circuit.id}
                                            className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold text-slate-700 border border-slate-300"
                                        >
                                            {circuit.type}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filas para cada hijo del TP (recursivo) */}
                    {panels.filter(p => p.parentId === tp.id).map(child => renderChildPanel(child, 1))}
                </div>

                {/* Leyenda */}
                <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-slate-600">
                    <span className="font-bold flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Click en líneas o tableros</span>
                    <div className="flex flex-wrap gap-2 text-slate-500 font-medium">
                        <span className="bg-white/50 px-1.5 py-0.5 rounded border border-blue-100">M: Medidor</span>
                        <span className="bg-white/50 px-1.5 py-0.5 rounded border border-blue-100">LP: Línea Principal</span>
                        <span className="bg-white/50 px-1.5 py-0.5 rounded border border-blue-100">CS: Seccional</span>
                        <span className="bg-white/50 px-1.5 py-0.5 rounded border border-blue-100">CT: Terminal</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Componente principal de edición de tablero (Layout 3 Columnas)
function PanelEditor({
    panel,
    config,
    assignedCircuits,
    onUpdate,
    onDelete,
    canDelete,
    availablePanels,
    allPanels,
    onUnassignCircuit,
    onAssignCircuit,
    isCollapsed,
    onToggleCollapse,
    onChange
}: {
    panel: Panel;
    config: ProjectConfig;
    assignedCircuits: CircuitInventoryItem[];
    onUpdate: (updates: Partial<Panel>) => void;
    onDelete: () => void;
    canDelete: boolean;
    availablePanels: Panel[];
    allPanels: Panel[];
    onUnassignCircuit: (circuitId: string) => void;
    onAssignCircuit: (circuitId: string, panelId: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onChange: (config: ProjectConfig) => void;
}) {
    // Calcular diagnóstico en tiempo real
    const diagnostics = useMemo(
        // 🆕 Pasamos panel list y circuit inventory para cálculo recursivo de carga
        () => getDiagnostics(panel, config, assignedCircuits, config.panels, config.circuitInventory.circuits),
        [panel, config, assignedCircuits]
    );

    // Valores actuales de la línea (con fallback seguro)
    const currentMethod = panel.incomingLine?.method || panel.installationType || 'B1';
    const currentSection = panel.incomingLine?.section || panel.mainLine?.section || panel.sectionalLine?.section || 4;
    const currentMaterial = panel.incomingLine?.material || 'Cu';
    const currentConduit = panel.incomingLine?.conduitDiameter || getSuggestedConduit(currentMethod, currentSection);

    // Estado de secciones colapsables
    const [expandedSections, setExpandedSections] = useState({
        entrada: true,
        contenido: true,
        salida: true
    });

    const toggleSection = (section: 'entrada' | 'contenido' | 'salida') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Handler para actualizar configuración de línea
    const updateLine = (updates: Partial<LineLink>) => {
        // Preservar valores anteriores o defaults
        const baseLine: LineLink = panel.incomingLine || {
            method: currentMethod,
            length: panel.feederDistance || 0,
            material: currentMaterial as 'Cu' | 'Al',
            section: currentSection,
            groupingCount: 1,
            ambientTemp: 40,
            conduitMaterial: 'PVC'
        };

        const newLine = { ...baseLine, ...updates };

        // 🆕 Sincronizar sección PAT si cambió la sección de fase
        let newGrounding = panel.grounding;
        if (updates.section && panel.grounding?.materials?.cablePAT) {
            const s = updates.section;
            const spe = s <= 16 ? s : (s / 2);
            const speFinal = Math.max(spe, 2.5);

            newGrounding = {
                ...panel.grounding,
                materials: {
                    ...panel.grounding.materials,
                    cablePAT: {
                        ...panel.grounding.materials.cablePAT,
                        section: speFinal
                    }
                }
            };
        }

        onUpdate({
            incomingLine: newLine,
            grounding: newGrounding,
            // Sincronizar legacy para compatibilidad (mientras se migra todo)
            feederDistance: newLine.length,
            installationType: newLine.method.includes('Enterrado') ? 'Enterrado' : 'Embutido',
            // MainLine/SectionalLine se mantienen sincronizados por si acaso
            mainLine: panel.type === 'TP' ? { section: newLine.section, material: newLine.material, method: newLine.method } : undefined,
            sectionalLine: panel.type !== 'TP' ? { section: newLine.section, material: newLine.material, method: newLine.method } : undefined
        });
    };


    return (
        <div
            id={`panel-${panel.id}`}
            className="bg-white border-2 border-slate-200 rounded-xl shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all"
        >

            {/* --- HEADER DEL TABLERO --- */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    {/* Selector Tipo */}
                    {panel.type === 'TP' ? (
                        <div className="bg-slate-800 text-white px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold shadow-sm shrink-0">
                            TP (Acometida)
                        </div>
                    ) : (
                        <select
                            value={panel.type}
                            onChange={(e) => onUpdate({ type: e.target.value as 'TSG' | 'TS' })}
                            className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold border-none cursor-pointer hover:bg-blue-700 shadow-sm shrink-0"
                        >
                            <option value="TSG">TSG</option>
                            <option value="TS">TS</option>
                        </select>
                    )}

                    {/* Nombre Editable */}
                    <input
                        type="text"
                        value={panel.name}
                        onChange={(e) => onUpdate({ name: e.target.value })}
                        className="text-base sm:text-lg font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-400 w-full"
                        placeholder="Nombre del Tablero"
                    />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    {/* Tensión */}
                    {config.voltage === '220V' ? (
                        // Proyecto MONOFÁSICO: Todos los tableros son 220V (display estático)
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-600" title="Proyecto monofásico: todos los tableros son 220V">
                                220V
                            </span>
                        </div>
                    ) : (
                        // Proyecto TRIFÁSICO: TP es 380V, tableros hijos pueden elegir 220V o 380V
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {panel.type === 'TP' ? (
                                // TP siempre es 380V en proyectos trifásicos
                                <span className="text-xs font-bold text-slate-700" title="Tablero Principal: 380V (trifásico)">
                                    380V
                                </span>
                            ) : (
                                // Tableros hijos pueden elegir 220V o 380V
                                <select
                                    value={panel.voltage}
                                    onChange={(e) => onUpdate({ voltage: e.target.value as '220V' | '380V' })}
                                    className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                    title="Selecciona voltaje del tablero seccional"
                                >
                                    <option value="220V">220V (Monofásico)</option>
                                    <option value="380V">380V (Trifásico)</option>
                                </select>
                            )}
                        </div>
                    )}

                    {/* Botón de Colapso */}
                    <button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-blue-500 transition-colors bg-white p-1 rounded-md border border-slate-200 shadow-sm"
                        title={isCollapsed ? 'Expandir Tablero' : 'Colapsar Tablero'}
                    >
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>

                    {/* Eliminar */}
                    {canDelete && !isCollapsed && (
                        <button
                            onClick={onDelete}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Eliminar Tablero"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ⚠️ ADVERTENCIA CAT III - Solo para departamentos */}
            {panel.type === 'TP' && config.destination === 'departamento' && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                        <strong>CAT III:</strong> Solo instalación del usuario (desde TSG). Acometida y TP requieren certificación por CAT I/II.
                    </p>
                </div>
            )}

            {/* --- VISTA RESUMEN (Solo si está colapsado) --- */}
            {isCollapsed && (
                <div
                    onClick={onToggleCollapse}
                    className="bg-blue-50/50 p-2 flex items-center justify-between cursor-pointer hover:bg-blue-100/50 transition-colors border-b border-slate-100 overflow-x-auto no-scrollbar"
                >
                    <div className="flex items-center gap-4 sm:gap-6 px-1 sm:px-2 shrink-0">
                        {/* Indicador de coordinación */}
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${diagnostics.coordination.isValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {diagnostics.coordination.isValid ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {diagnostics.coordination.isValid ? 'COORDINADO' : 'ERROR'}
                        </div>

                        {/* Ib / Iz */}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 uppercase font-bold leading-none">Ib</span>
                                <span className="text-xs font-bold text-slate-700">{diagnostics.Ib.toFixed(1)}A</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 uppercase font-bold leading-none">Iz</span>
                                <span className={`text-xs font-bold ${diagnostics.lineData.izCorrected === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                    {diagnostics.lineData.izCorrected.toFixed(1)}A
                                </span>
                            </div>
                        </div>

                        {/* ΔV Acumulada */}
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold leading-none">ΔV Acum.</span>
                            <span className={`text-xs font-bold ${diagnostics.voltageDrop.exceedsLimit ? 'text-amber-600' : 'text-slate-700'}`}>
                                {diagnostics.voltageDrop.total.toFixed(2)}%
                            </span>
                        </div>

                        {/* Cantidad de circuitos */}
                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                            <Activity className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{assignedCircuits.length} Cts.</span>
                        </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium italic pr-4">
                        Click para expandir detalles...
                    </div>
                </div>
            )}

            {/* --- SECCIONES MODULARES (VERTICAL STACK) --- */}
            {!isCollapsed && (
                <div className="p-4 space-y-4">
                    {/* SECCIÓN 1: ENTRADA */}
                    <PanelInputSection
                        panel={panel}
                        availablePanels={availablePanels}
                        onUpdate={onUpdate}
                        updateLine={updateLine}
                        isExpanded={expandedSections.entrada}
                        onToggle={() => toggleSection('entrada')}
                        config={config}
                    />

                    {/* SECCIÓN 2: CONTENIDO (Diagnóstico + Protecciones) */}
                    <PanelContentSection
                        panel={panel}
                        config={config}
                        assignedCircuits={assignedCircuits}
                        diagnostics={diagnostics}
                        onUpdate={onUpdate}
                        onConfigChange={onChange}
                        isExpanded={expandedSections.contenido}
                        onToggle={() => toggleSection('contenido')}
                    />

                    {/* SECCIÓN 3: SALIDA (Circuitos Asignados) */}
                    <PanelOutputSection
                        panel={panel}
                        assignedCircuits={assignedCircuits}
                        onUnassignCircuit={onUnassignCircuit}
                        onAssignCircuit={onAssignCircuit}
                        allPanels={allPanels}
                        isExpanded={expandedSections.salida}
                        onToggle={() => toggleSection('salida')}
                    />
                </div>
            )}
        </div>
    );
}

export default function ProjectWizardStep3({ config, onChange, onBack, onCalculate }: Step3Props) {
    // 🆕 NUEVO: Estado para colapsar tableros
    const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});

    const togglePanelCollapse = (panelId: string) => {
        setCollapsedPanels(prev => ({
            ...prev,
            [panelId]: !prev[panelId]
        }));
    };

    // 🆕 Auto-colapsar TP y crear TSG cuando includesPillar = false Y es departamento
    useEffect(() => {
        // Solo aplicar para departamentos en edificio (CAT III alcance limitado)
        if (!config.includesPillar && config.destination === 'departamento') {
            const tp = config.panels?.find(p => p.type === 'TP');
            if (!tp) return;

            // 1. Colapsar TP automáticamente
            setCollapsedPanels(prev => ({
                ...prev,
                [tp.id]: true
            }));

            // 2. Crear TSG si no existe
            const hasTSG = config.panels?.some(p => p.type === 'TSG' || p.type === 'TS');
            if (!hasTSG) {
                const newId = `TSG-${Math.floor(Math.random() * 1000)}`;
                const newPanel: Panel = {
                    id: newId,
                    name: 'TSG Interior',
                    type: 'TSG',
                    parentId: tp.id,
                    voltage: config.voltage === '380V' ? '220V' : '220V',
                    feederDistance: 15,
                    installationType: 'Embutido',
                    incomingLine: {
                        method: 'B1',
                        length: 15,
                        section: 4,
                        material: 'Cu',
                        groupingCount: 1,
                        ambientTemp: 40,
                        conduitMaterial: 'PVC'
                    }
                };
                onChange({ ...config, panels: [...(config.panels || []), newPanel] });
            }
        }
    }, [config.includesPillar, config.destination]);

    // 🆕 NUEVO: Estado para editar líneas
    const [editingLine, setEditingLine] = useState<{
        type: 'LP' | 'CS';
        panelId: string;
    } | null>(null);

    // 🆕 NUEVO: Estado para mostrar/ocultar ayuda
    const [showHelp, setShowHelp] = useState(false);

    // 🆕 NUEVO: Estado para expandir/colapsar notas de circuitos
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

    const toggleNote = (circuitId: string) => {
        setExpandedNotes(prev => ({
            ...prev,
            [circuitId]: !prev[circuitId]
        }));
    };

    // 🆕 NUEVO: Auto-generar circuitInventoryForCAD cuando cambian los circuitos asignados
    useEffect(() => {
        if (!config.circuitInventory?.circuits) return;

        // Generar inventario extendido para CAD
        const cadInventory = generateCircuitInventoryForCAD(config);

        // Solo actualizar si cambió (evitar loops infinitos)
        const currentInventory = config.circuitInventoryForCAD || [];
        const hasChanged = JSON.stringify(cadInventory) !== JSON.stringify(currentInventory);

        if (hasChanged) {
            console.log('🎨 [CAD] Inventario actualizado:', cadInventory.length, 'circuitos');
            onChange({
                ...config,
                circuitInventoryForCAD: cadInventory
            });
        }
    }, [config.circuitInventory?.assignedCircuits, config.panels]);

    // Helper: Asignar circuito a tablero
    const assignCircuitToPanel = (circuitId: string, panelId: string) => {
        if (!config.circuitInventory) return;

        const updatedCircuits = config.circuitInventory.circuits.map(c => {
            if (c.id === circuitId) {
                return {
                    ...c,
                    assignedPanelId: panelId || undefined,
                    isAssigned: !!panelId
                };
            }
            return c;
        });

        const assignedCount = updatedCircuits.filter(c => c.isAssigned).length;
        const orphanCount = updatedCircuits.length - assignedCount;

        onChange({
            ...config,
            circuitInventory: {
                circuits: updatedCircuits,
                totalCircuits: updatedCircuits.length,
                assignedCircuits: assignedCount,
                orphanCircuits: orphanCount
            }
        });
    };

    // Helper: Desasignar circuito
    const unassignCircuit = (circuitId: string) => {
        assignCircuitToPanel(circuitId, '');
    };

    // 🆕 Helper: Actualizar configuración de línea terminal de un circuito
    const updateCircuitTerminalLine = (circuitId: string, field: 'method' | 'averageLength' | 'conduitDiameter' | 'breaker' | 'breakerCurvePoles' | 'breakingCapacity' | 'notes' | 'cable', value: any) => {
        if (!config.circuitInventory) return;

        const updatedCircuits = config.circuitInventory.circuits.map(c => {
            if (c.id === circuitId) {
                if (field === 'notes') {
                    return { ...c, notes: value };
                }

                const newTerminalLine = {
                    ...(c.terminalLine || { method: 'B1', averageLength: 10, material: 'Cu' }),
                    [field]: field === 'cable' ? 'B1' : value // Use current method if field is cable to avoid breakage
                };

                // 🆕 Manejar relevamiento de cable
                if (field === 'cable') {
                    return {
                        ...c,
                        cable: value,
                        terminalLine: {
                            ...(c.terminalLine || { method: 'B1', averageLength: 10, material: 'Cu' })
                        }
                    };
                }

                // 🆕 RECALCULAR cable y protección si cambió el método de instalación
                if (field === 'method') {
                    // Mapear método corto a installationType para selectOptimalCableAndProtection
                    const installationTypeMap: Record<string, string> = {
                        'B1': 'Embutido',
                        'B2': 'Exterior',
                        'D1': 'Enterrado',
                        'D2': 'Enterrado'
                    };

                    const installationType = installationTypeMap[value] || 'Embutido';

                    const optimization = selectOptimalCableAndProtection(
                        c.ib,
                        c.type,
                        installationType,
                        c.voltage || '220V'
                    );

                    return {
                        ...c,
                        cable: `${optimization.section}mm²`,
                        breaker: `${optimization.In}A`,
                        warnings: optimization.warnings,
                        terminalLine: newTerminalLine
                    };
                }

                // 🆕 Manejar cambio de breaker directamente
                if (field === 'breaker') {
                    return {
                        ...c,
                        breaker: value,
                        terminalLine: newTerminalLine
                    };
                }

                // 🆕 Manejar cambio de cañería
                if (field === 'conduitDiameter' || field === 'breakerCurvePoles' || field === 'breakingCapacity') {
                    return {
                        ...c,
                        terminalLine: newTerminalLine
                    };
                }

                return {
                    ...c,
                    terminalLine: newTerminalLine
                };
            }
            return c;
        });

        onChange({
            ...config,
            circuitInventory: {
                ...config.circuitInventory,
                circuits: updatedCircuits
            }
        });
    };

    // 🆕 Helper: Actualizar fase asignada de un circuito (solo para proyectos 380V)
    const updateCircuitPhase = (circuitId: string, phase: 'R' | 'S' | 'T') => {
        if (!config.circuitInventory) return;

        const updatedCircuits = config.circuitInventory.circuits.map(c => {
            if (c.id === circuitId) {
                return {
                    ...c,
                    assignedPhase: c.isThreePhase ? 'RST' : phase  // Trifásicos siempre RST
                };
            }
            return c;
        });

        onChange({
            ...config,
            circuitInventory: {
                ...config.circuitInventory,
                circuits: updatedCircuits
            }
        });
    };

    // 🆕 Actualizar protección de cabecera asignada
    const updateCircuitHeader = (circuitId: string, headerId: string) => {
        if (!config.circuitInventory) return;

        const updatedCircuits = config.circuitInventory.circuits.map(c => {
            if (c.id === circuitId) {
                return {
                    ...c,
                    assignedHeaderId: headerId
                };
            }
            return c;
        });

        onChange({
            ...config,
            circuitInventory: {
                ...config.circuitInventory,
                circuits: updatedCircuits
            }
        });
    };

    // Helper: Actualizar un panel específico
    const updatePanel = (id: string, updates: Partial<Panel>) => {
        const newPanels = (config.panels || []).map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        onChange({ ...config, panels: newPanels });
    };

    // Helper: Crear nuevo Tablero Seccional
    const addSectionalPanel = (type: 'TSG' | 'TS' = 'TSG') => {
        const tpId = config.panels?.find(p => p.type === 'TP')?.id;
        if (!tpId) return;

        const newId = `${type}-${Math.floor(Math.random() * 1000)}`;
        const defaultName = type === 'TSG' ? 'TSG Interior' : `TS ${config.panels.filter(p => p.type === 'TS').length + 1}`;
        const newPanel: Panel = {
            id: newId,
            name: defaultName,
            type: type,
            parentId: tpId,
            voltage: config.voltage === '380V' ? '220V' : '220V',
            feederDistance: type === 'TSG' ? 15 : 10,
            installationType: 'Embutido',
            incomingLine: {
                method: 'B1',
                length: 0,
                section: 4,
                material: 'Cu',
                groupingCount: 1,
                ambientTemp: 40,
                conduitMaterial: 'PVC'
            }
        };

        onChange({ ...config, panels: [...(config.panels || []), newPanel] });
    };

    // Helper: Validar que no se creen ciclos en la jerarquía
    const canBeParent = (potentialParentId: string, childId: string): boolean => {
        if (potentialParentId === childId) return false;

        let current = config.panels.find(p => p.id === potentialParentId);
        while (current?.parentId) {
            if (current.parentId === childId) return false;
            current = config.panels.find(p => p.id === current.parentId);
        }

        return true;
    };

    const removePanel = (id: string) => {
        console.log('🗑️ removePanel called for:', id);
        if (confirm('¿Seguro quieres eliminar este tablero?')) {
            // 🆕 PASO 1: Encontrar el TP (para reasignar hijos huérfanos)
            const tpPanel = config.panels.find(p => p.type === 'TP');
            if (!tpPanel) {
                console.error('❌ No se encontró el TP, no se puede eliminar el panel');
                return;
            }

            // 🆕 PASO 2: Reasignar paneles hijos huérfanos al TP
            const orphanedChildren = config.panels.filter(p => p.parentId === id);
            console.log(`  👶 Paneles hijos huérfanos de ${id}:`, orphanedChildren.length, orphanedChildren.map(p => p.id));

            const updatedPanels = config.panels
                .filter(p => p.id !== id) // Eliminar el panel
                .map(panel => {
                    // Reasignar hijos huérfanos al TP
                    if (panel.parentId === id) {
                        console.log(`  🔄 Reasignando ${panel.id} de ${id} → ${tpPanel.id}`);
                        return {
                            ...panel,
                            parentId: tpPanel.id
                        };
                    }
                    return panel;
                });

            // PASO 3: Desasignar todos los circuitos de este tablero (volverlos huérfanos)
            const circuitsToUnassign = config.circuitInventory.circuits.filter(c => c.assignedPanelId === id);
            console.log(`  🔍 Circuitos asignados a ${id}:`, circuitsToUnassign.length, circuitsToUnassign.map(c => c.id));

            const updatedCircuits = config.circuitInventory.circuits.map(circuit => {
                if (circuit.assignedPanelId === id) {
                    console.log(`  ↩️ Desasignando circuito ${circuit.id}`);
                    return {
                        ...circuit,
                        assignedPanelId: undefined,
                        isAssigned: false  // ✅ CRÍTICO: también marcar como no asignado
                    };
                }
                return circuit;
            });

            // PASO 4: Recalcular contadores
            const assignedCount = updatedCircuits.filter(c => c.isAssigned).length;
            const orphanCount = updatedCircuits.length - assignedCount;

            // PASO 5: Aplicar cambios
            onChange({
                ...config,
                panels: updatedPanels,
                circuitInventory: {
                    circuits: updatedCircuits,
                    totalCircuits: updatedCircuits.length,
                    assignedCircuits: assignedCount,
                    orphanCircuits: orphanCount
                }
            });
        }
    };

    // 🆕 Componente: Indicador de Balanceo de Fases (solo para 380V)
    function PhaseBalanceIndicator({ circuits }: { circuits: CircuitInventoryItem[] }) {
        if (config.voltage !== '380V') return null;

        // Calcular carga por fase
        const loadByPhase = { R: 0, S: 0, T: 0 };

        circuits.forEach(circuit => {
            if (circuit.isThreePhase) {
                // Circuito trifásico: distribuir carga equitativamente entre las 3 fases
                const loadPerPhase = circuit.power / 3;
                loadByPhase.R += loadPerPhase;
                loadByPhase.S += loadPerPhase;
                loadByPhase.T += loadPerPhase;
            } else {
                // Circuito monofásico: asignar a su fase (default R si no está asignado)
                const phase = circuit.assignedPhase || 'R';
                if (phase !== 'RST') {
                    loadByPhase[phase as 'R' | 'S' | 'T'] += circuit.power;
                }
            }
        });

        const maxLoad = Math.max(loadByPhase.R, loadByPhase.S, loadByPhase.T);
        const minLoad = Math.min(loadByPhase.R, loadByPhase.S, loadByPhase.T);
        const imbalance = maxLoad > 0 ? ((maxLoad - minLoad) / maxLoad) * 100 : 0;

        return (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200 mb-4">
                <div className="text-xs font-bold text-purple-900 mb-3 flex items-center gap-2">
                    ⚡ Balanceo de Fases (Trifásico 380V)
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                    {(['R', 'S', 'T'] as const).map(phase => (
                        <div key={phase} className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                Fase {phase}
                            </div>
                            <div className="text-lg font-black text-slate-800">
                                {loadByPhase[phase].toFixed(0)} VA
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full transition-all ${phase === 'R' ? 'bg-red-500' : phase === 'S' ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                    style={{ width: `${maxLoad > 0 ? (loadByPhase[phase] / maxLoad) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {imbalance > 20 && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                        <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            ⚠️ Desequilibrio: {imbalance.toFixed(1)}% (recomendado {'<'} 20%)
                        </div>
                    </div>
                )}

                {imbalance <= 20 && maxLoad > 0 && (
                    <div className="bg-green-50 border border-green-200 p-2 rounded-lg">
                        <div className="text-[10px] text-green-700 font-bold flex items-center gap-1">
                            ✓ Balanceo aceptable: {imbalance.toFixed(1)}%
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Validar si podemos avanzar
    // Requirimiento: Al menos 1 TP configurado + NO circuitos huérfanos
    // Para instalaciones existentes: también requiere PIA e ID
    const tpPanel = (config.panels || []).find(p => p.type === 'TP');
    const hasOrphans = hasOrphanCircuits(config.circuitInventory);

    // 🆕 Validar protecciones para modo existente usando el sistema unificado
    const tpHeaders = tpPanel?.protections?.headers || [];
    const hasPIA = tpHeaders.some(h => h.type === 'PIA');
    const hasID = tpHeaders.some(h => h.type === 'ID');

    const isValid = tpPanel && !hasOrphans && (
        config.projectType !== 'existente' ||
        (hasPIA && hasID)
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">

            {/* 🆕 TÍTULO PRINCIPAL: ARQUITECTURA DE TABLEROS */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200 mb-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <GitMerge className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="font-bold text-blue-900 text-lg">Arquitectura de Tableros</h3>
                            <p className="text-sm text-blue-700">Define la estructura jerárquica de tu proyecto eléctrico</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <AlertCircle className="w-4 h-4" />
                        {showHelp ? 'Ocultar Ayuda' : 'Ver Guía Rápida'}
                    </button>
                </div>
            </div>

            {/* 🆕 PANEL DE AYUDA CONTEXTUAL - COLAPSABLE */}
            {showHelp && <HelpPanel />}

            {/* 🆕 ÁRBOL DE JERARQUÍA */}
            {config.panels && config.panels.length > 0 && (
                <PanelHierarchyTree
                    panels={config.panels}
                    circuitInventory={config.circuitInventory}
                    config={config}
                    onSelectPanel={(panelId) => {
                        // Scroll al editor de ese panel
                        const element = document.getElementById(`panel-${panelId}`);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }}
                    onSelectLine={(lineType, panelId) => {
                        setEditingLine({ type: lineType, panelId });
                    }}
                />
            )}

            {/* SECCIÓN DE INVENTARIO DE CIRCUITOS */}
            {config.circuitInventory && config.circuitInventory.totalCircuits > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600 p-2 rounded-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-purple-900 text-lg">Inventario de Circuitos</h3>
                                <p className="text-sm text-purple-700">Asigna cada circuito a un tablero</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white px-4 py-2 rounded-lg border-2 border-green-200">
                                <div className="text-xs text-green-600 font-bold uppercase">Asignados</div>
                                <div className="text-2xl font-black text-green-700">{config.circuitInventory.assignedCircuits}</div>
                            </div>
                            <div className={`px-4 py-2 rounded-lg border-2 ${hasOrphans ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                                <div className={`text-xs font-bold uppercase ${hasOrphans ? 'text-red-600' : 'text-slate-500'}`}>Huérfanos</div>
                                <div className={`text-2xl font-black ${hasOrphans ? 'text-red-700 animate-pulse' : 'text-slate-400'}`}>{config.circuitInventory.orphanCircuits}</div>
                            </div>
                        </div>
                    </div>

                    {/* Circuitos Huérfanos (Sin Asignar) */}
                    {getOrphanCircuits(config.circuitInventory).length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                Circuitos Sin Asignar ({getOrphanCircuits(config.circuitInventory).length})
                            </h4>
                            <div className="grid md:grid-cols-2 gap-3">
                                {getOrphanCircuits(config.circuitInventory).map(circuit => (
                                    <div
                                        key={circuit.id}
                                        className="bg-white p-4 rounded-xl border-2 border-amber-300 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-sm text-slate-800">{circuit.id}</div>

                                                    {/* 🆕 Selector de Fase - Solo en proyectos 380V */}
                                                    {config.voltage === '380V' && (
                                                        circuit.isThreePhase ? (
                                                            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                                                3~ RST
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={circuit.assignedPhase || 'R'}
                                                                onChange={(e) => updateCircuitPhase(circuit.id, e.target.value as 'R' | 'S' | 'T')}
                                                                className="text-[10px] border border-blue-300 rounded px-1.5 py-0.5 font-bold bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                                                title="Seleccionar fase para balanceo"
                                                            >
                                                                <option value="R">Fase R</option>
                                                                <option value="S">Fase S</option>
                                                                <option value="T">Fase T</option>
                                                            </select>
                                                        )
                                                    )}

                                                    {/* 🆕 Selector de Protección de Cabecera - Solo si tiene panel asignado */}
                                                    {circuit.panelId && (() => {
                                                        const panel = config.panels?.find(p => p.id === circuit.panelId);
                                                        const headers = panel?.protections?.headers || [];

                                                        if (headers.length === 0) return null;

                                                        // Filtrar protecciones compatibles según polos del circuito
                                                        const compatibleHeaders = headers.filter(h => {
                                                            if (circuit.isThreePhase) return h.poles === '4P';
                                                            return h.poles === '2P';
                                                        });

                                                        if (compatibleHeaders.length === 0) {
                                                            return (
                                                                <span className="text-[9px] text-amber-600 italic">
                                                                    ⚠️ Sin protecciones {circuit.isThreePhase ? '4P' : '2P'}
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <select
                                                                value={circuit.assignedHeaderId || ''}
                                                                onChange={(e) => updateCircuitHeader(circuit.id, e.target.value)}
                                                                className="text-[10px] border border-green-300 rounded px-1.5 py-0.5 font-bold bg-white hover:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                                                                title="Seleccionar protección de cabecera"
                                                            >
                                                                <option value="">Sin asignar</option>
                                                                {compatibleHeaders.map(h => (
                                                                    <option key={h.id} value={h.id}>
                                                                        {h.poles === '4P' ? 'RST' : h.phase} {h.name} ({h.rating}A)
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        );
                                                    })()}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleNote(circuit.id);
                                                        }}
                                                        className={`p-1 rounded-full transition-colors ${circuit.notes ? 'text-blue-600 bg-blue-50 focus:ring-2 focus:ring-blue-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                                        title="Agregar/Ver observaciones de instalación"
                                                    >
                                                        {circuit.notes ? <MessageSquareText className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                                <div className="text-xs text-slate-600 line-clamp-1">{circuit.description}</div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${circuit.type === 'IUG' ? 'bg-amber-100 text-amber-700' :
                                                circuit.type === 'TUG' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>
                                                {circuit.type}
                                            </div>
                                        </div>

                                        {expandedNotes[circuit.id] && (
                                            <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <textarea
                                                    autoFocus
                                                    value={circuit.notes || ''}
                                                    onChange={(e) => updateCircuitTerminalLine(circuit.id, 'notes', e.target.value)}
                                                    placeholder="Detalles de instalación del circuito (ej: recorrido, protecciones mecánicas)..."
                                                    className="w-full text-[11px] border-blue-200 rounded-lg bg-blue-50/50 p-2 h-16 resize-none italic text-slate-600 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                                />
                                            </div>
                                        )}
                                        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-3">
                                            <div><span className="font-bold">{circuit.bocas}</span> bocas</div>
                                            <div><span className="font-bold">{circuit.power}</span> VA</div>
                                            <div>
                                                {config.projectType === 'existente' ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-blue-600 font-bold uppercase">Cable Relevado</span>
                                                        <select
                                                            value={circuit.cable}
                                                            onChange={(e) => updateCircuitTerminalLine(circuit.id, 'cable', e.target.value)}
                                                            className="text-[10px] border border-blue-200 rounded px-1 py-0.5 bg-blue-50 focus:ring-1 focus:ring-blue-400 font-bold"
                                                        >
                                                            <option value="Relevar mm²">Sección...</option>
                                                            {['1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <span className="font-bold">{circuit.cable}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 🆕 CONFIGURACIÓN DE LÍNEA TERMINAL */}
                                        <div className="bg-blue-50 p-3 rounded-lg mb-3 space-y-2 border border-blue-200">
                                            <div className="text-xs font-bold text-blue-900 mb-2">Configuración de Línea Terminal (CT)</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Método de Instalación</label>
                                                    <select
                                                        value={circuit.terminalLine?.method || 'B1'}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'method', e.target.value)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="B1">B1 - Embutido en Pared</option>
                                                        <option value="B2">B2 - Bandeja/Cielorraso</option>
                                                        <option value="D1">D1 - Caño Enterrado</option>
                                                        <option value="D2">D2 - Directamente Enterrado</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Diámetro de Cañería</label>
                                                    <select
                                                        value={circuit.terminalLine?.conduitDiameter || CONDUIT_SIZES[circuit.terminalLine?.method || 'B1']?.[0]?.diameter || '13mm'}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'conduitDiameter', e.target.value)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {CONDUIT_SIZES[circuit.terminalLine?.method || 'B1']?.map(c => (
                                                            <option key={c.diameter} value={c.diameter}>
                                                                Ø {c.diameter} (máx {c.maxSection}mm²)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Longitud Promedio (m)</label>
                                                    <input
                                                        type="number"
                                                        value={circuit.terminalLine?.averageLength || 10}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'averageLength', parseFloat(e.target.value) || 10)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 font-mono focus:ring-2 focus:ring-blue-500"
                                                        min="1"
                                                        max="50"
                                                        step="0.5"
                                                    />
                                                </div>
                                            </div>

                                            {/* 🆕 Fila de Protecciones: Breaker | Curva/Polos | Ruptura */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Protección (Breaker)</label>
                                                    <select
                                                        value={circuit.breaker || '10A'}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'breaker', e.target.value)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-green-700"
                                                    >
                                                        {getValidBreakerOptions(circuit).map(option => (
                                                            <option key={option} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Curva/Polos</label>
                                                    <select
                                                        value={circuit.terminalLine?.breakerCurvePoles || (circuit.isThreePhase ? 'C/4 polos' : 'C/2 polos')}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'breakerCurvePoles', e.target.value)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {/* Opciones de 2 polos - Para circuitos monofásicos */}
                                                        {!circuit.isThreePhase && (
                                                            <>
                                                                <option value="B/2 polos">B / 2 polos</option>
                                                                <option value="C/2 polos">C / 2 polos</option>
                                                                <option value="D/2 polos">D / 2 polos</option>
                                                                <option value="Z/2 polos">Z / 2 polos</option>
                                                            </>
                                                        )}
                                                        {/* Opciones de 4 polos - Solo para circuitos trifásicos */}
                                                        {circuit.isThreePhase && (
                                                            <>
                                                                <option value="B/4 polos">B / 4 polos</option>
                                                                <option value="C/4 polos">C / 4 polos</option>
                                                                <option value="D/4 polos">D / 4 polos</option>
                                                                <option value="Z/4 polos">Z / 4 polos</option>
                                                            </>
                                                        )}
                                                    </select>
                                                    {/* 🆕 Validación de polos para circuitos trifásicos */}
                                                    {circuit.isThreePhase && !circuit.terminalLine?.breakerCurvePoles?.includes('4 polos') && (
                                                        <p className="text-[9px] text-amber-600 mt-1 font-bold">
                                                            ⚠️ Circuito trifásico requiere breaker de 4 polos
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-blue-700 font-medium block mb-1">Ruptura</label>
                                                    <select
                                                        value={circuit.terminalLine?.breakingCapacity || '6kA'}
                                                        onChange={(e) => updateCircuitTerminalLine(circuit.id, 'breakingCapacity', e.target.value)}
                                                        className="w-full text-xs border-blue-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="3kA">3kA</option>
                                                        <option value="4,5kA">4,5kA</option>
                                                        <option value="6kA">6kA</option>
                                                        <option value="10kA">10kA</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-slate-500 mt-1">
                                                Ib: {circuit.ib?.toFixed(1)}A • Cable: {circuit.cable} • Calculado: {circuit.breaker}
                                            </div>

                                            <div className="text-[9px] text-blue-600 mt-1">
                                                Material: Cu (Cobre) • Agrupamiento: 1 circuito
                                            </div>
                                        </div>

                                        <select
                                            value=""
                                            onChange={(e) => assignCircuitToPanel(circuit.id, e.target.value)}
                                            className="w-full p-2 border-2 border-purple-300 rounded-lg text-sm font-bold bg-white hover:border-purple-500 transition-colors"
                                        >
                                            <option value="">Asignar a tablero...</option>
                                            {config.panels.map(panel => (
                                                <option key={panel.id} value={panel.id}>
                                                    {panel.name} ({panel.type})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div >
                    )
                    }

                    {/* Vista de Tableros con Circuitos Asignados */}
                    <div>
                        <h4 className="font-bold text-purple-900 mb-3">Circuitos por Tablero</h4>
                        {/* 🔧 FIX Bug #11: Force re-render when inventory changes by using dynamic key */}
                        <div className="grid md:grid-cols-2 gap-4" key={`grid-${config.circuitInventory.assignedCircuits}-${config.circuitInventory.orphanCircuits}`}>
                            {config.panels.map(panel => {
                                const assignedCircuits = getCircuitsForPanel(config.circuitInventory, panel.id);

                                // 🔧 FIX Bug #10: Usar getDiagnostics para obtener carga TOTAL (incluyendo hijos)
                                // De lo contrario, el TP muestra solo la carga de sus propios circuitos
                                const diag = getDiagnostics(panel, config, assignedCircuits, config.panels, config.circuitInventory.circuits);
                                const dpms = diag.totalDPMS;
                                const ib = diag.Ib;

                                const cargaKW = (dpms * 0.85) / 1000;

                                return (
                                    <div
                                        key={panel.id}
                                        className={`bg-white p-4 rounded-xl border-2 ${assignedCircuits.length > 0 ? 'border-green-300' : 'border-slate-200'
                                            } shadow-sm`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="font-bold text-slate-800">{panel.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {panel.type} • {panel.type === 'TP' ? config.voltage : panel.voltage}
                                                </div>
                                            </div>
                                            {assignedCircuits.length > 0 && (
                                                <div className="bg-green-100 px-2 py-1 rounded text-xs font-bold text-green-700">
                                                    {assignedCircuits.length} circuito{assignedCircuits.length !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>

                                        {assignedCircuits.length > 0 && (
                                            <>
                                                <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
                                                    <div className="text-center">
                                                        <div className="text-[9px] text-blue-600 font-bold uppercase">DPMS</div>
                                                        <div className="text-sm font-black text-blue-900">{dpms.toFixed(0)} VA</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] text-blue-600 font-bold uppercase">Ib</div>
                                                        <div className="text-sm font-black text-blue-900">{ib.toFixed(1)} A</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] text-blue-600 font-bold uppercase">Carga</div>
                                                        <div className="text-sm font-black text-blue-900">{cargaKW.toFixed(2)} kW</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {assignedCircuits.map(circuit => (
                                                        <div
                                                            key={circuit.id}
                                                            className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs hover:bg-slate-100 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <span className="font-bold text-slate-700">{circuit.id}</span>

                                                                {/* 🆕 Selector de Fase - Solo en proyectos 380V */}
                                                                {config.voltage === '380V' && (
                                                                    circuit.isThreePhase ? (
                                                                        <span className="text-[9px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                                                            3~ RST
                                                                        </span>
                                                                    ) : (
                                                                        <select
                                                                            value={circuit.assignedPhase || 'R'}
                                                                            onChange={(e) => updateCircuitPhase(circuit.id, e.target.value as 'R' | 'S' | 'T')}
                                                                            className="text-[9px] border border-blue-300 rounded px-1 py-0.5 font-bold bg-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <option value="R">R</option>
                                                                            <option value="S">S</option>
                                                                            <option value="T">T</option>
                                                                        </select>
                                                                    )
                                                                )}

                                                                {/* 🆕 Selector de Protección de Cabecera */}
                                                                {(() => {
                                                                    const headers = panel.protections?.headers || [];

                                                                    if (headers.length === 0) return null;

                                                                    // Filtrar protecciones compatibles según polos del circuito
                                                                    const compatibleHeaders = headers.filter(h => {
                                                                        if (circuit.isThreePhase) return h.poles === '4P';
                                                                        return h.poles === '2P';
                                                                    });

                                                                    if (compatibleHeaders.length === 0) {
                                                                        return (
                                                                            <span className="text-[9px] text-amber-600 italic">
                                                                                ⚠️ Sin protecciones {circuit.isThreePhase ? '4P' : '2P'}
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <select
                                                                            value={circuit.assignedHeaderId || ''}
                                                                            onChange={(e) => updateCircuitHeader(circuit.id, e.target.value)}
                                                                            className="text-[10px] border border-green-300 rounded px-1.5 py-0.5 font-bold bg-white hover:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                                                                            title="Seleccionar protección de cabecera"
                                                                        >
                                                                            <option value="">Sin asignar</option>
                                                                            {compatibleHeaders.map(h => (
                                                                                <option key={h.id} value={h.id}>
                                                                                    {h.poles === '4P' ? 'RST' : h.phase} {h.name} ({h.rating}A)
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    );
                                                                })()}
                                                                <span className="text-slate-500 text-[10px] truncate">{circuit.description}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-600 font-mono">{circuit.power}VA</span>
                                                                <button
                                                                    onClick={() => unassignCircuit(circuit.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                                                                    title="Desasignar"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* 🆕 Indicador de Balanceo de Fases */}
                                                <PhaseBalanceIndicator circuits={assignedCircuits} />
                                            </>
                                        )}


                                        {assignedCircuits.length === 0 && (
                                            panel.type === 'TP' ? (
                                                // Resumen del sistema para TP
                                                (() => {
                                                    const childPanels = config.panels.filter(p => p.parentId === panel.id);
                                                    const allCircuits = config.circuitInventory?.circuits || [];
                                                    const totalDPMS = allCircuits.length > 0 ? calculatePanelDPMS(allCircuits) : 0;
                                                    const totalIb = totalDPMS > 0 ? calculatePanelIb(totalDPMS, config.voltage) : 0;
                                                    const totalCarga = totalDPMS / 1000;

                                                    return (
                                                        <div className="py-4 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                                            <div className="text-center mb-3">
                                                                <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">📊 Resumen del Sistema</div>
                                                                <div className="text-[10px] text-blue-600 italic mt-0.5">Tablero de distribución principal</div>
                                                            </div>

                                                            <div className="space-y-2 text-xs">
                                                                <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                                                                    <span className="text-slate-600">Tableros alimentados:</span>
                                                                    <span className="font-bold text-blue-900">
                                                                        {childPanels.length} ({childPanels.map(p => p.type).join(', ')})
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                                                                    <span className="text-slate-600">Carga total:</span>
                                                                    <span className="font-bold text-blue-900">{totalCarga.toFixed(2)} kW</span>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                                                                    <span className="text-slate-600">Corriente total:</span>
                                                                    <span className="font-bold text-blue-900">{totalIb.toFixed(1)} A</span>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2 bg-white/60 rounded">
                                                                    <span className="text-slate-600">Circuitos totales:</span>
                                                                    <span className="font-bold text-blue-900">{allCircuits.length}</span>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 text-[10px] text-blue-700 text-center italic">
                                                                💡 Los circuitos se asignan a tableros seccionales
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                // Mensaje simple para otros tableros
                                                <div className="text-center py-6 text-slate-400 text-sm">
                                                    Sin circuitos asignados
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Warning si hay circuitos huérfanos */}
                    {
                        hasOrphans && (
                            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <div className="font-bold text-red-900">⚠️ Circuitos sin asignar</div>
                                        <div className="text-sm text-red-700">
                                            Todos los circuitos deben estar asignados a un tablero para continuar.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
            )}

            <div className="space-y-6">

                {/* LISTA DE TABLEROS (NUEVO DISEÑO COMPACTO) */}
                {(config.panels || []).map((panel) => (
                    <PanelEditor
                        key={panel.id}
                        panel={panel}
                        config={config}
                        assignedCircuits={getCircuitsForPanel(config.circuitInventory, panel.id)}
                        onUpdate={(updates) => updatePanel(panel.id, updates)}
                        onDelete={() => removePanel(panel.id)}
                        canDelete={panel.type !== 'TP'}
                        availablePanels={config.panels.filter(p => p.id !== panel.id)}
                        allPanels={config.panels}
                        onUnassignCircuit={unassignCircuit}
                        onAssignCircuit={assignCircuitToPanel}
                        isCollapsed={!!collapsedPanels[panel.id]}
                        onToggleCollapse={() => togglePanelCollapse(panel.id)}
                        onChange={onChange}
                    />
                ))}

                {/* Botones Agregar TSG / TS */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => addSectionalPanel('TSG')}
                        className="py-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 hover:text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar TSG (Interior)
                    </button>
                    <button
                        onClick={() => addSectionalPanel('TS')}
                        className="py-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar TS (Quincho/Planta)
                    </button>
                </div>
            </div>


            {/* Preferencias de Materiales removed per user request */}

            <div className="flex justify-between pt-6 border-t">
                <button
                    onClick={onBack}
                    className="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50"
                >
                    Atrás
                </button>
                <div className="relative group">
                    <button
                        onClick={onCalculate}
                        disabled={!isValid}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isValid ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105' : 'bg-slate-300 cursor-not-allowed'}`}
                        title={hasOrphans ? 'Debes asignar todos los circuitos antes de continuar' : ''}
                    >
                        Continuar a Resultados
                    </button>
                    {hasOrphans && (
                        <div className="absolute bottom-full mb-2 right-0 bg-red-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            ⚠️ Asigna todos los circuitos primero
                        </div>
                    )}
                </div>
            </div>

        </div >
    );
}
