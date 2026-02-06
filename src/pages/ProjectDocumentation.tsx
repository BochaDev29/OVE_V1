import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectService } from '../services/project.service';
import { ArrowLeft, Save, FileText, ShoppingCart, Image as ImageIcon, Download, CheckSquare, AlertCircle, DollarSign, Map, Network } from 'lucide-react';
import DocMemory from '../components/documentation/DocMemory';
import DocMaterials from '../components/documentation/DocMaterials';
import DocPhotos from '../components/documentation/DocPhotos';
import DocChecklist from '../components/documentation/DocChecklist';
import { BudgetEditorModal } from '../components/budget/BudgetEditorModal';

export default function ProjectDocumentation() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'floor_plan' | 'single_line' | 'memory' | 'materials' | 'photos' | 'checklist' | 'budget'>('memory');
    const [docData, setDocData] = useState<any>({
        memory: '',
        materials: [],
        photos: [],
        checklist: []
    });
    const [saving, setSaving] = useState(false);
    const [showBudgetEditor, setShowBudgetEditor] = useState(false);

    useEffect(() => {
        if (projectId) {
            loadProject();
        }

        // Detectar parámetro tab en URL
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'budget') {
            setActiveTab('budget');
            // Abrir modal automáticamente después de un pequeño delay
            setTimeout(() => {
                setShowBudgetEditor(true);
            }, 500);
        }
    }, [projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const data = await ProjectService.getProjectById(projectId!);
            setProject(data);
            // Cargar info existente o inicializar
            if (data.documentation_data && Object.keys(data.documentation_data).length > 0) {
                setDocData(data.documentation_data);
            } else {
                setDocData({ memory: '', materials: { items: [], notes: '' }, photos: [], checklist: [] });
            }
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error al cargar el proyecto');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!project) return;
        try {
            setSaving(true);
            // Guardamos SOLO la documentación usando el nuevo método específico
            await ProjectService.saveDocumentation(project.id, docData);
            alert('Documentación guardada correctamente');
        } catch (error) {
            console.error('Error saving documentation:', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // Función para actualizar partes del estado desde los hijos
    const updateDocData = (section: string, data: any) => {
        setDocData((prev: any) => ({
            ...prev,
            [section]: data
        }));
    };

    // Abrir BudgetEditorModal cuando se selecciona la pestaña budget
    useEffect(() => {
        if (activeTab === 'budget') {
            setShowBudgetEditor(true);
        }
    }, [activeTab]);

    if (loading) return <div className="p-10 text-center">Cargando documentación...</div>;
    if (!project) return <div className="p-10 text-center">Proyecto no encontrado</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Carpeta Técnica</h1>
                        <p className="text-sm text-slate-500">{project.client_name} - {project.project_type}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Futuro: Boton Exportar PDF Global */}
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar Todo</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                </div>
            </div>

            {/* DISCLAIMER LEGAL - Herramienta Profesional */}
            <div className="bg-amber-50 border-l-4 border-amber-500 px-6 py-3">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <p className="font-semibold">Documentación Técnica - Uso Profesional</p>
                        <p className="mt-1">
                            Esta documentación fue generada automáticamente por OVE como herramienta de apoyo.
                            El instalador electricista debe <strong>revisar, validar y firmar</strong> todos los
                            documentos antes de presentarlos ante el cliente o ente regulador.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-slate-200 px-6">
                <div className="flex gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('floor_plan')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'floor_plan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Map size={18} />
                        Plano de Planta
                    </button>
                    <button
                        onClick={() => setActiveTab('single_line')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'single_line' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Network size={18} />
                        Esquema Unifilar
                    </button>
                    <button
                        onClick={() => setActiveTab('memory')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'memory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={18} />
                        Memoria Descriptiva
                    </button>
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ShoppingCart size={18} />
                        Listado Materiales
                    </button>
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${activeTab === 'budget' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <DollarSign size={18} />
                        Presupuesto
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${activeTab === 'photos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ImageIcon size={18} />
                        Registro Fotográfico
                    </button>

                    {/* Checklist - Solo para Córdoba + Existente (ERSEP) */}
                    {(project.wizardData?.config?.ownerDetail?.province === 'Córdoba') &&
                        (project.wizardData?.config?.estadoObra === 'existente' || project.wizardData?.config?.projectType === 'existente') && (
                            <button
                                onClick={() => setActiveTab('checklist')}
                                className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${activeTab === 'checklist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CheckSquare size={18} />
                                Checklist Res.54/2018
                                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                                    ERSEP
                                </span>
                            </button>
                        )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
                {activeTab === 'floor_plan' && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                        <div className="text-center mb-6">
                            <Map className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Plano de Planta</h3>
                            <p className="text-slate-600 mb-6">
                                El plano de planta se genera en el Taller CAD. Aquí podrás visualizarlo y descargarlo.
                            </p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => navigate(`/taller/${project.id}`)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg"
                            >
                                Ir al Taller CAD
                            </button>
                            <button
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                                disabled
                            >
                                Descargar PDF (Próximamente)
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'single_line' && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                        <div className="text-center mb-6">
                            <Network className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Esquema Unifilar</h3>
                            <p className="text-slate-600 mb-6">
                                El esquema unifilar se genera en el Taller CAD. Aquí podrás visualizarlo y descargarlo.
                            </p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => navigate(`/taller/${project.id}`)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg"
                            >
                                Ir al Taller CAD
                            </button>
                            <button
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                                disabled
                            >
                                Descargar PDF (Próximamente)
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'memory' && (
                    <DocMemory
                        project={project}
                        value={docData.memory}
                        onChange={(val) => updateDocData('memory', val)}
                    />
                )}
                {activeTab === 'materials' && (
                    <DocMaterials
                        project={project}
                        value={docData.materials}
                        onChange={(val) => updateDocData('materials', val)}
                    />
                )}
                {activeTab === 'budget' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-sm border border-orange-200 p-8">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
                                    <DollarSign className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                    ⚡ Presupuesto Flash
                                </h3>
                                <p className="text-slate-700 mb-6 max-w-md mx-auto">
                                    Crea un presupuesto rápido para este proyecto. Ideal para trabajos simples, arreglos, o certificaciones.
                                </p>
                                <button
                                    onClick={() => setShowBudgetEditor(true)}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                                >
                                    <DollarSign className="w-5 h-5" />
                                    Crear Presupuesto Flash
                                </button>
                                <div className="mt-6 pt-6 border-t border-orange-200">
                                    <p className="text-sm text-slate-600">
                                        <strong>Ventajas:</strong> Sin necesidad de cómputo • Editable • Exportable a PDF
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'photos' && (
                    <DocPhotos
                        project={project}
                        value={docData.photos}
                        onChange={(val) => updateDocData('photos', val)}
                    />
                )}
                {activeTab === 'checklist' && (
                    <DocChecklist
                        project={project}
                        value={docData.checklist}
                        onChange={(val) => updateDocData('checklist', val)}
                    />
                )}
            </div>

            {/* BudgetEditorModal */}
            {showBudgetEditor && (
                <BudgetEditorModal
                    isOpen={true}
                    onClose={() => {
                        setShowBudgetEditor(false);
                    }}
                    mode="flash"
                    projectId={project.id}
                    initialItems={[]}
                    projectName={project.name}
                    clientName={project.wizardData?.config?.clientName}
                    street={project.wizardData?.config?.ownerDetail?.street}
                    number={project.wizardData?.config?.ownerDetail?.number}
                    city={project.wizardData?.config?.ownerDetail?.city}
                    province={project.wizardData?.config?.ownerDetail?.province}
                />
            )}
        </div>
    );
}
