import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
// import { supabase } from './lib/supabase'; // YA NO LO USAMOS DIRECTO
import { ProjectService } from './services/project.service';
import { initializeElectricalRules } from './lib/electrical-rules';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import ProjectWizard from './components/wizard/ProjectWizard';
import PlannerCanvas from './components/planner/PlannerCanvas';
import Profile from './pages/Profile';
import ProjectDocumentation from './pages/ProjectDocumentation';
import { BudgetEditorModal } from './components/budget/BudgetEditorModal';
import SymbolEditor from './components/admin/SymbolEditor'; // 🆕 Editor de Símbolos (Admin-Only)

function App() {
  const { user, isLoading, logout } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null); // Para modo edición
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0); // Para forzar refresh del Dashboard

  // Estados para BudgetEditorModal
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetProjectId, setBudgetProjectId] = useState<string | null>(null);
  const [budgetMode, setBudgetMode] = useState<'from_compute' | 'flash'>('flash');
  const [budgetProjectData, setBudgetProjectData] = useState<any>(null);

  // Inicializar datos CSV al montar la aplicación
  useEffect(() => {
    initializeElectricalRules().catch(error => {
      console.error('Error inicializando reglas eléctricas:', error);
    });
  }, []);

  // Detectar si debe abrir BudgetEditor (modo Flash)
  useEffect(() => {
    if (showProjectWizard) return; // No hacer nada si el wizard está abierto

    const shouldOpenBudgetEditor = sessionStorage.getItem('openBudgetEditor');
    const projectId = sessionStorage.getItem('budgetProjectId');
    const mode = sessionStorage.getItem('budgetMode') as 'from_compute' | 'flash';

    if (shouldOpenBudgetEditor === 'true' && projectId) {
      console.log('⚡ Abriendo BudgetEditor en modo Flash para proyecto:', projectId);

      // Cargar datos del proyecto
      loadProjectForBudget(projectId);

      // Configurar estados
      setBudgetProjectId(projectId);
      setBudgetMode(mode || 'flash');
      setShowBudgetEditor(true);

      // Limpiar flags
      sessionStorage.removeItem('openBudgetEditor');
      sessionStorage.removeItem('budgetProjectId');
      sessionStorage.removeItem('budgetMode');
    }
  }, [showProjectWizard]); // Se ejecuta cuando cambia showProjectWizard (cuando se cierra)

  const loadProjectForBudget = async (projectId: string) => {
    try {
      const project = await ProjectService.getProjectById(projectId);
      setBudgetProjectData(project);
    } catch (error) {
      console.error('Error loading project for budget:', error);
    }
  };

  const handleLoginClick = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleRegisterClick = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNewProject = () => {
    // Verificar si hay datos de edición en sessionStorage (desde Taller)
    const editData = sessionStorage.getItem('editProjectData');

    // Si venimos de "Calculadora" en Taller, limpiamos ID para crear copia o nuevo
    // OJO: Si la idea es editar el mismo, deberíamos pasar el ID.
    // Asumimos 'Nuevo Proyecto' limpia ID.
    setCurrentProjectId(null);

    if (editData) {
      try {
        const parsedData = JSON.parse(editData);
        setWizardInitialData(parsedData);
        sessionStorage.removeItem('editProjectData');
        console.log('✅ Wizard abierto con datos del Taller (Nuevo Draft)');
      } catch (error) {
        console.error('Error parseando editProjectData:', error);
        setWizardInitialData(null);
      }
    } else {
      // NO limpiar wizardDraft aquí - permitir recuperación de borrador
      setWizardInitialData(null);
      console.log('🆕 Nuevo proyecto - Borrador se recuperará si existe');
    }

    setShowProjectWizard(true);
  };

  // --- FUNCIÓN PARA EDITAR PROYECTO EXISTENTE ---
  const handleEditProject = async (projectId: string) => {
    console.log('App: Cargando proyecto para edición:', projectId);

    try {
      // Usamos el Servicio actualizado
      const project = await ProjectService.getProjectById(projectId);

      console.log('✅ Proyecto cargado:', project);

      // Limpiar borrador antes de cargar proyecto existente
      sessionStorage.removeItem('wizardDraft');

      setWizardInitialData(project.wizardData);
      setCurrentProjectId(projectId); // IMPORTANTE: Guardamos ID para hacer UPDATE y no INSERT
      setShowProjectWizard(true);

    } catch (error) {
      console.error('Error al cargar proyecto:', error);
      alert('❌ Error al cargar el proyecto. Verifica tu conexión.');
    }
  };

  // --- FUNCIÓN DE GUARDADO EN BASE DE DATOS ---
  const handleSaveProjectToSupabase = async (wizardData: any, isAutoSave = false) => {
    console.log('🔵 App: Iniciando guardado...', { wizardData, currentProjectId, user: user?.id, isAutoSave });

    if (!user) {
      if (!isAutoSave) {
        alert('Debes iniciar sesión para guardar.');
      }
      return null;
    }

    try {
      let savedId = currentProjectId;
      if (currentProjectId) {
        // ACTUALIZAR (UPDATE)
        console.log('🔄 App: Actualizando proyecto existente:', currentProjectId);
        await ProjectService.updateProject(currentProjectId, wizardData);
        console.log('✅ Proyecto actualizado exitosamente');
      } else {
        // CREAR (INSERT)
        console.log('➕ App: Creando nuevo proyecto para user:', user.id);
        const result = await ProjectService.createProject(user.id, wizardData);
        savedId = result.id;
        setCurrentProjectId(savedId); // CRÍTICO: Actualizar ID inmediatamente
        console.log('✅ Proyecto creado exitosamente:', result);
      }

      // Solo cerrar Wizard si es guardado manual (no auto-guardado)
      if (!isAutoSave) {
        setShowProjectWizard(false);
        setWizardInitialData(null);
        setCurrentProjectId(null);
        setDashboardKey(prev => prev + 1); // Forzar refresh del Dashboard
      }

      return savedId;

    } catch (error: any) {
      console.error('❌ Error al guardar:', error);
      if (!isAutoSave) {
        alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
      }
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando OVE...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage onLogin={handleLoginClick} onRegister={handleRegisterClick} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard
                key={dashboardKey}
                userEmail={user.email || 'Colega'}
                onLogout={handleLogout}
                onNewProject={handleNewProject}
                onEditProject={handleEditProject}
                isDemoMode={false}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/taller/:projectId"
          element={
            user ? <PlannerCanvas /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/project/:projectId/documentation"
          element={
            user ? <ProjectDocumentation /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/profile"
          element={
            user ? <Profile /> : <Navigate to="/" replace />
          }
        />

        {/* 🎨 ADMIN-ONLY: Symbol Editor */}
        <Route
          path="/admin/editor-simbolos"
          element={<SymbolEditor />}
        />
      </Routes>

      {showAuthModal && (
        <AuthModal
          isOpen={true}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}

      {/* AQUÍ CONECTAMOS EL GUARDADO */}
      {showProjectWizard && (
        <ProjectWizard
          onClose={() => {
            setShowProjectWizard(false);
            setWizardInitialData(null);
            setCurrentProjectId(null);
          }}
          onSaveProject={handleSaveProjectToSupabase}
          initialData={wizardInitialData}
        />
      )}

      {/* BudgetEditorModal para Presupuesto Flash */}
      {showBudgetEditor && budgetProjectId && (
        <BudgetEditorModal
          isOpen={true}
          onClose={() => {
            setShowBudgetEditor(false);
            setBudgetProjectId(null);
            setBudgetProjectData(null);
            setDashboardKey(prev => prev + 1); // Refresh Dashboard
          }}
          mode={budgetMode}
          projectId={budgetProjectId}
          initialItems={[]}
          projectName={budgetProjectData?.name}
          clientName={budgetProjectData?.wizardData?.config?.clientName}
          street={budgetProjectData?.wizardData?.config?.ownerDetail?.street}
          number={budgetProjectData?.wizardData?.config?.ownerDetail?.number}
          city={budgetProjectData?.wizardData?.config?.ownerDetail?.city}
          province={budgetProjectData?.wizardData?.config?.ownerDetail?.province}
        />
      )}
    </BrowserRouter>
  );
}

export default App;