import React, { useEffect, useState } from 'react';
import {
  Plus,
  LayoutDashboard,
  LogOut,
  FileText,
  Clock,
  CheckCircle2,
  Building2,
  Home,
  Trash2,
  Loader2,
  Calendar,
  Users,
  Calculator,
  Settings,
  Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import { supabase } from '../lib/supabase'; // REMOVIDO
import { ProjectService } from '../services/project.service';
import NewProjectModal from './NewProjectModal';

// Interfaz para la vista de Dashboard (mapeada en el servicio)
interface DashboardProject {
  id: string;
  name: string;
  client_name: string;
  project_type: string;
  property_type: string;
  status: 'borrador' | 'en_ejecucion' | 'finalizado';
  surface_area: number;
  created_at: string;
}

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
  onNewProject: () => void;
  onEditProject: (projectId: string) => void;
  isDemoMode: boolean;
}

export default function Dashboard({
  userEmail,
  onLogout,
  onNewProject,
  onEditProject,
  isDemoMode,
}: DashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  useEffect(() => {
    fetchProjects();

    const shouldOpenWizard = sessionStorage.getItem('openWizardOnDashboard');
    const editData = sessionStorage.getItem('editProjectData');

    if (shouldOpenWizard === 'true') {
      sessionStorage.removeItem('openWizardOnDashboard');
      if (editData) {
        // ... Logica de redirección
        onNewProject();
      } else {
        setTimeout(() => {
          onNewProject();
        }, 300);
      }
    }
  }, [user]);

  const handleProjectTypeSelection = (type: 'flash' | 'complete' | 'regulated') => {
    console.log('🎯 Tipo de proyecto seleccionado:', type);

    // Guardar el tipo de proyecto en sessionStorage para que el Wizard lo use
    sessionStorage.setItem('projectType', type);

    if (type === 'flash') {
      // Presupuesto Flash: Ir directamente al Wizard Paso 1
      // TODO: Implementar flujo específico de Flash
      console.log('⚡ Iniciando Presupuesto Flash');
      onNewProject(); // Por ahora usa el flujo normal
    } else if (type === 'complete') {
      // Proyecto Completo: Wizard completo normal
      console.log('🏗️ Iniciando Proyecto Completo');
      onNewProject();
    } else if (type === 'regulated') {
      // Trabajo Reglamentado: Wizard completo (modo relevamiento)
      console.log('📋 Iniciando Trabajo Reglamentado');
      sessionStorage.setItem('installationType', 'Existente'); // Marcar como existente por defecto
      onNewProject();
    }
  };


  async function fetchProjects() {
    try {
      setLoading(true);
      // Usamos el servicio mapeado
      const data = await ProjectService.listProjects();
      setProjects(data as any);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(projectId: string, projectName: string, event: React.MouseEvent) {
    event.stopPropagation();

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?\n\nEsta acción NO se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      await ProjectService.deleteProject(projectId);
      alert('✅ Proyecto eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      alert('❌ Error al eliminar el proyecto');
      fetchProjects(); // Revertir
    }
  }

  const getStatusBadge = (status: string) => {
    // Simple badge mapping
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600`}>
        <Clock className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === id
        ? 'bg-blue-50 text-blue-600'
        : 'text-slate-600 hover:bg-slate-50'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop static, Mobile absolute drawer */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out z-50
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 text-blue-600">
              <LayoutDashboard className="w-8 h-8" />
              <span className="text-xl font-bold">OVE SaaS</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 md:hidden hover:bg-slate-50 rounded-lg"
            >
              <Menu className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <nav className="space-y-1">
            <SidebarItem id="projects" icon={LayoutDashboard} label="Mis Proyectos" />
            {/* Pestañas no funcionales ocultadas para esta versión */}
            {/* <SidebarItem id="certificates" icon={FileText} label="Certificados" /> */}
            {/* <SidebarItem id="clients" icon={Users} label="Clientes" /> */}
            {/* <SidebarItem id="calendar" icon={Calendar} label="Agenda" /> */}
            {/* <SidebarItem id="budgets" icon={Calculator} label="Presupuestos" /> */}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-200">
          <div className="flex items-center space-x-3 mb-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.user_metadata?.full_name || 'Electricista'}
              </p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 mb-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* Mobile Header with Hamburger */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-bold">OVE SaaS</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100"
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Panel de Control
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Bienvenido a tu Oficina Virtual.
              </p>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Proyecto</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Proyectos Recientes
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="mt-2 text-slate-500">Cargando tus carpetas...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">
                  No hay proyectos aún
                </h3>
                <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
                  Crea tu primera Carpeta Técnica según AEA 90364.
                </p>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                >
                  Crear mi primer proyecto
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Inmueble
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Superficie
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                              {(project.client_name || 'NN').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">
                              {project.client_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {project.project_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                          {project.property_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {project.surface_area} m²
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(project.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Calculadora */}
                            <button
                              onClick={() => onEditProject(project.id)}
                              className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Abrir en Calculadora"
                            >
                              <Calculator className="w-5 h-5" />
                            </button>
                            {/* Taller/Plano */}
                            <button
                              onClick={() => navigate(`/taller/${project.id}`)}
                              className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ir al Plano"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            {/* Documentación */}
                            <button
                              onClick={() => navigate(`/project/${project.id}/documentation`)}
                              className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Carpeta Técnica (Memoria, Materiales, Fotos)"
                            >
                              <FileText className="w-5 h-5" />
                            </button>
                            {/* Eliminar */}
                            <button
                              onClick={(e) => handleDeleteProject(project.id, project.client_name, e)}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar proyecto"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de selección de tipo de proyecto */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSelectType={handleProjectTypeSelection}
      />
    </div >
  );
}