import React from 'react';
import { ProjectConfig, Panel, calculateUserPATSection } from '../../lib/electrical-rules';
import {
    Calculator,
    Shield,
    Info,
    CheckCircle2,
    Circle,
    Zap,
    Pipette,
    Box,
    Ruler
} from 'lucide-react';

interface CalculationSidebarProps {
    calculationData: any;
    symbols: any[];
}

/**
 * Ayuda Memoria V3.0
 * Organización lógica:
 * 1. Equipos y Montaje (Tableros, Medidor, Cajas) + Alturas
 * 2. Plan de Canalización Unificado (LP, CS, PAT, CT)
 */
export const CalculationSidebar: React.FC<CalculationSidebarProps> = ({
    calculationData,
    symbols = []
}) => {
    if (!calculationData || !calculationData.config) return null;

    const { config } = calculationData;
    const panels = config.panels || [];
    // 🆕 CORRECCIÓN: Leer de circuitInventoryForCAD (generado en Wizard Step 3)
    const circuits = config.circuitInventoryForCAD || [];

    // 1. Auditoría de Símbolos Dibujados
    const auditSymbols = {
        hasMeter: symbols.some(s => s.type === 'meter'),
        hasTP: symbols.some(s => s.type === 'board' && (s.label?.toUpperCase().includes('TP') || !s.label)),
        hasPAT: symbols.some(s => s.type === 'ground'),
        hasTSG: symbols.some(s => s.type === 'board' && (s.label?.toUpperCase().includes('TS') || s.label?.toUpperCase().includes('SEC'))),
        hasCP: symbols.some(s => s.type === 'cp'),
    };

    // 2. Datos de PAT (Puesta a Tierra)
    const tp = panels.find((p: any) => p.type === 'TP' || p.parentId === 'medidor');

    // 🆕 Usar función centralizada de cálculo de PAT
    const lpSection = tp?.incomingLine?.section || config.acometida?.seccion || 4;
    const patSection = calculateUserPATSection(
        lpSection,
        config.voltage,
        config.pilar?.tipo
    );


    const patCable = `${patSection} mm²`;


    // 3. Agrupar circuitos únicos por tipo (para el plan de canalización)
    const uniqueCircuitTypes = Array.from(new Set(circuits.map((c: any) => c.type)))
        .map(type => circuits.find((c: any) => c.type === type));

    // Helper: Obtener dato real o fallback descriptivo para no hardcodear supuestos
    const getRealValue = (val: any) => {
        if (!val || val === '---' || val === 'N/A' || val === 'Ninguno' || val === 'Ø ') return '---';
        return val;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-lg">Ayuda Memoria</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">Guía de Montaje y Trazado</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* SECCIÓN 1: EQUIPOS, GABINETES Y CAJAS */}
                <div className="bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-indigo-500 overflow-hidden">
                    <div className="p-3 bg-slate-800/50 flex items-center gap-2 border-b border-slate-700">
                        <Box className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-300">Tableros, Gabinetes y Cajas</h4>
                    </div>

                    <div className="p-3">
                        <div className="grid grid-cols-4 text-[9px] font-black text-slate-500 uppercase px-2 mb-2">
                            <span className="col-span-1">ÍTEM</span>
                            <span className="col-span-1 text-center">TIPO</span>
                            <span className="col-span-1 text-center">ALTURA</span>
                            <span className="col-span-1 text-right">DIBUJADO</span>
                        </div>

                        <div className="space-y-1.5">
                            {/* Medidor (si aplica) */}
                            {config.includesPillar && (
                                <EquipmentRow
                                    label="Medidor"
                                    type="Pilar"
                                    height="1.10m"
                                    active={auditSymbols.hasMeter}
                                />
                            )}

                            {/* Tableros (TP, TSG, etc) */}
                            {panels.map((p: any) => (
                                <EquipmentRow
                                    key={p.id}
                                    label={p.name}
                                    type={p.type}
                                    height={p.physicalData?.height !== undefined ? `${p.physicalData.height} m` : '---'}
                                    active={p.type === 'TP' ? auditSymbols.hasTP : auditSymbols.hasTSG}
                                />
                            ))}

                            {/* PAT */}
                            <EquipmentRow
                                label="PAT"
                                type="Jabalina"
                                height="Nivel 0"
                                active={auditSymbols.hasPAT}
                            />

                            {/* Cajas de Paso */}
                            <EquipmentRow
                                label="Caja Paso"
                                type="CP"
                                height="2.10m"
                                active={auditSymbols.hasCP}
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: PLAN UNIFICADO DE CANALIZACIONES */}
                <div className="bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-blue-500 overflow-hidden">
                    <div className="p-3 bg-slate-800/50 flex items-center gap-2 border-b border-slate-700">
                        <Pipette className="w-4 h-4 text-blue-400" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Plan de Canalización</h4>
                    </div>

                    <div className="p-3">
                        <div className="grid grid-cols-4 text-[10px] font-black text-slate-500 uppercase px-2 mb-2">
                            <span className="col-span-1">LÍNEA</span>
                            <span className="col-span-1 text-center">CABLE</span>
                            <span className="col-span-1 text-center">CAÑO</span>
                            <span className="col-span-1 text-right">MÉTODO</span>
                        </div>

                        {/* 1. LÍNEA PRINCIPAL (LP) */}
                        {config.includesPillar && (
                            <ChannelRow
                                label="LP (Medidor-TP)"
                                cable={tp?.incomingLine?.section ? `${tp.incomingLine.section} mm² + PE` : '---'}
                                conduit={getRealValue(tp?.incomingLine?.conduitDiameter)}
                                method={getRealValue(tp?.incomingLine?.method)}
                                isMain={true}
                            />
                        )}

                        {/* 2. LÍNEAS SECCIONALES (CS) */}
                        {panels.filter((p: any) => p.type !== 'TP').map((p: any) => (
                            <ChannelRow
                                key={p.id}
                                label={`CS(${p.name})`}
                                cable={p.incomingLine?.section ? `${p.incomingLine.section} mm² + PE` : '---'}
                                conduit={getRealValue(p.incomingLine?.conduitDiameter)}
                                method={getRealValue(p.incomingLine?.method)}
                                highlight={true}
                            />
                        ))}

                        {/* 3. LÍNEA DE TIERRA (PAT) */}
                        <ChannelRow
                            label="PAT"
                            cable={patCable}
                            conduit={getRealValue(tp?.grounding?.conduitDiameter) || '---'}
                            method={getRealValue(tp?.grounding?.method) || '---'}
                        />

                        {/* 4. CIRCUITOS TERMINALES (CT) - 🆕 Actualizado para circuitInventoryForCAD */}
                        {uniqueCircuitTypes.map((c: any) => {
                            // 🆕 Extraer valores de la estructura CircuitInventoryItemForCAD
                            // cable: {section, type, conductors, material}
                            // conduit: {size, method, type, material}
                            const cableSection = c.cable?.section || '2.5';
                            const conduitSize = c.conduit?.size || '---';
                            const conduitMethod = c.conduit?.method || '---';

                            return (
                                <ChannelRow
                                    key={c.id}
                                    label={c.type}
                                    cable={`${cableSection} mm² + PE`}
                                    conduit={getRealValue(conduitSize)}
                                    method={getRealValue(conduitMethod)}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="pb-4" />
            </div>
        </div>
    );
};

// Componente helper para filas de Equipos
const EquipmentRow = ({ label, type, height, active }: { label: string, type: string, height: string, active: boolean }) => (
    <div className={`grid grid-cols-4 items-center p-2 rounded-lg border transition-all ${active
        ? 'bg-green-500/10 border-green-500/20 text-white'
        : 'bg-slate-800/30 border-slate-700/50 text-slate-400'
        }`}>
        <span className={`text-[10px] font-bold truncate ${active ? 'text-green-400' : ''}`}>{label}</span>
        <span className="text-center text-[9px] font-black opacity-50">{type}</span>
        <div className="flex items-center justify-center gap-1">
            <Ruler className="w-2.5 h-2.5 opacity-30" />
            <span className="text-[10px] font-mono">{height}</span>
        </div>
        <div className="flex justify-end">
            {active ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Circle className="w-3.5 h-3.5 text-slate-700" />}
        </div>
    </div>
);

// Componente helper para filas de Canalización
const ChannelRow = ({ label, cable, conduit, method, highlight = false, isMain = false }: { label: string, cable: string, conduit: string, method: string, highlight?: boolean, isMain?: boolean }) => (
    <div className={`grid grid-cols-4 items-center p-2 rounded-lg border text-[11px] transition-all ${isMain ? 'bg-blue-600 text-white ring-1 ring-blue-400 border-transparent shadow-sm' :
        highlight ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 font-medium' :
            'bg-slate-800/30 border-slate-700/50 text-slate-300'
        }`}>
        <span className={`font-bold truncate ${isMain ? 'text-white' : ''}`}>{label}</span>
        <span className={`text-center font-mono font-bold ${isMain ? 'text-white' : 'text-blue-400'}`}>{cable}</span>
        <span className={`text-center font-mono ${isMain ? 'text-blue-100' : 'text-slate-400'}`}>{conduit}</span>
        <span className={`text-right text-[9px] uppercase ${isMain ? 'text-blue-200' : 'text-slate-500 font-black'}`}>{method}</span>
    </div>
);

export default CalculationSidebar;
