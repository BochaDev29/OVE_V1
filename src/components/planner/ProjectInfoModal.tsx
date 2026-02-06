import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ProjectData {
  projectName: string;
  address: string;
  installer: string;
  licenseNumber: string; // 🆕 Matrícula/Habilitación
  planNumber: string;    // 🆕 Nº de Plano
  category: string;
  date: string;
}

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectData) => void;
  initialData: ProjectData;
}

export default function ProjectInfoModal({ isOpen, onClose, onSave, initialData }: ProjectInfoModalProps) {
  const [formData, setFormData] = useState<ProjectData>(initialData);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        projectName: initialData.projectName || '',
        address: initialData.address || '',
        installer: initialData.installer || '',
        licenseNumber: initialData.licenseNumber || '',
        planNumber: initialData.planNumber || '',
        category: initialData.category || 'Categoría III',
        date: initialData.date || new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof ProjectData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Datos del Rótulo</h2>
          <button
            onClick={onClose}
            onKeyDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del Proyecto/Cliente
            </label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => handleChange('projectName', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Casa Familia González"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Domicilio
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Av. Corrientes 1234, CABA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instalador/Profesional
            </label>
            <input
              type="text"
              value={formData.installer}
              onChange={(e) => handleChange('installer', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Matrícula/Habilitación
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Mat. 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nº de Plano
              </label>
              <input
                type="text"
                value={formData.planNumber}
                onChange={(e) => handleChange('planNumber', e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: IE-01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Categoría I">Categoría I</option>
              <option value="Categoría II">Categoría II</option>
              <option value="Categoría III">Categoría III</option>
              <option value="Categoría IV">Categoría IV</option>
              <option value="Categoría V">Categoría V</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
