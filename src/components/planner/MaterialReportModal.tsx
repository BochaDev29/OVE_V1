import React, { useMemo, useState } from 'react';
import { X, Download, ClipboardList, FileSpreadsheet, DollarSign, Zap, Cable, Box } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../contexts/AuthContext';
import { BudgetService } from '../../services/budget.service';
import { BudgetEditorModal } from '../budget/BudgetEditorModal';
import { convertMaterialReportToComputeItems, generateBudgetFromComputo } from '../../lib/budget/budgetGenerator';
import type { BudgetLineItem } from '../../types/budget';
import { CircuitInventoryItemForCAD } from '../../lib/electrical-rules';

interface MaterialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: any[];
  pipes: any[];
  walls: any[];
  pixelsPerMeter: number;
  calculationData?: any;
}

export default function MaterialReportModal({
  isOpen,
  onClose,
  symbols,
  pipes,
  walls,
  pixelsPerMeter,
  calculationData
}: MaterialReportModalProps) {
  const { user } = useAuth();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [budgetMode, setBudgetMode] = useState<'from_compute' | 'flash'>('from_compute');
  const [loadingBudget, setLoadingBudget] = useState(false);

  // --- CÁLCULOS POR CIRCUITO ---
  const reportByCircuit = useMemo(() => {
    if (!isOpen || !calculationData?.config) return null;

    const config = calculationData.config;
    const inventory = config.circuitInventoryForCAD as CircuitInventoryItemForCAD[] || [];
    const panels = config.panels as Panel[] || [];
    const circuitGroups: Record<string, any> = {};

    // Inicializar grupos para circuitos conocidos + Especiales (LP, CS, PAT)
    // 1. Circuitos Terminales (del inventario)
    inventory.forEach(c => {
      circuitGroups[c.id] = {
        id: c.id,
        info: c,
        counts: {} as Record<string, number>,
        proyectadoCounts: {} as Record<string, number>,
        relevadoCounts: {} as Record<string, number>,
        pipeMeters: 0,
        cableMeters: 0,
        cableSection: c.cable?.section || 2.5,
        conduitSize: c.conduit?.size || 'Ø 19mm',
        method: c.conduit?.method || 'B1',
        type: 'TERMINAL'
      };
    });

    // 2. Línea Principal (LP)
    const tp = panels.find(p => p.type === 'TP' || p.parentId === 'medidor');

    if (tp && tp.incomingLine) {
      circuitGroups['LP'] = {
        id: 'LP',
        info: { designation: 'LP', description: 'Línea Principal' },
        counts: {}, proyectadoCounts: {}, relevadoCounts: {}, pipeMeters: 0, cableMeters: 0,
        cableSection: tp.incomingLine.section || config.acometida?.seccion || 6,
        conduitSize: tp.incomingLine.conduitDiameter || 'Ø 25mm',
        method: tp.incomingLine.method || 'B1',
        conductors: config.voltage === '380V' ? 4 : 2,
        type: 'ALIMENTACION'
      };
    }

    // 3. Circuitos Seccionales (CS)
    panels.forEach(p => {
      if ((p.type === 'TSG' || p.type === 'TS') && p.incomingLine) {
        const id = `CS-${p.id}`;
        circuitGroups[id] = {
          id,
          info: { designation: `CS-${p.name}`, description: `Alimentación ${p.name}` },
          counts: {}, proyectadoCounts: {}, relevadoCounts: {}, pipeMeters: 0, cableMeters: 0,
          cableSection: p.incomingLine.section || 4,
          conduitSize: p.incomingLine.conduitDiameter || 'Ø 22mm',
          method: p.incomingLine.method || 'B1',
          conductors: p.voltage === '380V' ? 4 : 2,
          type: 'ALIMENTACION'
        };
      }
    });

    // 4. Puesta a Tierra (PAT)
    const panelWithPAT = panels.find(p => p.grounding?.hasPAT);
    if (panelWithPAT) {
      // 🆕 Cálculo dinámico para asegurar consistencia (SSoT: Wizard LP Section)
      const lpSectionForPAT = tp?.incomingLine?.section || config.acometida?.seccion || 4;
      const speSuggested = lpSectionForPAT <= 16 ? lpSectionForPAT : (lpSectionForPAT / 2);
      const speFinal = Math.max(speSuggested, 2.5);

      const patInfo = panelWithPAT.grounding?.materials?.cablePAT;
      circuitGroups['PAT'] = {
        id: 'PAT',
        info: { designation: 'PAT', description: 'Red de Puesta a Tierra' },
        counts: {}, proyectadoCounts: {}, relevadoCounts: {}, pipeMeters: 0, cableMeters: 0,
        cableSection: Math.max(patInfo?.section || 0, speFinal),



        conduitSize: 'Ø 19mm',
        method: 'B1',
        conductors: 1,
        type: 'PAT'
      };
    }

    // Procesar Símbolos
    symbols.forEach(s => {
      if (s.type === 'text' || s.type === 'label' || s.type === 'table' || s.type === 'roomGroup') return;
      const circuitId = s.circuitId || 'S/C';

      if (!circuitGroups[circuitId]) {
        circuitGroups[circuitId] = { id: circuitId, info: null, counts: {}, proyectadoCounts: {}, relevadoCounts: {}, pipeMeters: 0, cableMeters: 0, cableSection: 2.5, conduitSize: 'Ø 19mm', method: 'B1', type: 'TERMINAL' };
      }

      const key = s.type === 'light' ? 'Bocas de Techo (Octogonales)' :
        s.type === 'wall_light' ? 'Bocas de Pared (Apliques)' :
          s.type === 'outlet' ? 'Cajas Rectangulares (Tomas)' :
            s.type === 'switch' ? 'Cajas Rectangulares (Llaves)' :
              s.type === 'ac' ? 'Tomas Aire Acondicionado' :
                s.type === 'fan' ? 'Bocas Ventilador' :
                  s.type === 'board' ? 'Tablero General' :
                    s.type === 'tpu' ? 'Tablero TPU' :
                      s.type === 'cp' ? 'Cajas de Paso/Derivación' :
                        s.type === 'ground' ? 'Jabalina / PAT' : s.type;

      const group = circuitGroups[circuitId];
      group.counts[key] = (group.counts[key] || 0) + 1;
      if (s.nature === 'relevado') {
        group.relevadoCounts[key] = (group.relevadoCounts[key] || 0) + 1;
      } else {
        group.proyectadoCounts[key] = (group.proyectadoCounts[key] || 0) + 1;
      }
    });

    // Procesar Cañerías
    pipes.forEach(p => {
      const circuitId = p.circuitId || 'S/C';
      if (!circuitGroups[circuitId]) {
        circuitGroups[circuitId] = { id: circuitId, info: null, counts: {}, proyectadoCounts: {}, relevadoCounts: {}, pipeMeters: 0, cableMeters: 0, cableSection: 2.5, conduitSize: 'Ø 19mm', method: 'B1', type: 'TERMINAL' };
      }

      const dx = p.points[2] - p.points[0];
      const dy = p.points[3] - p.points[1];
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const meters = pixelLength / pixelsPerMeter;

      const group = circuitGroups[circuitId];
      group.pipeMeters += meters;
    });

    // Calcular Cables y Bajadas por grupo
    Object.values(circuitGroups).forEach((group: any) => {
      const verticalDrops = (group.counts['Cajas Rectangulares (Tomas)'] || 0) * 1.5 +
        (group.counts['Cajas Rectangulares (Llaves)'] || 0) * 1.5 +
        (group.counts['Bocas de Pared (Apliques)'] || 0) * 0.5;

      // Multiplicador de hilos (Fase + Neutro + Tierra = 3 por defecto para terminales)
      const conductors = group.conductors || group.info?.cable?.conductors || 3;
      group.cableMeters = (group.pipeMeters + verticalDrops) * conductors;
    });

    // Totales generales para construcción
    let totalWallMeters = 0;
    walls.forEach(w => {
      const dx = w.points[2] - w.points[0];
      const dy = w.points[3] - w.points[1];
      totalWallMeters += Math.sqrt(dx * dx + dy * dy) / pixelsPerMeter;
    });

    const roomGroups = symbols.filter(s => s.type === 'roomGroup' || s.groupId);
    const uniqueRoomGroups = new Set(roomGroups.map(s => s.groupId || s.id));
    const totalRooms = uniqueRoomGroups.size;
    const estimatedArea = totalWallMeters > 0 ? Math.pow(totalWallMeters / 4, 2) : 0;

    return {
      circuits: Object.values(circuitGroups).sort((a: any, b: any) => {
        // Ordenar: LP, CS, Terminales, S/C
        const order = { 'LP': 1, 'PAT': 100, 'S/C': 999 };
        const aOrder = (order as any)[a.id] || (a.id.startsWith('CS') ? 50 : 200);
        const bOrder = (order as any)[b.id] || (b.id.startsWith('CS') ? 50 : 200);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.id.localeCompare(b.id);
      }),
      totalWallMeters,
      totalRooms,
      estimatedArea
    };
  }, [symbols, pipes, walls, pixelsPerMeter, isOpen, calculationData]);

  if (!isOpen) return null;

  // --- GENERAR PRESUPUESTO ---
  const handleGenerateBudget = async () => {
    if (!user) {
      alert('Debes iniciar sesión para generar presupuestos');
      return;
    }

    try {
      setLoadingBudget(true);
      const userBudgetItems = await BudgetService.getUserBudgetItems(user.id);

      if (userBudgetItems.length === 0) {
        alert('Primero debes configurar tus items de presupuesto. Ve a Configuración → Presupuestos.');
        return;
      }

      // Consolidar contadores proyectados para el generador de presupuesto
      const globalProyectado: Record<string, number> = {};
      let totalProyPipe = 0;
      let totalProyCable = 0;

      reportByCircuit?.circuits.forEach(c => {
        Object.entries(c.proyectadoCounts).forEach(([key, val]) => {
          globalProyectado[key] = (globalProyectado[key] || 0) + (val as number);
        });
        totalProyPipe += c.pipeMeters;
        totalProyCable += c.cableMeters;
      });

      const computeItems = convertMaterialReportToComputeItems(
        globalProyectado,
        totalProyPipe,
        totalProyCable,
        reportByCircuit?.totalWallMeters || 0,
        reportByCircuit?.totalRooms || 0,
        reportByCircuit?.estimatedArea || 0
      );

      const generatedItems = generateBudgetFromComputo(computeItems, userBudgetItems);
      setBudgetItems(generatedItems);
      setBudgetMode('from_compute');
      setShowBudgetEditor(true);
    } catch (error) {
      console.error('Error generating budget:', error);
      alert('Error al generar presupuesto');
    } finally {
      setLoadingBudget(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Cómputo Metrificado por Circuito", 14, 22);
      doc.setFontSize(10); doc.text(`Proyecto: ${calculationData?.config?.clientName || 'Sin título'}`, 14, 30);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 35);

      let currentY = 45;

      reportByCircuit?.circuits.forEach(circuit => {
        if (Object.keys(circuit.counts).length === 0 && circuit.pipeMeters === 0) return;

        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${circuit.info?.designation || circuit.id} - ${circuit.info?.description || ''}`, 14, currentY);
        currentY += 6;

        const techInfo = `Cable: ${circuit.cableSection}mm² | Caño: ${circuit.conduitSize} | Método: ${circuit.method}`;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(techInfo, 14, currentY);
        currentY += 4;

        const body = [
          ...Object.entries(circuit.counts).map(([name, count]) => [name, count, 'Unidades']),
          ['Cañería (Tramo)', circuit.pipeMeters.toFixed(2), 'Metros'],
          ['Cable conductor', Math.ceil(circuit.cableMeters), 'Metros']
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['Concepto', 'Cantidad', 'Unidad']],
          body: body,
          theme: 'striped',
          margin: { left: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
      });

      doc.save('computo_por_circuito.pdf');
    } catch (error) { console.error(error); alert("Error al exportar PDF."); }
  };

  const handleDownloadExcel = () => {
    let csv = "\uFEFFConcepto,Cantidad,Unidad,Circuito,Especificación\n";
    reportByCircuit?.circuits.forEach(c => {
      const spec = `${c.cableSection}mm - ${c.conduitSize}`;
      Object.entries(c.counts).forEach(([name, count]) => {
        csv += `"${name}",${count},Unidades,"${c.id}","${spec}"\n`;
      });
      csv += `Cañería,${c.pipeMeters.toFixed(2)},Metros,"${c.id}","${spec}"\n`;
      csv += `Cable,${Math.ceil(c.cableMeters)},Metros,"${c.id}","${spec}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'computo_por_circuito.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center space-x-3 text-slate-800">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Listado de Materiales</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cómputo Metrificado por Circuito</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          <div className="grid gap-6">
            {reportByCircuit?.circuits.map((circuit) => {
              if (Object.keys(circuit.counts).length === 0 && circuit.pipeMeters === 0) return null;

              const isSpecial = circuit.id === 'LP' || circuit.id === 'CS' || circuit.id === 'PAT' || circuit.id.startsWith('CS-');
              const bgColor = isSpecial ? 'from-slate-100 to-slate-200 border-slate-300' : 'from-blue-50 to-white border-blue-100';
              const headerColor = isSpecial ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white';

              return (
                <div key={circuit.id} className={`bg-gradient-to-br ${bgColor} rounded-xl border-2 shadow-sm overflow-hidden`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${headerColor}`}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold text-sm uppercase">{circuit.info?.designation || circuit.id}</span>
                      <span className="text-xs opacity-90 font-medium">| {circuit.info?.description || (isSpecial ? 'Línea de Alimentación' : 'Circuito Terminal')}</span>
                    </div>
                    {circuit.info?.nature === 'relevado' && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">RELEVADO</span>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Header Técnico */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white/60 p-2 rounded border border-white flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Cable</span>
                        <span className="text-sm font-black text-slate-800">{circuit.cableSection}mm²</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded border border-white flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Cañería</span>
                        <span className="text-sm font-black text-slate-800">{circuit.conduitSize}</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded border border-white flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Método</span>
                        <span className="text-sm font-black text-slate-800">{circuit.method}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Cajas */}
                      {Object.keys(circuit.counts).length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                            <Box className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase">Cajas y Elementos</span>
                          </div>
                          <div className="bg-white/80 rounded border border-slate-100 divide-y divide-slate-50">
                            {Object.entries(circuit.counts).map(([name, count]) => (
                              <div key={name} className="flex justify-between p-2 text-sm">
                                <span className="text-slate-600">{name}</span>
                                <span className="font-bold text-slate-900">{count} u.</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metrise */}
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                          <Cable className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase">Canalización y Conductores</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-2 rounded border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Metros de Caño</span>
                            <span className="text-lg font-black text-blue-900">{circuit.pipeMeters.toFixed(2)} m</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Metros de Cable</span>
                            <span className="text-lg font-black text-blue-900">{Math.ceil(circuit.cableMeters)} m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* SECCIÓN: OBRA CIVIL / MUROS */}
            <div className="bg-slate-800 rounded-xl p-4 text-white shadow-lg">
              <h3 className="font-bold text-sm mb-4 border-b border-slate-600 pb-2 flex items-center gap-2">
                🏗️ Totales de Obra Civil (Referencia)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Muros Totales</span>
                  <span className="text-xl font-black">{reportByCircuit?.totalWallMeters.toFixed(1)} m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Ambientes</span>
                  <span className="text-xl font-black">{reportByCircuit?.totalRooms} ud.</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Superficie Est.</span>
                  <span className="text-xl font-black">{reportByCircuit?.estimatedArea.toFixed(1)} m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-between items-center px-6">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-bold text-sm">Cerrar</button>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateBudget}
              disabled={loadingBudget}
              className="flex items-center space-x-2 px-5 py-2.5 bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-all font-bold shadow-md shadow-purple-100 border-b-4 border-purple-800 disabled:opacity-50 active:border-b-0 active:translate-y-1"
            >
              <DollarSign className="w-4 h-4" />
              <span>{loadingBudget ? 'Calculando...' : 'Pasar a Presupuesto'}</span>
            </button>
            <button onClick={handleDownloadExcel} className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl transition-all font-bold shadow-md shadow-green-100 border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button onClick={handleDownloadPDF} className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all font-bold shadow-md shadow-blue-100 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {showBudgetEditor && (
        <BudgetEditorModal
          isOpen={showBudgetEditor}
          onClose={() => setShowBudgetEditor(false)}
          mode={budgetMode}
          initialItems={budgetItems}
        />
      )}
    </div>
  );
}