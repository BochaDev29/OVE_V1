import {
  Zap, Compass, Cpu, ArrowLeft, Save, Calculator, LayoutGrid, FileText, Download, LayoutTemplate
} from 'lucide-react';
import { Tool } from './PlannerToolbar';

interface PlannerSidebarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  activeMode: 'floorPlan' | 'singleLine';
  setActiveMode: (mode: 'floorPlan' | 'singleLine') => void;
  activeCategory: 'architecture' | 'electricity' | 'geometry';
  setActiveCategory: (cat: 'architecture' | 'electricity' | 'geometry') => void;
  onOpenReport: () => void;
  onOpenProjectInfo: () => void;
  onDownloadPDF: () => void;
  onSave: () => void;
  onBack: () => void;
  onOpenWizard: () => void;
  estadoObra?: string;
}

export default function PlannerSidebar({
  activeMode,
  setActiveMode,
  activeCategory,
  setActiveCategory,
  onOpenProjectInfo,
  onDownloadPDF,
  onSave,
  onBack,
  onOpenWizard,
  estadoObra = 'nueva'
}: PlannerSidebarProps) {

  return (
    <header className="flex items-center justify-between w-full bg-white/90 backdrop-blur-xl border-b border-slate-200 py-1 px-3 md:px-6 shadow-sm z-30 min-h-[56px] transition-all">

      {/* ZONA SISTEMA (BACK + TITULO) */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onBack}
          className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all active:scale-95"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-black text-slate-900 tracking-tighter leading-none uppercase opacity-30">OVE</span>
          <span className="text-xs font-black text-slate-800 tracking-tight leading-none uppercase">TALLER CAD</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 ml-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${estadoObra.toLowerCase().includes('nueva')
            ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>
            {estadoObra.toUpperCase()}
          </span>
        </div>
      </div>

      {/* SELECTOR DE MODO (PLANTA / UNIFILAR) */}
      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner">
        <button
          onClick={() => setActiveMode('floorPlan')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${activeMode === 'floorPlan'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline tracking-tight">PLANTA</span>
        </button>
        <button
          onClick={() => setActiveMode('singleLine')}
          className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${activeMode === 'singleLine'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden sm:inline tracking-tight">UNIFILAR</span>
        </button>
      </div>

      {/* SELECTOR DE ESPECIALIDAD (ARQUI / ELEC / GEOM) */}
      <div className="flex bg-slate-900 p-1 rounded-xl shadow-lg ring-1 ring-white/10 mx-2">
        {/* 🏗️ Arquitectura - Solo en modo PLANTA */}
        {activeMode === 'floorPlan' && (
          <button
            onClick={() => setActiveCategory('architecture')}
            className={`relative p-1.5 md:px-4 md:py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeCategory === 'architecture'
              ? 'bg-white/15 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'text-white/40 hover:text-white/60'
              }`}
            title="Modo Arquitectura"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline text-[10px] font-bold tracking-widest uppercase">Arqui</span>
            {activeCategory === 'architecture' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveCategory('electricity')}
          className={`relative p-1.5 md:px-4 md:py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeCategory === 'electricity'
            ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'text-white/40 hover:text-white/60'
            }`}
          title="Modo Ingeniería Eléctrica"
        >
          <Zap className="w-4 h-4" />
          <span className="hidden md:inline text-[10px] font-bold tracking-widest uppercase">Elec</span>
          {activeCategory === 'electricity' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_5px_#fff]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveCategory('geometry')}
          className={`relative p-1.5 md:px-4 md:py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeCategory === 'geometry'
            ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'
            : 'text-white/40 hover:text-white/60'
            }`}
          title="Herramientas de Geometría"
        >
          <LayoutTemplate className="w-4 h-4" />
          <span className="hidden md:inline text-[10px] font-bold tracking-widest uppercase">Geom</span>
          {activeCategory === 'geometry' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_5px_#fff]"></div>
          )}
        </button>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="flex items-center gap-1 md:gap-3">
        <button
          onClick={onOpenWizard}
          className="flex flex-col items-center gap-0.5 p-1.5 md:px-3 md:py-1 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-blue-600 active:scale-95 group"
          title="Abrir Wizard de Configuración"
        >
          <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline text-[9px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">Wizard</span>
        </button>

        <button
          onClick={onOpenProjectInfo}
          className="flex flex-col items-center gap-0.5 p-1.5 md:px-3 md:py-1 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-blue-600 active:scale-95 group"
          title="Editar Rótulo del Proyecto"
        >
          <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline text-[9px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">Rótulo</span>
        </button>

        <button
          onClick={onDownloadPDF}
          className="flex flex-col items-center gap-0.5 p-1.5 md:px-3 md:py-1 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-blue-600 active:scale-95 group"
          title="Descargar Plano PDF"
        >
          <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline text-[9px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">Descargar</span>
        </button>

        <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden md:block"></div>

        <button
          onClick={onSave}
          className="group relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black text-xs md:text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] transition-all active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <Save className="w-4 h-4 md:w-5 md:h-5 z-10 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline tracking-tighter uppercase z-10">Guardar</span>
        </button>
      </div>
    </header>
  );
}