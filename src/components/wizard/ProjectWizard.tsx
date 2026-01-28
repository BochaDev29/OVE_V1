import { useState, useMemo, useEffect } from 'react';
import { Calculator, X } from 'lucide-react';
import { ProjectConfig, EnvironmentCalculation, calculateProjectDemand, generateCircuitInventory, calculateElectrificationGrade, calculateSLA, validateWizardStep } from '../../lib/electrical-rules';
import { ValidationPanel } from './ValidationPanel';
import { useAutoSave } from '../../hooks/useAutoSave';
import { ConnectionStatus } from '../ConnectionStatus';
import WizardStep1_General from './WizardStep1_General';
import WizardStep2_Ambientes from './WizardStep2_Ambientes';
import ProjectWizardStep3 from './ProjectWizardStep3';
import ProjectWizardStep4 from './ProjectWizardStep4';
import WizardStepExistente, { ExistenteData } from './WizardStepExistente';

interface ProjectWizardProps {
  onClose: () => void;
  onSaveProject: (projectData: any) => Promise<string | null>; // Retorna projectId
  initialData?: {
    config: ProjectConfig;
    environments: EnvironmentCalculation[];
    existenteData?: any; // Datos de Res. 54/2018
  };
  projectId?: string | null;
}

export default function ProjectWizard({
  onClose,
  onSaveProject,
  initialData,
  projectId: initialProjectId
}: ProjectWizardProps) {

  // Detectar tipo de proyecto desde sessionStorage
  const projectType = sessionStorage.getItem('projectType') || 'complete';
  const isFlashMode = projectType === 'flash';

  const [step, setStep] = useState(1);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId || null);
  const [validationMessages, setValidationMessages] = useState<Array<{ type: 'error' | 'warning'; message: string; field?: string }>>([]);

  // --- INICIALIZACIÓN SIMPLE: Solo desde initialData (Supabase) ---
  const [config, setConfig] = useState<ProjectConfig>(() => {
    const baseConfig: ProjectConfig = initialData?.config || {
      clientName: '', clientPhone: '', destination: 'vivienda', voltage: '220V',
      projectType: 'nueva', surfaceArea: 0, workType: 'budget_certification',
      ownerDetail: { dniCuit: '', street: '', number: '', floor: '', apartment: '', tower: '', city: '', province: 'Córdoba', zipCode: '', catastro: '' },
      certificationScope: 'complete',
      materialPreferences: { brandBreakers: '', brandCables: '', pipeType: '' },
      panels: [] // Inicializar como array vacío
    };

    // Si el proyecto es viejo y no tiene 'panels', se lo inyectamos ahora
    if (!baseConfig.panels || baseConfig.panels.length === 0) {
      baseConfig.panels = [
        {
          id: 'TP-MAIN',
          name: 'Tablero Principal (TP)',
          type: 'TP',
          voltage: baseConfig.voltage || '220V',
          feederDistance: 2,
          installationType: 'Embutido',
          // 🔧 FIX: Inicializar incomingLine para que Iz se calcule correctamente
          incomingLine: {
            method: 'B1',
            length: 2,
            material: 'Cu',
            section: 4,
            groupingCount: 1,
            ambientTemp: 40,
            conduitMaterial: 'PVC'
          },
          protections: {
            hasPIA: true,
            piaRating: 25,
            hasID: true,
            idRating: 40,
            idSensitivity: '30mA'
          },
          enclosure: {
            mountingType: 'embutido',
            ipRating: 'IP41',
            modules: 12
          }
        }
      ];
    }
    return baseConfig;
  });

  const [environments, setEnvironments] = useState<EnvironmentCalculation[]>(() => {
    const envs = initialData?.environments || [];
    // Asegurar que cada ambiente tenga asignado el TP principal
    return envs.map(env => ({
      ...env,
      panelId: env.panelId || 'TP-MAIN'
    }));
  });

  // Estado para instalaciones existentes (Res. 54/2018)
  const [existenteData, setExistenteData] = useState<ExistenteData>(() => {
    if (initialData?.existenteData) {
      return initialData.existenteData;
    }

    // Valores por defecto
    return {
      bocasLuz: 0,
      bocasTomas: 0,
      cargasEspeciales: 0,
      checklist: {
        cierreSeguridad: false,
        dobleAislacion: false,
        gradoProteccionIP: false,
        restriccionAcceso: false,
        sistemaTT: false,
        equipotencializacion: false,
        protecciones: false,
        diferencial: false,
        selloS: false,
        canalizaciones: false,
        estadoGeneral: false
      },
      fotos: []
    };
  });

  const calculation = useMemo(() => {
    return calculateProjectDemand(config, environments);
  }, [config, environments]);

  // Preparar datos del proyecto para auto-guardado
  const projectData = useMemo(() => ({
    config,
    environments,
    calculation,
    existenteData
  }), [config, environments, calculation, existenteData]);

  // Auto-guardado híbrido (Supabase + localStorage)
  const autoSaveStatus = useAutoSave({
    data: projectData,
    projectId: currentProjectId,
    onSave: async (data) => {
      // Pasar isAutoSave=true para evitar cerrar el Wizard
      const savedId = await onSaveProject(data, true);
      if (savedId && !currentProjectId) {
        setCurrentProjectId(savedId);
      }
      return savedId;
    },
    debounceMs: 30000, // 30 segundos
    enabled: true
  });

  // Estado para detectar cambios en environments
  const [environmentsSnapshot, setEnvironmentsSnapshot] = useState<string>('');
  const [hasEnvironmentsChanged, setHasEnvironmentsChanged] = useState(false);

  // Detectar cambios en environments
  useEffect(() => {
    if (step === 2 && config.circuitInventory) {
      const currentSnapshot = JSON.stringify(environments);
      if (environmentsSnapshot && currentSnapshot !== environmentsSnapshot) {
        setHasEnvironmentsChanged(true);
        console.log('⚠️ Cambios detectados en ambientes');
      }
    }
  }, [environments, step, environmentsSnapshot, config.circuitInventory]);

  // Validar paso actual en tiempo real
  useEffect(() => {
    const messages = validateWizardStep(step, config, environments);
    setValidationMessages(messages);
  }, [step, config, environments]);

  // Handlers simplificados (auto-guardado maneja la persistencia)
  const handleNext = async () => {
    // Si es modo Flash y estamos en el Paso 1, guardar y cerrar
    if (isFlashMode && step === 1) {
      console.log('⚡ Modo Flash: Guardando proyecto después del Paso 1...');

      // Guardar el proyecto usando handleSave
      const savedProjectId = await handleSave();

      if (savedProjectId) {
        console.log('✅ Proyecto guardado:', savedProjectId);

        // Limpiar sessionStorage
        sessionStorage.removeItem('projectType');

        // Cerrar wizard
        onClose();

        // Navegar a Documentación con pestaña Presupuesto activa
        window.location.href = `/project/${savedProjectId}/documentation?tab=budget`;
      }
      return;
    }

    // Flujo normal: avanzar al siguiente paso
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleSave = async () => {
    console.log('💾 ProjectWizard: Guardando proyecto...');
    const result = await onSaveProject(projectData);

    if (result) {
      setCurrentProjectId(result);
      console.log('✅ Proyecto guardado exitosamente');
    }

    return result;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-slate-800 text-white p-2.5 sm:p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg shrink-0"><Calculator className="w-4 h-4 sm:w-5 h-5 text-white" /></div>
            <div>
              <h2 className="font-bold text-sm sm:text-lg leading-tight">Asistente de Proyecto Eléctrico</h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                {config.projectType === 'existente' ? 'Instalación Existente (Res. 54)' : 'Motor AEA 770/771 (Normativo)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 sm:w-6 h-6" /></button>
        </div>

        <div className="bg-slate-100 h-2 w-full">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-2 bg-slate-50 border-b flex justify-between px-2 sm:px-8 text-[10px] sm:text-sm font-medium text-slate-500 overflow-x-auto no-scrollbar">
          <span className={`shrink-0 ${step >= 1 ? 'text-blue-700 font-bold' : ''}`}>1. Gral</span>
          {config.projectType === 'existente' ? (
            <>
              <span className={`shrink-0 ${step >= 2 ? 'text-blue-700 font-bold' : ''}`}>2. Circ.</span>
              <span className={`shrink-0 ${step >= 3 ? 'text-blue-700 font-bold' : ''}`}>3. Tabl.</span>
              <span className={`shrink-0 ${step >= 4 ? 'text-blue-700 font-bold' : ''}`}>4. Resum</span>
            </>
          ) : (
            <>
              <span className={`shrink-0 ${step >= 2 ? 'text-blue-700 font-bold' : ''}`}>2. Amb.</span>
              <span className={`shrink-0 ${step >= 3 ? 'text-blue-700 font-bold' : ''}`}>3. Tabl.</span>
              <span className={`shrink-0 ${step >= 4 ? 'text-blue-700 font-bold' : ''}`}>4. Result</span>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-white">
          {/* Panel de Validación */}
          {validationMessages.length > 0 && (
            <div className="mb-4">
              <ValidationPanel messages={validationMessages} />
            </div>
          )}

          {step === 1 && <WizardStep1_General config={config} onChange={setConfig} onNext={handleNext} onResetEnvironments={() => setEnvironments([])} />}

          {/* Flujo para instalaciones existentes (Res. 54/2018) */}
          {config.projectType === 'existente' ? (
            <>
              {step === 2 && <WizardStep2_Ambientes config={config} onChange={setConfig} environments={environments} onUpdateEnvironments={setEnvironments} onBack={handleBack} onNext={handleNext} modoSimplificado={true} />}
              {step === 3 && <ProjectWizardStep3 config={config} onChange={setConfig} onBack={handleBack} onCalculate={handleNext} />}
              {step === 4 && <WizardStepExistente onBack={handleBack} onNext={handleNext} onSaveData={setExistenteData} initialData={existenteData} environments={environments} config={config} />}
            </>
          ) : (
            /* Flujo normal para instalaciones nuevas */
            <>
              {step === 2 && (
                <WizardStep2_Ambientes
                  config={config}
                  onChange={(newConfig) => {
                    // Solo actualizar config sin regenerar inventario
                    setConfig(newConfig);
                  }}
                  environments={environments}
                  onUpdateEnvironments={setEnvironments}
                  onBack={handleBack}
                  onNext={() => {
                    // Verificar si hay cambios y si existe inventario
                    if (environments.length > 0) {
                      const currentSnapshot = JSON.stringify(environments);

                      if (config.circuitInventory && hasEnvironmentsChanged) {
                        // Hay cambios y existe inventario: Mostrar alerta
                        const confirmar = window.confirm(
                          '⚠️ Has modificado los ambientes.\n\n' +
                          'Si continúas, se regenerarán TODOS los circuitos y perderás las asignaciones manuales del Paso 3.\n\n' +
                          '¿Deseas continuar?'
                        );

                        if (confirmar) {
                          // Usuario confirmó: Regenerar inventario
                          const sla = calculateSLA(environments);
                          const grade = calculateElectrificationGrade(config.destination, sla, environments);
                          const inventory = generateCircuitInventory(environments, config, grade);
                          setConfig({ ...config, circuitInventory: inventory });
                          setEnvironmentsSnapshot(currentSnapshot);
                          setHasEnvironmentsChanged(false);
                          console.log('🔄 Inventario regenerado por cambios');
                          handleNext();
                        }
                        // Si no confirma, no avanza
                      } else if (!config.circuitInventory) {
                        // No existe inventario: Generar por primera vez
                        const sla = calculateSLA(environments);
                        const grade = calculateElectrificationGrade(config.destination, sla, environments);
                        const inventory = generateCircuitInventory(environments, config, grade);
                        setConfig({ ...config, circuitInventory: inventory });
                        setEnvironmentsSnapshot(currentSnapshot);
                        console.log('📦 Inventario generado (primera vez)');
                        handleNext();
                      } else {
                        // No hay cambios: Preservar inventario y avanzar
                        console.log('✅ Sin cambios - Inventario preservado');
                        handleNext();
                      }
                    } else {
                      handleNext();
                    }
                  }}
                />
              )}
              {step === 3 && <ProjectWizardStep3 config={config} onChange={setConfig} onBack={handleBack} onCalculate={handleNext} />}
              {step === 4 && <ProjectWizardStep4 config={config} circuitInventory={config.circuitInventory} environments={environments} onBack={handleBack} onSaveProject={handleSave} projectId={currentProjectId} />}
            </>
          )}
        </div>
      </div>

      {/* Indicador de conexión y auto-guardado */}
      <ConnectionStatus
        isOnline={!autoSaveStatus.isOffline}
        isSaving={autoSaveStatus.isSaving}
        lastSaved={autoSaveStatus.lastSaved}
        error={autoSaveStatus.error}
      />
    </div>
  );
}