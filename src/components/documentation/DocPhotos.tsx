import React, { useRef, useState } from 'react';
import { Upload, X, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { addPDFCoverPage } from '../../lib/pdf-utils';

interface DocPhotosProps {
    project: any; // To get header info for PDF
    value: PhotoItem[];
    onChange: (val: PhotoItem[]) => void;
}

interface PhotoItem {
    id: string;
    base64: string;
    caption: string;
    category: 'tablero' | 'pat' | 'conductores' | 'general';
}

export default function DocPhotos({ project, value, onChange }: DocPhotosProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [processing, setProcessing] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // --- COMPRESSION LOGIC ---
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setProcessing(true);
        const newPhotos: PhotoItem[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const compressedBase64 = await compressImage(files[i]);
                newPhotos.push({
                    id: Math.random().toString(36).substr(2, 9),
                    base64: compressedBase64,
                    caption: '',
                    category: 'general'
                });
            }
            onChange([...(value || []), ...newPhotos]);
        } catch (err) {
            console.error("Error compressing images:", err);
            alert("Error al procesar las imágenes.");
        } finally {
            setProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = (id: string) => {
        onChange((value || []).filter(p => p.id !== id));
    };

    const handleCaptionChange = (id: string, text: string) => {
        const newData = (value || []).map(p => p.id === id ? { ...p, caption: text } : p);
        onChange(newData);
    };

    const handleCategoryChange = (id: string, category: PhotoItem['category']) => {
        const newData = (value || []).map(p => p.id === id ? { ...p, category } : p);
        onChange(newData);
    };

    const getCategoryColor = (category: PhotoItem['category']) => {
        const colors = {
            tablero: 'bg-blue-100 text-blue-700 border-blue-200',
            pat: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            conductores: 'bg-purple-100 text-purple-700 border-purple-200',
            general: 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return colors[category];
    };

    // --- PDF GENERATION ---
    const handleDownloadPDF = () => {
        if (!value || value.length === 0) return;
        setGeneratingPdf(true);

        try {
            const doc = new jsPDF();
            const clientName = project?.wizardData?.config?.clientName || 'Proyecto';

            // --- COVER PAGE ---
            addPDFCoverPage(doc, "REGISTRO FOTOGRÁFICO", project, null);

            // --- AGRUPAR FOTOS POR CATEGORÍA ---
            const photosByCategory = {
                tablero: value.filter(p => p.category === 'tablero'),
                pat: value.filter(p => p.category === 'pat'),
                conductores: value.filter(p => p.category === 'conductores'),
                general: value.filter(p => p.category === 'general')
            };

            const categories = [
                { key: 'tablero' as const, title: '📋 TABLERO ELÉCTRICO' },
                { key: 'pat' as const, title: '⚡ PUESTA A TIERRA (PAT)' },
                { key: 'conductores' as const, title: '🔌 CONDUCTORES Y CABLEADO' },
                { key: 'general' as const, title: '📷 GENERAL' }
            ];

            let yCursor = 20;
            const photoHeight = 100;
            const photoWidth = 150;
            const marginX = (210 - photoWidth) / 2;

            categories.forEach(category => {
                const photos = photosByCategory[category.key];
                if (photos.length === 0) return; // Skip empty categories

                // Título de categoría
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.text(category.title, 20, yCursor);
                yCursor += 10;

                // Fotos de la categoría
                photos.forEach((photo, index) => {
                    // Nueva página si es necesario
                    if (yCursor + photoHeight + 20 > 270) {
                        doc.addPage();
                        yCursor = 20;
                    }

                    doc.addImage(photo.base64, 'JPEG', marginX, yCursor, photoWidth, photoHeight, undefined, 'FAST');

                    // Caption
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(100);
                    const captionY = yCursor + photoHeight + 5;

                    if (photo.caption) {
                        const splitText = doc.splitTextToSize(photo.caption, photoWidth);
                        doc.text(splitText, marginX, captionY);
                    } else {
                        doc.text(`Foto #${index + 1}`, marginX, captionY);
                    }

                    yCursor += photoHeight + 15;
                });

                yCursor += 10; // Espacio entre categorías
            });

            // Footer info
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, 190, 290, { align: "right" });
            }

            doc.save(`Fotos_${clientName}.pdf`);

        } catch (err) {
            console.error("Error creating PDF:", err);
            alert("Error al generar el PDF de fotos.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <ImageIcon className="text-blue-600" size={24} />
                    <h2 className="text-lg font-bold text-slate-700">Registro de Obra</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium border border-blue-200 disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {processing ? 'Procesando...' : 'Subir Fotos'}
                    </button>
                    {(value && value.length > 0) && (
                        <button
                            onClick={handleDownloadPDF}
                            disabled={generatingPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium shadow-sm disabled:opacity-50"
                        >
                            {generatingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                            Descargar Reporte
                        </button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                />
            </div>

            {/* Empty State */}
            {(!value || value.length === 0) && !processing && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-500"
                >
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Haz click aquí para subir fotos</p>
                    <p className="text-sm">Se comprimirán automáticamente para optimizar el reporte.</p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(value || []).map((photo: PhotoItem, index: number) => (
                    <div key={photo.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col group relative">
                        <div className="relative aspect-video bg-slate-100 cursor-pointer">
                            <img src={photo.base64} alt="Obra" className="w-full h-full object-contain bg-black" />
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium backdrop-blur-sm">
                                Foto #{index + 1}
                            </div>
                        </div>

                        <div className="p-3 bg-white border-t border-slate-100 space-y-2">
                            <input
                                type="text"
                                placeholder="Describa qué se ve en esta foto..."
                                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                                value={photo.caption}
                                onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                            />

                            {/* Selector de Categoría */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">Categoría:</span>
                                <select
                                    value={photo.category}
                                    onChange={(e) => handleCategoryChange(photo.id, e.target.value as PhotoItem['category'])}
                                    className={`text-xs px-2 py-1 rounded border font-medium ${getCategoryColor(photo.category)}`}
                                >
                                    <option value="general">📷 General</option>
                                    <option value="tablero">📋 Tablero</option>
                                    <option value="pat">⚡ PAT</option>
                                    <option value="conductores">🔌 Conductores</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDelete(photo.id)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 transform hover:scale-105"
                            title="Eliminar foto"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer usage info */}
            {(value && value.length > 0) && (
                <div className="text-center text-xs text-slate-400 mt-4">
                    {value.length} fotos cargadas en el reporte.
                </div>
            )}
        </div>
    );
}
