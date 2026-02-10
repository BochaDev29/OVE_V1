
import React, { useState } from 'react';
import { Copy, Check, Code, FileText } from 'lucide-react';
import { generateFullSVG, generatePathDataList } from '../utils/svgHelper';
import { Shape } from '../types';

interface ExportViewProps {
  shapes: Shape[];
  canvasSize: { width: number; height: number };
}

const ExportView: React.FC<ExportViewProps> = ({ shapes, canvasSize }) => {
  const [tab, setTab] = useState<'svg' | 'path'>('svg');
  const [copied, setCopied] = useState(false);

  const svgContent = generateFullSVG(shapes, canvasSize);
  const pathContent = generatePathDataList(shapes);
  const currentContent = tab === 'svg' ? svgContent : pathContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([currentContent], { type: tab === 'svg' ? 'image/svg+xml' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tab === 'svg' ? 'symbol.svg' : 'paths.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 flex flex-col h-full bg-slate-50 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setTab('svg')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === 'svg' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code size={14} /> SVG Full
          </button>
          <button
            onClick={() => setTab('path')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === 'path' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} /> Path Data
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-slate-200 text-slate-600 rounded-md transition-colors relative"
            title="Copiar al portapapeles"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
          <button
            onClick={downloadFile}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
          >
            Descargar
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
        <pre className="p-4 text-[11px] font-mono text-blue-300 overflow-auto h-full max-h-[300px] whitespace-pre-wrap selection:bg-blue-500 selection:text-white">
          <code>{currentContent || 'No hay contenido para mostrar'}</code>
        </pre>
      </div>
    </div>
  );
};

export default ExportView;
