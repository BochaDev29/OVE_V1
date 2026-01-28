import React, { useMemo, useState } from 'react';
import { X, Download, ClipboardList, FileSpreadsheet, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../contexts/AuthContext';
import { BudgetService } from '../../services/budget.service';
import { BudgetEditorModal } from '../budget/BudgetEditorModal';
import { convertMaterialReportToComputeItems, generateBudgetFromComputo } from '../../lib/budget/budgetGenerator';
import type { BudgetLineItem } from '../../types/budget';

interface MaterialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: any[];
  pipes: any[];
  walls: any[];
  pixelsPerMeter: number;
}

export default function MaterialReportModal({ isOpen, onClose, symbols, pipes, walls, pixelsPerMeter }: MaterialReportModalProps) {
  const { user } = useAuth();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [budgetMode, setBudgetMode] = useState<'from_compute' | 'flash'>('from_compute');
  const [loadingBudget, setLoadingBudget] = useState(false);

  if (!isOpen) return null;

  // --- CÁLCULOS MATEMÁTICOS ---
  const report = useMemo(() => {
    // SECCIÓN 1: ELEMENTOS ELÉCTRICOS
    const counts: Record<string, number> = {};
    symbols.forEach(s => {
      if (s.type === 'text' || s.type === 'label' || s.type === 'table') return;
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
      counts[key] = (counts[key] || 0) + 1;
    });

    // SECCIÓN 2: CAÑERÍAS Y CABLES
    let totalPipeMeters = 0;
    pipes.forEach(p => {
      const dx = p.points[2] - p.points[0];
      const dy = p.points[3] - p.points[1];
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      totalPipeMeters += pixelLength / pixelsPerMeter;
    });

    const verticalDrops = (counts['Cajas Rectangulares (Tomas)'] || 0) * 1.5 +
      (counts['Cajas Rectangulares (Llaves)'] || 0) * 1.5 +
      (counts['Bocas de Pared (Apliques)'] || 0) * 0.5;
    const totalCableMeters = (totalPipeMeters + verticalDrops) * 3;

    // SECCIÓN 3: MUROS (NUEVO)
    let totalWallMeters = 0;
    walls.forEach(w => {
      const dx = w.points[2] - w.points[0];
      const dy = w.points[3] - w.points[1];
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      totalWallMeters += pixelLength / pixelsPerMeter;
    });

    // SECCIÓN 4: AMBIENTES (NUEVO)
    // Contar roomGroups únicos
    const roomGroups = symbols.filter(s => s.type === 'roomGroup' || s.groupId);
    const uniqueRoomGroups = new Set(roomGroups.map(s => s.groupId || s.id));
    const totalRooms = uniqueRoomGroups.size;

    // Calcular área total (estimación basada en muros)
    // Área aproximada = (longitud total de muros / 4)²
    const estimatedArea = totalWallMeters > 0 ? Math.pow(totalWallMeters / 4, 2) : 0;

    return {
      counts,
      totalPipeMeters,
      totalCableMeters,
      totalWallMeters,
      totalRooms,
      estimatedArea
    };
  }, [symbols, pipes, walls, pixelsPerMeter]);

  // --- GENERAR PRESUPUESTO ---
  const handleGenerateBudget = async () => {
    if (!user) {
      alert('Debes iniciar sesión para generar presupuestos');
      return;
    }

    try {
      setLoadingBudget(true);

      // Obtener items configurados del usuario
      const userBudgetItems = await BudgetService.getUserBudgetItems(user.id);

      if (userBudgetItems.length === 0) {
        alert('Primero debes configurar tus items de presupuesto. Ve a Configuración → Presupuestos.');
        return;
      }

      // Convertir datos del cómputo a ComputeItems
      const computeItems = convertMaterialReportToComputeItems(
        report.counts,
        report.totalPipeMeters,
        report.totalCableMeters,
        report.totalWallMeters,
        report.totalRooms,
        report.estimatedArea
      );

      // Generar items de presupuesto con mapeo inteligente
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

  // --- PRESUPUESTO FLASH ---
  const handleQuickBudget = () => {
    setBudgetItems([]);
    setBudgetMode('flash');
    setShowBudgetEditor(true);
  };

  // --- EXPORTAR PDF ---
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Cómputo de Materiales Estimado", 14, 22);
      doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = [
        ...Object.entries(report.counts).map(([name, count]) => [name, count, 'Unidades']),
        ['Cañería (Trazado Horizontal)', report.totalPipeMeters.toFixed(2), 'Metros'],
        ['Cable Unipolar 2.5mm (Estimado)', Math.ceil(report.totalCableMeters), 'Metros'],
      ];

      autoTable(doc, { startY: 40, head: [['Concepto', 'Cantidad', 'Unidad']], body: tableData, theme: 'grid' });
      doc.save('computo_materiales.pdf');
    } catch (error) { console.error(error); alert("Error al exportar PDF."); }
  };

  // --- EXPORTAR EXCEL (CSV) ---
  const handleDownloadExcel = () => {
    let csv = "Concepto,Cantidad,Unidad\n";

    // Items
    Object.entries(report.counts).forEach(([name, count]) => {
      csv += `"${name}",${count},Unidades\n`;
    });
    // Totales
    csv += `Cañería (Trazado Horizontal),${report.totalPipeMeters.toFixed(2)},Metros\n`;
    csv += `Cable Unipolar 2.5mm (Estimado),${Math.ceil(report.totalCableMeters)},Metros\n`;
    csv += `\n* Valores estimados según escala: 1m = ${Math.round(pixelsPerMeter)}px`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'computo_materiales.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2 text-slate-700">
            <ClipboardList className="w-6 h-6" />
            <h2 className="text-xl font-bold">Listado de Materiales</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid gap-4">
            {/* SECCIÓN: INSTALACIÓN ELÉCTRICA */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-blue-900 mb-3 border-b border-blue-300 pb-2 flex items-center gap-2">
                ⚡ Instalación Eléctrica
              </h3>

              {/* Cajas y Elementos */}
              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 text-sm mb-2">Cajas y Elementos</h4>
                <ul className="space-y-1.5 bg-white/70 p-3 rounded">
                  {Object.entries(report.counts).map(([name, count]) => (
                    <li key={name} className="flex justify-between text-sm">
                      <span className="text-slate-700">{name}</span>
                      <span className="font-bold text-blue-900">{count} u.</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cañerías y Cables */}
              <div>
                <h4 className="font-semibold text-blue-800 text-sm mb-2">Cañerías y Cables</h4>
                <div className="space-y-2 bg-white/70 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">Cañería (Horizontal)</span>
                    <span className="text-lg font-bold text-blue-900">{report.totalPipeMeters.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">Cable 2.5mm (Estimado)</span>
                    <span className="text-lg font-bold text-blue-900">{Math.ceil(report.totalCableMeters)} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN: CONSTRUCCIÓN */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border-2 border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-300 pb-2 flex items-center gap-2">
                🏗️ Construcción
              </h3>
              <div className="space-y-3 bg-white/70 p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Muros (Longitud Total)</span>
                  <span className="text-lg font-bold text-slate-900">{report.totalWallMeters.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Ambientes</span>
                  <span className="text-lg font-bold text-slate-900">{report.totalRooms} u.</span>
                </div>
                {report.estimatedArea > 0 && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-sm text-slate-700">Área Estimada</span>
                    <span className="text-lg font-bold text-slate-900">{report.estimatedArea.toFixed(2)} m²</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-between rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium">Cerrar</button>
          <div className="flex gap-3">
            {/* BOTÓN PRESUPUESTO FLASH */}
            <button
              onClick={handleQuickBudget}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 rounded-lg transition-all font-medium shadow-sm"
              title="Presupuesto rápido sin cómputo"
            >
              <span className="text-lg">⚡</span>
              <span>Flash</span>
            </button>
            {/* BOTÓN PRESUPUESTO DESDE CÓMPUTO */}
            <button
              onClick={handleGenerateBudget}
              disabled={loadingBudget}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              <span>{loadingBudget ? 'Generando...' : 'Desde Cómputo'}</span>
            </button>
            {/* BOTÓN EXCEL */}
            <button onClick={handleDownloadExcel} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button onClick={handleDownloadPDF} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm">
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Budget Editor Modal */}
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