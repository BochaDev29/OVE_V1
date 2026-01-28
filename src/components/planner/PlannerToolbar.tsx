import React, { useRef } from 'react';
import { Download, Minus, Activity, Trash2, XCircle, Ruler, Image as ImageIcon, Lock, Unlock } from 'lucide-react';

export type Tool = 'select' | 'wall' | 'pipe' | 'outlet' | 'light' | 'wall_light' | 'switch' | 'board' | 'fan' | 'ac' | 'tpu' | 'ground' | 'text' | 'table' | 'aux_line' | 'cp' | 'calibrate' |
  'feed_point' | 'meter' | 'main_breaker' | 'tm_1p' | 'tm_2p' | 'tm_4p' | 'diff_switch' | 'dist_block' | 'load_arrow' | 'door' | 'window' | 'dimension';

interface PlannerToolbarProps {
  currentCircuitColor: string;
  setCurrentCircuitColor: (color: string) => void;
  currentPipeType: 'straight' | 'curved';
  setCurrentPipeType: (type: 'straight' | 'curved') => void;
  onDownloadPDF: () => void;
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
  currentCircuitColor,
  setCurrentCircuitColor,
  currentPipeType,
  setCurrentPipeType,
  onDownloadPDF,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  const colors = [
    { value: '#dc2626', label: 'Rojo (IUG)' },
    { value: '#2563eb', label: 'Azul (TUG)' },
    { value: '#7c3aed', label: 'Violeta (TUE)' },
    { value: '#16a34a', label: 'Verde (MBT)' },
    { value: '#ea580c', label: 'Naranja (Datos)' },
    { value: '#78350f', label: 'Marrón (Retornos)' },
  ];

  return (
    <div className="absolute left-4 top-24 bottom-6 w-14 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 z-20 flex flex-col items-center py-4 space-y-2">

      {/* COLORES */}
      <div className="flex flex-col space-y-2 w-full items-center">
        <div className="grid grid-cols-1 gap-2">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => setCurrentCircuitColor(c.value)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${currentCircuitColor === c.value ? 'border-slate-800 scale-125 shadow-md' : 'border-transparent hover:scale-110'
                }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <hr className="w-8 border-slate-200 my-1" />

      {/* CAÑERÍA */}
      <div className="flex flex-col gap-2 w-full items-center px-1">
        <button onClick={() => setCurrentPipeType('straight')} className={`p-2 rounded-xl transition-all ${currentPipeType === 'straight' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`} title="Recta"><Minus className="w-5 h-5 -rotate-45" /></button>
        <button onClick={() => setCurrentPipeType('curved')} className={`p-2 rounded-xl transition-all ${currentPipeType === 'curved' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`} title="Curva"><Activity className="w-5 h-5" /></button>
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

        {/* BOTÓN PDF SUBIDO (Sin wrapper pt-2) */}
        <button onClick={onDownloadPDF} className="p-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 mt-1" title="Exportar PDF">
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}