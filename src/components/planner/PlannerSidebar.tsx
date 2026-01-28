import React from 'react';
import {
  MousePointer2, Square, Zap, Lightbulb, ToggleLeft,
  Box, Fan, Snowflake, FileText, Table,
  Minus, ClipboardList, PenTool, LayoutTemplate, ArrowDownToLine,
  StopCircle, LampWallUp, Bell
} from 'lucide-react';
import { Tool } from './PlannerToolbar';

interface PlannerSidebarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  activeMode: 'floorPlan' | 'singleLine'; // [NUEVO]
  onOpenReport: () => void;
  onOpenProjectInfo: () => void;
}

export default function PlannerSidebar({ tool, setTool, activeMode, onOpenReport, onOpenProjectInfo }: PlannerSidebarProps) {

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Mover' },
    { id: 'wall', icon: Square, label: 'Pared' },
    { id: 'pipe', icon: PenTool, label: 'Caño' },
    { id: 'aux_line', icon: Minus, label: 'Auxiliar' },
    { id: 'text', icon: FileText, label: 'Texto' },
    { id: 'table', icon: Table, label: 'Tabla' },
  ];

  const symbols: { id: Tool; icon: any; label: string }[] = [
    { id: 'light', icon: Lightbulb, label: 'Boca' },
    { id: 'wall_light', icon: LampWallUp, label: 'Aplique' },
    { id: 'outlet', icon: Zap, label: 'Toma' },
    { id: 'double_outlet', icon: Zap, label: 'T. Doble' },
    { id: 'switch', icon: ToggleLeft, label: 'Llave' },
    { id: 'bell_button', icon: Bell, label: 'Timbre' },
    { id: 'cp', icon: StopCircle, label: 'CP/D' },
    { id: 'ac', icon: Snowflake, label: 'Aire' },
    { id: 'fan', icon: Fan, label: 'Vent.' },
    { id: 'board', icon: Box, label: 'T.Gral' },
    { id: 'tpu', icon: LayoutTemplate, label: 'TPU' },
    { id: 'ground', icon: ArrowDownToLine, label: 'PAT' },
  ];

  const unifilarTools: { id: Tool; icon: any; label: string }[] = [
    { id: 'feed_point', icon: ArrowDownToLine, label: 'Red' },
    { id: 'meter', icon: Box, label: 'Medidor' },
    { id: 'main_breaker', icon: ToggleLeft, label: 'Disy.Gral' },
    { id: 'tm_2p', icon: Square, label: 'TM 2P' },
    { id: 'diff_switch', icon: StopCircle, label: 'Dif/ID' },
    { id: 'tm_1p', icon: Square, label: 'TM 1P' },
    { id: 'tm_4p', icon: LayoutTemplate, label: 'TM 4P' },
    { id: 'dist_block', icon: Table, label: 'Bornes' },
    { id: 'load_arrow', icon: ArrowDownToLine, label: 'Salida' },
    { id: 'ground', icon: ArrowDownToLine, label: 'PAT' },
  ];

  return (
    <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar px-2">
      {/* GRUPO 1: HERRAMIENTAS (Comunes o especificas) */}
      <div className="flex space-x-1 border-r border-slate-200 pr-2">
        <button onClick={() => setTool('select')} className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'text-slate-600 hover:bg-slate-50'}`} title="Mover">
          <MousePointer2 className="w-5 h-5 mb-1" /><span className="text-[10px] font-medium">Mover</span>
        </button>

        {activeMode === 'floorPlan' && (
          <>
            <button onClick={() => setTool('wall')} className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === 'wall' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'text-slate-600 hover:bg-slate-50'}`} title="Pared">
              <Square className="w-5 h-5 mb-1" /><span className="text-[10px] font-medium">Pared</span>
            </button>
            <button onClick={() => setTool('aux_line')} className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === 'aux_line' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'text-slate-600 hover:bg-slate-50'}`} title="Auxiliar">
              <Minus className="w-5 h-5 mb-1" /><span className="text-[10px] font-medium">Aux.</span>
            </button>
          </>
        )}

        {/* Caño y Texto siempre visibles */}
        <button onClick={() => setTool('pipe')} className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === 'pipe' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'text-slate-600 hover:bg-slate-50'}`} title="Conexión">
          <PenTool className="w-5 h-5 mb-1" /><span className="text-[10px] font-medium">Conex.</span>
        </button>
        <button onClick={() => setTool('text')} className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === 'text' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'text-slate-600 hover:bg-slate-50'}`} title="Texto">
          <FileText className="w-5 h-5 mb-1" /><span className="text-[10px] font-medium">Texto</span>
        </button>
      </div>

      {/* GRUPO 2: SÍMBOLOS (SEGÚN MODO) */}
      <div className="flex space-x-1 border-r border-slate-200 pr-2">
        {activeMode === 'floorPlan' ? (
          symbols.map((item) => (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === item.id
                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:scale-105'
                }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          ))
        ) : (
          unifilarTools.map((item) => (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] transition-all ${tool === item.id
                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500 ring-offset-1 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:scale-105'
                }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          ))
        )}
      </div>

      {/* GRUPO 3: ACCIONES */}
      <div className="flex space-x-1 pl-1">
        <button onClick={onOpenProjectInfo} className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all">
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Rótulo</span>
        </button>

        <button onClick={onOpenReport} className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[3.5rem] text-slate-600 hover:bg-green-50 hover:text-green-700 transition-all">
          <ClipboardList className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Cómputo</span>
        </button>
      </div>
    </div>
  );
}