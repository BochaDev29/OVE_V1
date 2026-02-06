import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, FileText, Zap, CheckCircle2, ShieldCheck, Pen, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ProjectConfig,
  EnvironmentCalculation,
  CircuitInventory,
  calculateConsolidatedSummary,
  ConsolidatedSummary,
  calculateIz,
  LineLink,
  initializeElectricalRules,
} from '../../lib/electrical-rules';

interface Step4Props {
  config: ProjectConfig;
  circuitInventory?: CircuitInventory;
  environments: EnvironmentCalculation[];
  onBack: () => void;
  projectId?: string | null;
  onSaveProject: () => Promise<string | null>;
}

export default function ProjectWizardStep4({
  config,
  circuitInventory,
  environments,
  onSaveProject,
  onBack,
  projectId,
}: Step4Props) {
  const navigate = useNavigate();
  const [rulesInitialized, setRulesInitialized] = useState(false);

  // Asegurar que las reglas (tablas Iz) estén cargadas
  useEffect(() => {
    initializeElectricalRules().then(() => {
      setRulesInitialized(true);
    });
  }, []);

  // Calcular resumen consolidado
  const summary: ConsolidatedSummary = calculateConsolidatedSummary(
    circuitInventory,
    config,
    environments
  );

  const [isSaving, setIsSaving] = React.useState(false);

  // Handler para ir al Taller CAD
  const handleGoToTaller = async () => {
    // Guardar datos del cálculo en sessionStorage para que el Taller los use
    const calculationData = {
      config,
      environments,
      calculation: {
        totalBocas: summary.totalBocas,
        dpmsTotal: summary.dpmsTotal,
        dpmsKW: summary.dpmsKW,
        dpmsKVA: summary.dpmsKVA,
        current: summary.current,
        voltage: summary.voltage,
        grade: summary.grade,
        totalInstalledLoad: summary.totalInstalledLoad,
        iluminationPower: summary.iluminationPower,
        socketsPower: summary.socketsPower,
        specialPower: summary.specialPower,
        minCircuits: summary.minCircuits,
        actualCircuits: summary.actualCircuits,
        totalPanels: summary.totalPanels,
        panelsSummary: summary.panelsSummary,
        circuits: (circuitInventory?.circuits || []).map(c => ({
          id: c.id,
          type: c.type,
          description: c.name,
          bocas: c.bocas,
          power: c.power,
          cable: c.cable || (c.terminalLine?.section ? `${c.terminalLine.section}mm²` : 'N/A'),
          breaker: c.breaker || 'N/A'
        }))
      }
    };

    console.log('💾 Guardando calculation_data en sessionStorage:', calculationData);
    sessionStorage.setItem('oveCalculationData', JSON.stringify(calculationData));

    // Navegar al taller (usaremos el projectId si existe)
    if (projectId && projectId !== 'draft') {
      navigate(`/taller/${projectId}`);
    } else {
      // Si no hay proyecto guardado, guardar primero
      setIsSaving(true);
      try {
        const newId = await onSaveProject();
        if (newId) {
          navigate(`/taller/${newId}`);
        }
      } catch (error) {
        console.error('Error al guardar antes de ir al taller:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* --- RESUMEN PRINCIPAL --- */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border border-blue-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold">Grado de Electrificación</p>
            <p className="text-2xl font-black text-blue-900 uppercase">{summary.grade}</p>
            <p className="text-xs text-blue-500 mt-1">
              {config.destination === 'vivienda' ? 'Vivienda' : 'Local'} - {config.surfaceArea} m²
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-purple-600 uppercase tracking-wider font-semibold">Carga Instalada</p>
            <p className="text-2xl font-black text-purple-900">
              {summary.dpmsKW.toFixed(2)} kW
            </p>
            <p className="text-xs text-purple-500 mt-1">{Math.round(summary.totalInstalledLoad)} VA</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold">DPMS Total</p>
            <p className="text-2xl font-black text-blue-900">
              {summary.dpmsKVA.toFixed(2)} kVA
            </p>
            <p className="text-xs text-blue-500 mt-1">{Math.round(summary.dpmsTotal)} VA</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Corriente Total</p>
            <p className="text-2xl font-black text-amber-900">
              {summary.current.toFixed(1)} A
            </p>
            <p className="text-xs text-amber-500 mt-1">{summary.voltage}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- TARJETA DE CIRCUITOS --- */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Check className="w-5 h-5 text-green-600" />
            Circuitos y Bocas
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between items-center">
              <span className="text-slate-600">Circuitos Mínimos (Norma):</span>
              <span className="font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">{summary.minCircuits}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-600">Circuitos Configurados:</span>
              <span className="font-bold bg-blue-50 px-2 py-1 rounded text-blue-700">{summary.actualCircuits}</span>
            </li>
            <li className="flex justify-between items-center pt-2">
              <span className="text-slate-600">Total Bocas:</span>
              <span className="font-bold text-lg">{summary.totalBocas}</span>
            </li>
            <li className="flex justify-between items-center pt-2 border-t">
              <span className="text-slate-600">Tableros:</span>
              <span className="font-bold text-lg">{summary.totalPanels}</span>
            </li>
          </ul>
        </div>

        {/* --- TARJETA DE POTENCIA --- */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Detalle de Cargas
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-600">Iluminación (IUG):</span>
              <span className="font-medium">{summary.iluminationPower} VA</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Tomas (TUG):</span>
              <span className="font-medium">{summary.socketsPower} VA</span>
            </li>
            {summary.specialPower > 0 && (
              <li className="flex justify-between text-amber-700 bg-amber-50 px-2 rounded">
                <span className="font-medium">Especiales (TUE/ACU):</span>
                <span className="font-bold">{summary.specialPower} VA</span>
              </li>
            )}
            <li className="flex justify-between border-t pt-3 mt-2">
              <span className="text-slate-600 font-bold">Total:</span>
              <div className="text-right">
                <p className="font-mono font-bold text-blue-600">{Math.round(summary.dpmsTotal)} VA</p>
                <p className="text-xs text-slate-500">{summary.dpmsKVA.toFixed(2)} kVA • {summary.dpmsKW.toFixed(2)} kW</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* --- RESUMEN POR TABLERO --- */}
      {summary.panelsSummary.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Resumen por Tablero
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.panelsSummary.map(panel => (
              <div key={panel.id} className="bg-slate-50 p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">{panel.name}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono uppercase tracking-tighter">{panel.voltage}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase">Circs</p>
                    <p className="font-bold text-slate-700">{panel.circuitCount}</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase">DPMS</p>
                    <p className="font-bold text-blue-600">{Math.round(panel.dpms)}</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase">Ib (A)</p>
                    <p className="font-bold text-amber-600">{panel.ib.toFixed(1)}</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase">Prot</p>
                    <p className="font-bold text-indigo-600">{panel.protectionCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PROTECCIONES CABECERA (TP) --- */}
      {config.panels.find(p => p.type === 'TP' || p.parentId === 'medidor')?.protections?.headers && (
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
          <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 border-b border-indigo-200 pb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Protecciones de Cabecera (Entrada)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {config.panels.find(p => p.type === 'TP' || p.parentId === 'medidor')?.protections.headers.map(header => (
              <div key={header.id} className="bg-white p-3 rounded-lg border border-indigo-200 shadow-xs flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-full">
                  <Zap className={`w-4 h-4 ${header.type === 'ID' ? 'text-blue-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center italic">
                    <span className="text-[10px] text-indigo-400 uppercase font-semibold">{header.type}</span>
                    <div className="flex gap-1 items-center">
                      {header.nature === 'relevado' && (
                        <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-bold">REL</span>
                      )}
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded">{header.poles}P</span>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 text-sm leading-none mt-1">{header.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {header.rating}A • {header.type === 'PIA' ? `Curva ${header.curve}` : `Sens. ${header.sensitivity || '30mA'}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* --- TABLA DE RESUMEN TÉCNICO DETALLADO --- */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Planilla Técnica General
        </h4>

        <div className="overflow-x-auto pb-2">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-2 text-left text-xs font-bold text-slate-600 uppercase w-32 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">Parámetro</th>
                {/* LÍNEA PRINCIPAL (LP) */}
                {config.panels.filter(p => p.type === 'TP').map(panel => (
                  <th key={`lp-${panel.id}`} className="p-2 text-center border-r border-slate-100 min-w-[100px] bg-blue-50 text-blue-800">
                    <div className="font-black">LP</div>
                    <div className="text-[10px] font-normal">{panel.name}</div>
                  </th>
                ))}

                {/* CIRCUITOS SECCIONALES (CS) */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => (
                  <th key={`cs-${panel.id}`} className="p-2 text-center border-r border-slate-100 min-w-[100px] bg-indigo-50 text-indigo-800">
                    <div className="font-black">CS</div>
                    <div className="text-[10px] font-normal">{panel.name}</div>
                  </th>
                ))}

                {/* CIRCUITOS TERMINALES */}
                {circuitInventory?.circuits.map(circuit => (
                  <th key={`c-${circuit.id}`} className="p-2 text-center border-r border-slate-100 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1">
                      <div className="font-bold text-slate-700 whitespace-nowrap">{circuit.id.split('-').length > 1 ? `${circuit.id.split('-')[0]}-${circuit.id.split('-')[1]}` : circuit.id}</div>
                      {circuit.nature === 'relevado' && (
                        <span className="text-[8px] bg-slate-200 text-slate-500 px-0.5 rounded leading-none">R</span>
                      )}
                    </div>
                    <div className="text-[9px] font-normal text-slate-500 truncate max-w-[100px]" title={circuit.name}>{circuit.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* FILA 1: ID (Ya está en el header, pero lo repetimos explícitamente si se pide) */}

              {/* FILA 2: DPMS (VA) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">DPMS (VA)</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-bold text-blue-600">
                    {Math.round(summary.panelsSummary.find(ps => ps.id === panel.id)?.dpms || 0)}
                  </td>
                ))}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-bold text-indigo-600">
                    {Math.round(summary.panelsSummary.find(ps => ps.id === panel.id)?.dpms || 0)}
                  </td>
                ))}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center font-medium text-slate-700">
                    {Math.round(circuit.power)}
                  </td>
                ))}
              </tr>

              {/* FILA 3: Tensión (V) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">Tensión (V)</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center text-xs">
                    {panel.voltage}
                  </td>
                ))}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center text-xs">
                    {panel.voltage}
                  </td>
                ))}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center text-xs text-slate-500">
                    {circuit.voltage || config.voltage}
                  </td>
                ))}
              </tr>

              {/* FILA 4: Ib (A) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">Ib (A) - Proy.</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-medium">
                    {summary.panelsSummary.find(ps => ps.id === panel.id)?.ib.toFixed(2)}
                  </td>
                ))}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-medium">
                    {summary.panelsSummary.find(ps => ps.id === panel.id)?.ib.toFixed(2)}
                  </td>
                ))}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center font-medium text-amber-700">
                    {circuit.ib.toFixed(2)}
                  </td>
                ))}
              </tr>

              {/* FILA 5: Sección L/N (mm²) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">Sección L/N</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-bold">
                    {panel.incomingLine?.section || '-'} mm²
                  </td>
                ))}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => (
                  <td key={panel.id} className="p-2 text-center font-bold">
                    {panel.incomingLine?.section || '-'} mm²
                  </td>
                ))}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center font-bold text-slate-800">
                    {circuit.cable.replace('mm²', '')} mm²
                  </td>
                ))}
              </tr>

              {/* FILA 6: Sección PAT / PE (mm²) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">Sección PAT / PE</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => {
                  const s = panel.incomingLine?.section || 0;
                  const spe = s <= 16 ? s : (s / 2); // Regla básica
                  const speFinal = Math.max(spe, 2.5); // Mínimo 2.5mm
                  return (
                    <td key={panel.id} className="p-2 text-center font-medium text-green-700">
                      {speFinal} mm²
                    </td>
                  );
                })}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => {
                  const s = panel.incomingLine?.section || 0;
                  const spe = s <= 16 ? s : (s / 2);
                  const speFinal = Math.max(spe, 2.5);
                  return (
                    <td key={panel.id} className="p-2 text-center font-medium text-green-700">
                      {speFinal} mm²
                    </td>
                  );
                })}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => {
                  // Parse section "2.5mm²" -> 2.5
                  const sStr = circuit.cable.replace(/[^\d.]/g, '');
                  const s = parseFloat(sStr) || 0;
                  const spe = s <= 16 ? s : (s / 2);
                  const speFinal = Math.max(spe, 2.5);
                  return (
                    <td key={circuit.id} className="p-2 text-center font-medium text-green-700">
                      {speFinal} mm²
                    </td>
                  );
                })}
              </tr>

              {/* FILA 7: Iz (A) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">Iz (A) - Adm.</td>
                {/* LP */}
                {config.panels.filter(p => p.type === 'TP').map(panel => {
                  const iz = panel.incomingLine ? calculateIz(panel.incomingLine, panel.voltage) : 0;
                  return (
                    <td key={panel.id} className="p-2 text-center text-xs text-blue-800 font-medium">
                      {iz > 0 ? Math.round(iz) : '-'}
                    </td>
                  );
                })}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => {
                  const iz = panel.incomingLine ? calculateIz(panel.incomingLine, panel.voltage) : 0;
                  return (
                    <td key={panel.id} className="p-2 text-center text-xs text-indigo-800 font-medium">
                      {iz > 0 ? Math.round(iz) : '-'}
                    </td>
                  );
                })}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => {
                  // Reconstruir LineLink para cálculo
                  const sStr = circuit.cable.replace(/[^\d.]/g, '');
                  const s = parseFloat(sStr) || 2.5;

                  const line: LineLink = {
                    method: circuit.terminalLine?.method || 'B1',
                    section: s,
                    material: 'Cu',
                    length: circuit.terminalLine?.averageLength || 10,
                    groupingCount: 1,
                    ambientTemp: 40,
                    conduitMaterial: 'PVC'
                  };

                  const iz = calculateIz(line, circuit.voltage || '220V');

                  return (
                    <td key={circuit.id} className="p-2 text-center text-xs text-slate-700 font-bold">
                      {Math.round(iz)}
                    </td>
                  );
                })}
              </tr>

              {/* FILA 8: In (A) - Protecciones (PIA) */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">In (A) - Prot.</td>
                {/* LP (Protección de cabecera) */}
                {config.panels.filter(p => p.type === 'TP').map(panel => {
                  const header = panel.protections?.headers?.[0]; // Tomamos la primera de cabecera como general
                  return (
                    <td key={panel.id} className="p-2 text-center font-bold text-red-700 text-xs">
                      {header ? `${header.rating}A` : '-'}
                    </td>
                  );
                })}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => {
                  const header = panel.protections?.headers?.[0];
                  return (
                    <td key={panel.id} className="p-2 text-center font-bold text-red-700 text-xs">
                      {header ? `${header.rating}A` : '-'}
                    </td>
                  );
                })}
                {/* Circuitos */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center font-bold text-red-700 text-xs">
                    {/* "2x16A" -> "16A" */}
                    {circuit.breaker.split('x')[1] || circuit.breaker}
                  </td>
                ))}
              </tr>

              {/* FILA 9: Disyuntor / ID */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-2 font-bold text-slate-600 bg-white sticky left-0 border-r border-slate-200 shadow-sm">ID / Dif.</td>
                {/* LP (ID Cabecera) */}
                {config.panels.filter(p => p.type === 'TP').map(panel => {
                  const headerID = panel.protections?.headers?.find(h => h.type === 'ID');
                  return (
                    <td key={panel.id} className="p-2 text-center text-xs font-bold text-blue-700">
                      {headerID ? (
                        <div className="flex flex-col">
                          <span>{headerID.rating}A</span>
                          <span className="text-[9px] text-blue-500 font-normal">{headerID.sensitivity || '30mA'}</span>
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
                {/* CS */}
                {config.panels.filter(p => p.type !== 'TP').map(panel => {
                  const headerID = panel.protections?.headers?.find(h => h.type === 'ID');
                  return (
                    <td key={panel.id} className="p-2 text-center text-xs font-bold text-indigo-700">
                      {headerID ? (
                        <div className="flex flex-col">
                          <span>{headerID.rating}A</span>
                          <span className="text-[9px] text-indigo-500 font-normal">{headerID.sensitivity || '30mA'}</span>
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
                {/* Circuitos (No llevan ID por circuito en este resumen, salvo que sea específico, pero en general no) */}
                {circuitInventory?.circuits.map(circuit => (
                  <td key={circuit.id} className="p-2 text-center text-[10px] text-slate-400">
                    -
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* BOTÓN: IR AL TALLER CAD */}
      <button
        onClick={handleGoToTaller}
        disabled={isSaving}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 disabled:opacity-50"
      >
        {isSaving ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Guardando...</span>
          </div>
        ) : (
          <>
            <Pen className="w-5 h-5" />
            <span>Ir al Taller CAD para Dibujar</span>
          </>
        )}
      </button>

      <div className="flex space-x-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
        >
          Volver
        </button>
        <button
          onClick={onSaveProject}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center space-x-2 shadow-md"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Guardar Proyecto</span>
        </button>
      </div>
    </div>
  );
}