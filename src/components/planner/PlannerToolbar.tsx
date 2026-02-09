import React, { useRef } from 'react';
import { Minus, Activity, Trash2, XCircle, Ruler, Image as ImageIcon, Lock, Unlock, MoreHorizontal, Palette, MousePointer2 } from 'lucide-react';

export type Tool = 'select' | 'wall' | 'pipe' | 'outlet' | 'light' | 'wall_light' | 'switch' | 'board' | 'fan' | 'ac' | 'tpu' | 'ground' | 'text' | 'table' | 'aux_line' | 'cp' | 'calibrate' |
  'feed_point' | 'meter' | 'main_breaker' | 'tm_1p' | 'tm_2p' | 'tm_4p' | 'diff_switch' | 'dist_block' | 'load_arrow' | 'door' | 'window' | 'passage' | 'dimension' | 'double_outlet' | 'bell_button' |
  'rect' | 'circle' | 'triangle' | 'line' | 'arrow';

// 🆕 Herramientas específicas por modo
export const FLOOR_PLAN_TOOLS: Tool[] = [
  'select', 'wall', 'pipe', 'aux_line', 'text', 'calibrate', 'dimension',
  // Símbolos de planta
  'light', 'wall_light', 'outlet', 'double_outlet',
  'switch', 'board', 'tpu', 'ground', 'ac', 'fan', 'cp', 'bell_button',
  // Aberturas
  'door', 'window', 'passage',
  // Geometrías
  'rect', 'circle', 'line', 'arrow'
];

export const SINGLE_LINE_TOOLS: Tool[] = [
  'select', 'pipe', 'aux_line', 'text', 'table',
  // Símbolos unifilares
  'feed_point', 'meter', 'main_breaker',
  'tm_1p', 'tm_2p', 'tm_4p', 'diff_switch',
  'dist_block', 'load_arrow', 'board', 'ground',
  // Geometrías (para tableros y anotaciones)
  'rect', 'circle', 'line', 'arrow'
];


interface PlannerToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentCircuitColor: string;
  setCurrentCircuitColor: (color: string) => void;
  currentPipeType: 'straight' | 'curved';
  setCurrentPipeType: (type: 'straight' | 'curved') => void;
  currentPipeDashMode: 'solid' | 'dashed'; // 🆕 Trazo (sólido vs segmentado)
  setCurrentPipeDashMode: (mode: 'solid' | 'dashed') => void; // 🆕
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onCalibrate: () => void;
  scaleText: string;
  onUploadImage: (file: File) => void;
  isBackgroundLocked: boolean;
  onToggleLock: () => void;
  hasBackgroundImage: boolean;
  onDeleteImage: () => void;
}

export default function PlannerToolbar({
  tool,
  setTool,
  currentCircuitColor,
  setCurrentCircuitColor,
  currentPipeType,
  setCurrentPipeType,
  currentPipeDashMode, // 🆕
  setCurrentPipeDashMode, // 🆕
  onDeleteSelected,
  onClearAll,
  onCalibrate,
  scaleText,
  onUploadImage,
  isBackgroundLocked,
  onToggleLock,
  hasBackgroundImage,
  onDeleteImage
}: PlannerToolbarProps) {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <div className="absolute left-4 top-16 bottom-6 w-14 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 z-20 flex flex-col items-center py-4 space-y-2 overflow-y-auto no-scrollbar">

      {/* SELECT TOOL (SISTEMA) */}
      <div className="flex flex-col items-center w-full px-2">
        <button
          onClick={() => setTool('select')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${tool === 'select'
            ? 'bg-blue-600 text-white shadow-lg scale-110'
            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          title="Herramienta de Selección"
        >
          <MousePointer2 className="w-5 h-5" />
        </button>
        <span className="text-[7px] font-black text-slate-400 mt-1 uppercase tracking-tighter text-center">Selecc.</span>
      </div>

      <div className="w-8 h-px bg-slate-100 my-1" />

      {/* COLOR SELECTOR (UNIVERSAL) */}
      <div className="flex flex-col items-center w-full px-2">
        <input
          type="color"
          ref={colorInputRef}
          value={currentCircuitColor}
          onChange={(e) => setCurrentCircuitColor(e.target.value)}
          className="hidden"
        />
        <button
          onClick={() => colorInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-slate-50 border-2 border-transparent hover:border-slate-100"
          title="Color de Dibujo"
        >
          <div
            className="w-6 h-6 rounded-full shadow-md border-2 border-white transition-transform group-hover:scale-110"
            style={{ backgroundColor: currentCircuitColor }}
          />
          <Palette className="w-3 h-3 absolute -bottom-1 -right-1 text-slate-400 bg-white rounded-full p-0.5 shadow-sm" />
        </button>
        <span className="text-[7px] font-black text-slate-400 mt-1 uppercase tracking-tighter text-center">Color</span>
      </div>

      <hr className="w-8 border-slate-200 my-1" />

      {/* CAÑERÍA - FORMA */}
      <div className="flex flex-col gap-2 w-full items-center px-1">
        <button onClick={() => setCurrentPipeType('straight')} className={`p-2 rounded-xl transition-all ${currentPipeType === 'straight' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`} title="Recta"><Minus className="w-5 h-5 -rotate-45" /></button>
        <button onClick={() => setCurrentPipeType('curved')} className={`p-2 rounded-xl transition-all ${currentPipeType === 'curved' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`} title="Curva"><Activity className="w-5 h-5" /></button>
      </div>

      <hr className="w-8 border-slate-200 my-1" />

      {/* CAÑERÍA - TRAZO */}
      <div className="flex flex-col gap-2 w-full items-center px-1">
        <button
          onClick={() => setCurrentPipeDashMode('solid')}
          className={`p-2 rounded-xl transition-all ${currentPipeDashMode === 'solid' ? 'bg-green-100 text-green-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
          title="Línea Sólida"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPipeDashMode('dashed')}
          className={`p-2 rounded-xl transition-all ${currentPipeDashMode === 'dashed' ? 'bg-orange-100 text-orange-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
          title="Línea Punteada"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <hr className="w-8 border-slate-200 my-1" />

      {/* FONDO (BLUEPRINT) */}
      <div className="flex flex-col gap-2 w-full items-center px-1">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
          title="Cargar Plano de Fondo"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleLock}
          className={`p-2 rounded-xl transition-all ${isBackgroundLocked ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-50'}`}
          title={isBackgroundLocked ? "Desbloquear Fondo" : "Bloquear Fondo"}
        >
          {isBackgroundLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
        </button>

        {/* BOTÓN ELIMINAR FONDO */}
        {hasBackgroundImage && (
          <button
            onClick={onDeleteImage}
            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
            title="Eliminar Fondo"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1"></div>

      {/* ACCIONES (Compactas) */}
      <div className="flex flex-col space-y-2 w-full items-center pb-0">
        <div className="flex flex-col items-center mb-1">
          <button onClick={onCalibrate} className="p-2 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl transition-colors" title="Calibrar Escala">
            <Ruler className="w-5 h-5" />
          </button>
          <span className="text-[8px] text-slate-400 font-mono text-center leading-none">{scaleText.split(' = ')[1]}</span>
        </div>

        <button onClick={onDeleteSelected} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors" title="Borrar (Supr)">
          <Trash2 className="w-5 h-5" />
        </button>

        <button onClick={onClearAll} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Limpiar Todo">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}