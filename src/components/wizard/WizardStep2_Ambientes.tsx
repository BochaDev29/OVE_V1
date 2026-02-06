import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Home, Lightbulb, Plug, Zap, Monitor, Edit2, RotateCw, CheckCircle, LayoutGrid } from 'lucide-react';
import { ProjectConfig, EnvironmentCalculation, calculateEnvironmentBocas, calculateElectrificationGrade, calculateSLA, getSuggestedEnvironments, CIRCUIT_VARIANTS, getAvailableCircuitVariants, getCircuitVariant } from '../../lib/electrical-rules';

interface Step2Props {
    config: ProjectConfig;
    onChange?: (config: ProjectConfig) => void;
    environments: EnvironmentCalculation[];
    onUpdateEnvironments: (envs: EnvironmentCalculation[]) => void;
    onBack: () => void;
    onNext: () => void;
    modoSimplificado?: boolean; // Para instalaciones existentes (Res. 54/2018)
}

export default function WizardStep2_Ambientes({ config, onChange, environments, onUpdateEnvironments, onBack, onNext, modoSimplificado = false }: Step2Props) {
    // 🆕 Determinar si se deben mostrar inputs de naturaleza separados (REL/PROY)
    // Solo se muestran en modificación, existente o provisoria (NO en obra nueva)
    const showNatureInputs = useMemo(() => {
        return ['modificacion', 'existente', 'provisoria'].includes(config.estadoObra || '');
    }, [config.estadoObra]);

    // Calcular SLA y grado de electrificación
    const totalSurface = environments.length > 0 ? calculateSLA(environments) : 0;
    const currentGrade = calculateElectrificationGrade(config.destination, config.surfaceArea, environments);
    const variants = (CIRCUIT_VARIANTS as any)[currentGrade] || CIRCUIT_VARIANTS['Mínimo'];
    const suggestedEnvs = getSuggestedEnvironments(config.destination);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const defaultPanelId = config.panels?.[0]?.id || 'TP-MAIN';

    // 🔌 CÁLCULOS DE CIRCUITOS
    // 1. Calcular totales de bocas por tipo
    const bocasTotals = useMemo(() => {
        return environments.reduce((acc, env) => {
            // Unificamos: Si existen campos de auditoría, usamos esos. 
            // Si no (legacy), usamos los campos lights/regularOutlets.
            const iug = (env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) || (env.lights || 0);
            const tug = (env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0) || (env.regularOutlets || 0);

            return {
                iug: acc.iug + iug,
                tug: acc.tug + tug,
                tue: acc.tue + (env.specialOutlets || 0),
                acu: acc.acu + (env.specialLoads?.filter(l => l.type === 'ACU').length || 0)
            };
        }, { iug: 0, tug: 0, tue: 0, acu: 0 });
    }, [environments]);

    // 2. Obtener circuitos mínimos de la variante seleccionada
    const selectedVariant = variants[config.selectedVariantIndex || 0];
    const minCircuits = {
        iug: selectedVariant?.iug || 1,
        tug: selectedVariant?.tug || 1,
        libre: selectedVariant?.libre || 0
    };

    // 3. Calcular circuitos necesarios (según límite de 15 bocas AEA 770.6.6)
    const circuitsNeeded = useMemo(() => {
        const IUG_MAX_BOCAS = 15;
        const TUG_MAX_BOCAS = 15;

        if (modoSimplificado) {
            // En modo simplificado, los circuitos son identificadores arbitrarios (C1, C2, etc.)
            const assignedIDs = new Set<string>();
            environments.forEach(env => {
                if (env.assignedIugCircuit) assignedIDs.add(env.assignedIugCircuit);
            });

            return {
                iug: 0, // No se usa por separado en modo simplificado
                tug: 0,
                tue: bocasTotals.tue,
                acu: bocasTotals.acu,
                customIds: assignedIDs.size > 0 ? Array.from(assignedIDs).sort() : ['C1']
            };
        }

        // Encontrar el máximo circuito asignado manualmente (Modo Proyectado)
        const maxIugAssigned = environments.reduce((max, env) => {
            if (env.assignedIugCircuit && env.assignedIugCircuit.includes('-')) {
                const num = parseInt(env.assignedIugCircuit.split('-')[1]);
                return isNaN(num) ? max : Math.max(max, num);
            }
            return max;
        }, 0);

        const maxTugAssigned = environments.reduce((max, env) => {
            if (env.assignedTugCircuit && env.assignedTugCircuit.includes('-')) {
                const num = parseInt(env.assignedTugCircuit.split('-')[1]);
                return isNaN(num) ? max : Math.max(max, num);
            }
            return max;
        }, 0);

        // Calcular circuitos necesarios por bocas
        const iugByBocas = Math.ceil(bocasTotals.iug / IUG_MAX_BOCAS);
        const tugByBocas = Math.ceil(bocasTotals.tug / TUG_MAX_BOCAS);

        return {
            iug: Math.max(iugByBocas, minCircuits.iug, maxIugAssigned),
            tug: Math.max(tugByBocas, minCircuits.tug, maxTugAssigned),
            tue: bocasTotals.tue, // 1 circuito por boca especial
            acu: bocasTotals.acu,  // 1 circuito por carga ACU
            customIds: []
        };
    }, [bocasTotals, minCircuits, environments, modoSimplificado]);

    // 4. Calcular distribución de bocas por circuito
    const circuitDistribution = useMemo(() => {
        const distribution: Record<string, Record<string, number>> = {};

        environments.forEach(env => {
            distribution[env.id] = {};

            if (modoSimplificado) {
                const circuit = env.assignedIugCircuit || 'C1';
                // Sumar bocas de luz y tomas al mismo circuito de grupo
                const totalBocas = (env.bocasLuz || 0) + (env.bocasTomas || 0) +
                    (env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) +
                    (env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0);
                if (totalBocas > 0) {
                    distribution[env.id][circuit] = totalBocas;
                }
            } else {
                // IUG
                const totalIug = (env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) || (env.lights || 0);
                if (totalIug > 0) {
                    const circuit = env.assignedIugCircuit || 'IUG-1';
                    distribution[env.id][circuit] = totalIug;
                }

                // TUG
                const totalTug = (env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0) || (env.regularOutlets || 0);
                if (totalTug > 0) {
                    const circuit = env.assignedTugCircuit || 'TUG-1';
                    distribution[env.id][circuit] = totalTug;
                }
            }

            // Cargas especiales (TUE, IUE, ACU, APM, etc.)
            env.specialLoads?.forEach((load, idx) => {
                const circuitName = `${load.type}-${env.id.substring(0, 4)}-${idx + 1}`;
                const bocas = load.bocas || 1; // ACU siempre es 1, otros pueden tener múltiples bocas
                distribution[env.id][circuitName] = bocas;
            });
        });

        return distribution;
    }, [environments, modoSimplificado]);

    // 5. Calcular totales por circuito
    const circuitTotals = useMemo(() => {
        const totals: Record<string, number> = {};

        if (modoSimplificado) {
            // Inicializar circuitos asignados
            (circuitsNeeded as any).customIds.forEach((id: string) => {
                totals[id] = 0;
            });
        } else {
            // Inicializar todos los circuitos en 0 (Modo Proyectado)
            for (let i = 1; i <= circuitsNeeded.iug; i++) {
                totals[`IUG-${i}`] = 0;
            }
            for (let i = 1; i <= circuitsNeeded.tug; i++) {
                totals[`TUG-${i}`] = 0;
            }
        }

        // Sumar bocas de cada ambiente
        Object.values(circuitDistribution).forEach(envDist => {
            Object.entries(envDist).forEach(([circuit, bocas]) => {
                // En modo simplificado, cualquier ID que no sea especial se suma
                if (modoSimplificado) {
                    if (!['ACU', 'TUE', 'IUE', 'APM', 'ATE'].some(t => circuit.startsWith(t))) {
                        totals[circuit] = (totals[circuit] || 0) + bocas;
                    }
                } else if (circuit.startsWith('IUG') || circuit.startsWith('TUG')) {
                    totals[circuit] = (totals[circuit] || 0) + bocas;
                }
            });
        });

        return totals;
    }, [circuitDistribution, circuitsNeeded, modoSimplificado]);

    // 6. Obtener lista de circuitos especiales únicos
    const specialCircuits = useMemo(() => {
        const circuits: string[] = [];
        const customIdsList = modoSimplificado ? (circuitsNeeded as any).customIds || [] : [];

        Object.values(circuitDistribution).forEach(envDist => {
            Object.keys(envDist).forEach(circuit => {
                const isTraditional = circuit.startsWith('IUG-') || circuit.startsWith('TUG-');
                const isCustom = customIdsList.includes(circuit);

                if (!isTraditional && !isCustom && !circuits.includes(circuit)) {
                    circuits.push(circuit);
                }
            });
        });
        return circuits.sort();
    }, [circuitDistribution, circuitsNeeded, modoSimplificado]);


    const [newEnv, setNewEnv] = useState<Partial<EnvironmentCalculation>>({
        name: modoSimplificado ? 'Circuito 1' : 'Dormitorio',
        surface: 0,
        length: 0,
        width: 0,
        lights: 0,
        regularOutlets: 0,
        specialOutlets: 0,
        specialLightsIUE: 0, // IUE - Iluminación Uso Especial
        specialLoads: [],
        panelId: defaultPanelId,
        assignedIugCircuit: modoSimplificado ? 'C1' : 'IUG-1',
        assignedTugCircuit: 'TUG-1',
        tipoSuperficie: 'cubierta', // Por defecto: cubierta (100% de la superficie)
        // Campos para modo simplificado (Res. 54/2018)
        bocasLuzRelevado: 0,
        bocasLuzProyectado: 0,
        bocasTomasRelevado: 0,
        bocasTomasProyectado: 0,
        // Campos de diagnóstico
        breakerInfo: '',
        cableInfo: '',
        hasPAT: false,
        hasPE: false,
        observacionesTecnicas: ''
    });

    const [tempLoad, setTempLoad] = useState({ type: 'ACU', value: '', unit: 'VA' as 'VA' | 'W' });

    useEffect(() => {
        if (Math.abs(config.surfaceArea - totalSurface) > 0.01 && onChange) {
            onChange({ ...config, surfaceArea: Number(totalSurface.toFixed(2)) });
        }
    }, [environments, totalSurface]);

    const handleSmartUpdate = () => {
        const updatedEnvs = environments.map((env: any) => {
            const suggestions = calculateEnvironmentBocas(env.surface, env.name, currentGrade, config.destination);
            return { ...env, lights: Math.max(env.lights, suggestions.lights), regularOutlets: Math.max(env.regularOutlets, suggestions.regularOutlets) };
        });
        onUpdateEnvironments(updatedEnvs);
        setShowToast(true); setTimeout(() => setShowToast(false), 2000);
    };

    // 5. Sugerencias de PMU para el ambiente actual (usado en validaciones de UI)
    const suggestions = useMemo(() => {
        return calculateEnvironmentBocas(
            newEnv.surface || 0,
            newEnv.name || '',
            currentGrade,
            config.destination,
            newEnv.length
        );
    }, [newEnv.surface, newEnv.name, currentGrade, config.destination, newEnv.length]);

    const handleDimensionChange = (dim: 'width' | 'length', val: number) => {
        const updated = { ...newEnv, [dim]: val };
        const surf = Number(((updated.width || 0) * (updated.length || 0)).toFixed(2));

        // Calculamos sugerencias localmente para poblar campos si es necesario
        const currentSuggestions = calculateEnvironmentBocas(surf, updated.name || '', currentGrade, config.destination, updated.length);

        if (modoSimplificado) {
            setNewEnv({ ...updated, surface: surf });
        } else {
            // En Obra Nueva, poblamos Proyectado si no hay nada en Relevado
            const isNewWork = config.estadoObra === 'nueva' || config.creationMode === 'flash';

            setNewEnv({
                ...updated,
                surface: surf,
                // Solo auto-poblamos si ambos campos están en 0, para no pisar lo que el usuario escriba
                bocasLuzProyectado: (isNewWork && (updated.bocasLuzRelevado || 0) + (updated.bocasLuzProyectado || 0) === 0)
                    ? currentSuggestions.lights
                    : (updated.bocasLuzProyectado || 0),
                bocasTomasProyectado: (isNewWork && (updated.bocasTomasRelevado || 0) + (updated.bocasTomasProyectado || 0) === 0)
                    ? currentSuggestions.regularOutlets
                    : (updated.bocasTomasProyectado || 0)
            });
        }
    };

    const saveEnvironment = () => {
        const finalName = newEnv.name === 'Otro' ? (newEnv.customName || 'Otro') : (newEnv.name || 'Ambiente');

        // Sincronizar campos de relevamiento con campos de cálculo para compatibilidad
        const envToSave: EnvironmentCalculation = {
            ...newEnv,
            name: finalName,
            id: editingId || Math.random().toString(36).substr(2, 9),
            // Sincronización corregida para evitar doble suma
            lights: modoSimplificado
                ? ((newEnv.bocasLuz || 0) + (newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0))
                : ((newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0) || (newEnv.lights || 0)),
            regularOutlets: modoSimplificado
                ? ((newEnv.bocasTomas || 0) + (newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0))
                : ((newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0) || (newEnv.regularOutlets || 0)),
            surface: newEnv.surface || 0,
            bocasLuzRelevado: newEnv.bocasLuzRelevado || 0,
            bocasLuzProyectado: newEnv.bocasLuzProyectado || 0,
            bocasTomasRelevado: newEnv.bocasTomasRelevado || 0,
            bocasTomasProyectado: newEnv.bocasTomasProyectado || 0,
            breakerInfo: newEnv.breakerInfo || '',
            cableInfo: newEnv.cableInfo || '',
            hasPAT: newEnv.hasPAT || false,
            hasPE: newEnv.hasPE || false,
            observacionesTecnicas: newEnv.observacionesTecnicas || ''
        } as EnvironmentCalculation;

        if (editingId) onUpdateEnvironments(environments.map((e: any) => e.id === editingId ? envToSave : e));
        else onUpdateEnvironments([...environments, envToSave]);
        resetForm();
    };

    // Función para manejar "Nuevo Circuito" de forma explícita
    const handleAddNewCircuit = () => {
        const assignedIDs = environments.map(e => e.assignedIugCircuit).filter(Boolean);
        let nextId = 'C1';

        // Lógica para sugerir el siguiente (C1, C2, etc.)
        const nums = assignedIDs
            .map(id => {
                const match = id?.match(/C(\d+)/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);

        if (nums.length > 0) {
            nextId = `C${Math.max(...nums) + 1}`;
        }

        setNewEnv({
            ...newEnv,
            name: nextId,
            assignedIugCircuit: nextId,
            bocasLuz: 0,
            bocasTomas: 0,
            cargasEspeciales: 0
        });
        setIsAdding(true);
    };

    const resetForm = () => {
        const firstEnv = suggestedEnvs[0]?.name || 'Ambiente';
        setNewEnv({
            name: modoSimplificado ? `Ambiente ${environments.length + 1}` : firstEnv,
            surface: 0,
            length: 0,
            width: 0,
            lights: 0,
            regularOutlets: 0,
            specialOutlets: 0,
            specialLightsIUE: 0,
            specialLoads: [],
            panelId: defaultPanelId,
            assignedIugCircuit: modoSimplificado ? (environments[environments.length - 1]?.assignedIugCircuit || 'C1') : 'IUG-1',
            assignedTugCircuit: 'TUG-1',
            tipoSuperficie: 'cubierta',
            bocasLuzRelevado: 0,
            bocasLuzProyectado: 0,
            bocasTomasRelevado: 0,
            bocasTomasProyectado: 0,
            breakerInfo: '',
            cableInfo: '',
            hasPAT: false,
            hasPE: false,
            observacionesTecnicas: ''
        });
        setEditingId(null); setIsAdding(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500 relative">
            {showToast && <div className="absolute top-0 inset-x-0 flex justify-center z-50"><div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold"><CheckCircle className="w-5 h-5" /> ¡Mínimos Actualizados!</div></div>}

            <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex justify-between items-center transition-all">
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">SLA (Superficie Límite Aplicación)</p>
                    <h3 className="text-2xl font-black">{totalSurface.toFixed(2)} m²</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Cubierta + 50% Semicubierta</p>
                </div>
                {!modoSimplificado ? (
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Grado Electrificación</p>
                        <div className="text-lg font-black px-4 py-1 rounded-lg bg-blue-600 shadow-lg border border-blue-500 animate-pulse-slow">
                            {currentGrade.toUpperCase()}
                        </div>
                    </div>
                ) : (
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Régimen</p>
                        <div className="text-sm font-black px-3 py-1 rounded bg-amber-600 shadow-md transform -skew-x-12">
                            RES. 54/2018
                        </div>
                    </div>
                )}
            </div>

            {config.projectType === 'nueva' && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-12 md:col-span-4">
                            <label className="block text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Variante de Circuitos (AEA 770)
                            </label>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                            <select
                                className="w-full p-2 border-2 border-amber-300 rounded-lg bg-white font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm"
                                value={config.selectedVariantIndex || 0}
                                onChange={(e) => onChange && onChange({ ...config, selectedVariantIndex: parseInt(e.target.value) })}
                            >
                                {(variants as any[]).map((v: any, idx: number) => (
                                    <option key={idx} value={idx}>
                                        Variante {idx + 1}: {v.iug} IUG + {v.tug} TUG{v.libre ? ' + 1 Libre' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Selector de Variantes Industriales (AEA 771.8) */}
            {config.regimenUso === 'industrial' && config.estadoObra === 'nueva' && (
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl animate-in slide-in-from-top duration-500">
                    <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-12 md:col-span-4">
                            <label className="block text-xs font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                <Monitor className="w-4 h-4" /> Circuitos Industriales (AEA 771.8)
                            </label>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                            {getAvailableCircuitVariants(currentGrade).length === 0 ? (
                                <div className="text-sm text-indigo-600 italic p-2">
                                    No hay variantes disponibles para este grado de electrificación
                                </div>
                            ) : (
                                <select
                                    className="w-full p-2 border-2 border-indigo-300 rounded-lg bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                    value={config.selectedVariantIndex ?? getAvailableCircuitVariants(currentGrade)[0]?.variante_index ?? 0}
                                    onChange={(e) => onChange && onChange({ ...config, selectedVariantIndex: parseInt(e.target.value) })}
                                >
                                    {getAvailableCircuitVariants(currentGrade).map((variant) => {
                                        const parts = [];
                                        if (variant.iug > 0) parts.push(`${variant.iug} IUG`);
                                        if (variant.tug > 0) parts.push(`${variant.tug} TUG`);
                                        if (variant.iue > 0) parts.push(`${variant.iue} IUE`);
                                        if (variant.tue > 0) parts.push(`${variant.tue} TUE`);
                                        return (
                                            <option key={variant.variante_index} value={variant.variante_index}>
                                                Variante {variant.variante_index + 1}: {parts.join(' + ')} ({variant.total_circuitos} circuitos)
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">{modoSimplificado ? 'Relevamiento de Circuitos y Sectores' : 'Ambientes / Locales'}</h3>
                <div className="flex gap-2">
                    {!modoSimplificado && environments.length > 0 && <button onClick={handleSmartUpdate} className="flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-300 px-4 py-2 rounded-lg hover:bg-amber-200 font-bold text-sm"><RotateCw className="w-4 h-4" /> Actualizar Mínimos</button>}
                    {!isAdding && (
                        <>
                            {modoSimplificado && (
                                <button
                                    onClick={handleAddNewCircuit}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md font-bold"
                                >
                                    <Zap className="w-5 h-5" /> Nuevo Circuito (C{(circuitsNeeded as any).customIds.length + 1})
                                </button>
                            )}
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md font-bold"
                            >
                                <Plus className="w-5 h-5" /> {modoSimplificado ? 'Agregar Sector / Ambiente' : 'Agregar Ambiente'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="bg-white border-2 border-blue-500/20 p-6 rounded-3xl shadow-2xl mb-8 animate-in zoom-in-95 duration-500">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest pl-1">Tipo de Ambiente / Circuito</label>
                            <select
                                className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all shadow-sm"
                                value={newEnv.name}
                                onChange={e => setNewEnv({ ...newEnv, name: e.target.value })}
                            >
                                {suggestedEnvs.map(env => <option key={env.id} value={env.name}>{env.name}</option>)}
                                <option value="Otro">Otro (Personalizado)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-1">Tipo de Superficie (para cálculo de SLA)</label>
                            <select
                                className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-indigo-800 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                value={newEnv.tipoSuperficie || 'cubierta'}
                                onChange={e => setNewEnv({ ...newEnv, tipoSuperficie: e.target.value as 'cubierta' | 'semicubierta' })}
                            >
                                <option value="cubierta">Cubierta (100% de la superficie)</option>
                                <option value="semicubierta">Semicubierta (50% de la superficie)</option>
                            </select>
                            <p className="text-[9px] text-indigo-600 mt-1 italic">
                                SLA = Sup. Cubierta + 50% Sup. Semicubierta (balcones, galerías, etc.)
                            </p>
                        </div>
                    </div>

                    {/* Campo de Nombre Personalizado - SIEMPRE VISIBLE */}
                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-1 mb-1">
                            Nombre Personalizado (Opcional)
                        </label>
                        <input
                            type="text"
                            className="w-full p-3 border-2 border-indigo-100 rounded-xl bg-indigo-50/30 focus:border-indigo-500 outline-none font-bold text-slate-800 shadow-inner"
                            placeholder={`Ej: ${newEnv.name} Principal, ${newEnv.name} 1, etc.`}
                            value={newEnv.customName || ''}
                            onChange={e => setNewEnv({ ...newEnv, customName: e.target.value })}
                        />
                        <p className="text-[9px] text-indigo-600 mt-1 italic">
                            Útil para distinguir entre múltiples ambientes del mismo tipo (Dormitorio 1, Dormitorio 2, etc.)
                        </p>
                    </div>

                    {/* LAYOUT: DIMENSIONES (arriba) + CIRCUITOS (abajo) - TODO EN ANCHO COMPLETO */}
                    <div className="space-y-3 mb-6">
                        {/* SECCIÓN DIMENSIONES - RENGLÓN HORIZONTAL COMPACTO */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-12 gap-3 items-center">
                                <div className="col-span-2 flex items-center gap-2">
                                    <RotateCw className="w-4 h-4 text-slate-500" />
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Dimensiones</label>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase pl-1 mb-1 block">Largo (m)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-2 border-2 border-white rounded-lg focus:border-blue-400 outline-none text-center font-bold text-base shadow-sm"
                                        value={newEnv.length || ''}
                                        onChange={e => handleDimensionChange('length', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase pl-1 mb-1 block">Ancho (m)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-2 border-2 border-white rounded-lg focus:border-blue-400 outline-none text-center font-bold text-base shadow-sm"
                                        value={newEnv.width || ''}
                                        onChange={e => handleDimensionChange('width', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-6 bg-blue-600 flex items-center justify-center gap-2 rounded-lg border border-blue-700 shadow-md relative overflow-hidden py-2 px-3">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                    <span className="text-[8px] text-blue-100 font-bold uppercase tracking-wider relative z-10">Superficie</span>
                                    <span className="text-xl font-black text-white relative z-10">{newEnv.surface} m²</span>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN CIRCUITOS - RENGLONES HORIZONTALES COMPACTOS */}
                        {!modoSimplificado && (
                            <div className="space-y-2">
                                {/* IUG - Iluminación Uso General */}
                                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                    <div className="grid grid-cols-12 gap-3 items-center">
                                        <div className="col-span-2 flex items-center gap-2">
                                            <Lightbulb className={`w-4 h-4 ${(newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0) < suggestions.lights ? 'text-red-500 animate-pulse' : 'text-amber-600'}`} />
                                            <label className={`text-[10px] font-black uppercase tracking-tight ${(newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0) < suggestions.lights ? 'text-red-600' : 'text-amber-700'}`}>IUG</label>
                                        </div>
                                        {/* 🆕 Inputs condicionales según estadoObra */}
                                        {showNatureInputs ? (
                                            // Modificación/Existente/Provisoria: Mostrar REL + PROY separados
                                            <div className="col-span-3 grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[8px] font-bold text-amber-600 mb-1 uppercase text-center">Rel.</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border-2 border-amber-200 rounded-lg font-bold text-center text-sm shadow-inner bg-amber-50/30"
                                                        value={newEnv.bocasLuzRelevado || 0}
                                                        onChange={e => setNewEnv({ ...newEnv, bocasLuzRelevado: parseInt(e.target.value) || 0 })}
                                                        title="Bocas RELEVADAS (Existentes)"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-bold text-amber-600 mb-1 uppercase text-center">Proy.</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border-2 border-amber-200 rounded-lg font-bold text-center text-sm shadow-inner bg-white"
                                                        value={newEnv.bocasLuzProyectado || 0}
                                                        onChange={e => setNewEnv({ ...newEnv, bocasLuzProyectado: parseInt(e.target.value) || 0 })}
                                                        title="Bocas PROYECTADAS (Nuevas)"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // Obra Nueva: Input único (implícitamente proyectado)
                                            <div className="col-span-3">
                                                <label className="block text-[8px] font-bold text-amber-600 mb-1 uppercase text-center">Total</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border-2 border-amber-200 rounded-lg font-bold text-center text-sm shadow-inner bg-white"
                                                    value={newEnv.bocasLuzProyectado || 0}
                                                    onChange={e => setNewEnv({ ...newEnv, bocasLuzProyectado: parseInt(e.target.value) || 0, bocasLuzRelevado: 0 })}
                                                    title="Bocas Totales (Nuevas)"
                                                />
                                            </div>
                                        )}
                                        <div className="col-span-7 flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[8px] font-bold text-amber-600 mb-1 uppercase">Circuito</label>
                                                <select
                                                    className="w-full p-2 text-sm border-2 border-amber-200 rounded-lg bg-white font-medium shadow-sm"
                                                    value={newEnv.assignedIugCircuit || 'IUG-1'}
                                                    onChange={e => setNewEnv({ ...newEnv, assignedIugCircuit: e.target.value })}
                                                >
                                                    {Array.from({ length: circuitsNeeded.iug }).map((_, i) => {
                                                        const circuit = `IUG-${i + 1}`;
                                                        const currentLoad = circuitTotals[circuit] || 0;
                                                        return (
                                                            <option key={i} value={circuit}>
                                                                {circuit} ({currentLoad}/15 bocas)
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            {(newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0) < suggestions.lights && (
                                                <div className="bg-red-100 text-red-600 p-1 px-2 rounded-lg border border-red-200 text-[10px] font-black animate-bounce mt-3">
                                                    MÍN: {suggestions.lights}
                                                </div>
                                            )}
                                            {(newEnv.bocasLuzRelevado || 0) + (newEnv.bocasLuzProyectado || 0) >= suggestions.lights && (
                                                <div className="bg-green-100 text-green-600 p-1 px-2 rounded-lg border border-green-200 text-[10px] font-black mt-3">
                                                    OK
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* TUG - Tomacorrientes Uso General */}
                                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                    <div className="grid grid-cols-12 gap-3 items-center">
                                        <div className="col-span-2 flex items-center gap-2">
                                            <Plug className={`w-4 h-4 ${(newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0) < suggestions.regularOutlets ? 'text-red-500 animate-pulse' : 'text-blue-600'}`} />
                                            <label className={`text-[10px] font-black uppercase tracking-tight ${(newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0) < suggestions.regularOutlets ? 'text-red-600' : 'text-blue-700'}`}>TUG</label>
                                        </div>
                                        {/* 🆕 Inputs condicionales según estadoObra */}
                                        {showNatureInputs ? (
                                            // Modificación/Existente/Provisoria: Mostrar REL + PROY separados
                                            <div className="col-span-3 grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[8px] font-bold text-blue-600 mb-1 uppercase text-center">Rel.</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border-2 border-blue-200 rounded-lg font-bold text-center text-sm shadow-inner bg-blue-50/30"
                                                        value={newEnv.bocasTomasRelevado || 0}
                                                        onChange={e => setNewEnv({ ...newEnv, bocasTomasRelevado: parseInt(e.target.value) || 0 })}
                                                        title="Bocas RELEVADAS (Existentes)"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-bold text-blue-600 mb-1 uppercase text-center">Proy.</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border-2 border-blue-200 rounded-lg font-bold text-center text-sm shadow-inner bg-white"
                                                        value={newEnv.bocasTomasProyectado || 0}
                                                        onChange={e => setNewEnv({ ...newEnv, bocasTomasProyectado: parseInt(e.target.value) || 0 })}
                                                        title="Bocas PROYECTADAS (Nuevas)"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // Obra Nueva: Input único (implícitamente proyectado)
                                            <div className="col-span-3">
                                                <label className="block text-[8px] font-bold text-blue-600 mb-1 uppercase text-center">Total</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border-2 border-blue-200 rounded-lg font-bold text-center text-sm shadow-inner bg-white"
                                                    value={newEnv.bocasTomasProyectado || 0}
                                                    onChange={e => setNewEnv({ ...newEnv, bocasTomasProyectado: parseInt(e.target.value) || 0, bocasTomasRelevado: 0 })}
                                                    title="Bocas Totales (Nuevas)"
                                                />
                                            </div>
                                        )}
                                        <div className="col-span-7 flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[8px] font-bold text-blue-600 mb-1 uppercase">Circuito</label>
                                                <select
                                                    className="w-full p-2 text-sm border-2 border-blue-200 rounded-lg bg-white font-medium shadow-sm"
                                                    value={newEnv.assignedTugCircuit || 'TUG-1'}
                                                    onChange={e => setNewEnv({ ...newEnv, assignedTugCircuit: e.target.value })}
                                                >
                                                    {Array.from({ length: circuitsNeeded.tug }).map((_, i) => {
                                                        const circuit = `TUG-${i + 1}`;
                                                        const currentLoad = circuitTotals[circuit] || 0;
                                                        return (
                                                            <option key={i} value={circuit}>
                                                                {circuit} ({currentLoad}/15 bocas)
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            {(newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0) < suggestions.regularOutlets && (
                                                <div className="bg-red-100 text-red-600 p-1 px-2 rounded-lg border border-red-200 text-[10px] font-black animate-bounce mt-3">
                                                    MÍN: {suggestions.regularOutlets}
                                                </div>
                                            )}
                                            {(newEnv.bocasTomasRelevado || 0) + (newEnv.bocasTomasProyectado || 0) >= suggestions.regularOutlets && (
                                                <div className="bg-green-100 text-green-600 p-1 px-2 rounded-lg border border-green-200 text-[10px] font-black mt-3">
                                                    OK
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {modoSimplificado ? (
                        /* CARGA MANUAL PARA REGULARIZACIÓN (RES. 54/2018) */
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                                <p className="text-[11px] text-amber-800 font-medium">
                                    <strong>Modo Regularización:</strong> Ingrese el relevamiento de bocas profesionalmente.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                                        <Lightbulb className="w-4 h-4" /> Bocas de Luz
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full p-2 border-2 border-amber-50 rounded-lg font-bold text-center text-xl text-amber-900 focus:border-amber-500 outline-none"
                                        value={newEnv.bocasLuz || 0}
                                        onChange={e => setNewEnv({ ...newEnv, bocasLuz: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-amber-600 mt-1 text-center font-bold uppercase tracking-tighter">25 VA c/u</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                                        <Plug className="w-4 h-4" /> Bocas de Tomas
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full p-2 border-2 border-blue-50 rounded-lg font-bold text-center text-xl text-blue-900 focus:border-blue-500 outline-none"
                                        value={newEnv.bocasTomas || 0}
                                        onChange={e => setNewEnv({ ...newEnv, bocasTomas: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-blue-600 mt-1 text-center font-bold uppercase tracking-tighter">240 VA c/u</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                                        <Zap className="w-4 h-4" /> Cargas Espec.
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full p-2 border-2 border-purple-50 rounded-lg font-bold text-center text-xl text-purple-900 focus:border-purple-500 outline-none"
                                        value={newEnv.cargasEspeciales || 0}
                                        onChange={e => setNewEnv({ ...newEnv, cargasEspeciales: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-purple-600 mt-1 text-center font-bold uppercase tracking-tighter">VA Directos</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
                                        <LayoutGrid className="w-4 h-4" /> Circuito de Grupo
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            className="w-full p-2 border-2 border-indigo-50 rounded-lg font-bold text-center text-xl text-indigo-900 focus:border-indigo-500 outline-none shadow-inner"
                                            value={newEnv.assignedIugCircuit || ''}
                                            placeholder="Ej: C1"
                                            onChange={e => setNewEnv({ ...newEnv, assignedIugCircuit: e.target.value.toUpperCase() })}
                                        />

                                        {/* Selectores rápidos de circuitos existentes */}
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {Array.from(new Set(environments.map(e => e.assignedIugCircuit).filter(Boolean))).sort().map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setNewEnv({ ...newEnv, assignedIugCircuit: c })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black transition-all border-2 ${newEnv.assignedIugCircuit === c
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                                                        : 'bg-white border-indigo-100 text-indigo-400 hover:border-indigo-300 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 mt-2 text-center font-bold uppercase tracking-tighter">Escriba o toque un circuito existente</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* CARGAS ESPECÍFICAS */}
                    {!modoSimplificado && (
                        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm transition-all hover:shadow-md">
                            <label className="block text-xs font-bold text-purple-700 mb-3 uppercase tracking-tighter">Circuitos Especiales y Específicos del Ambiente</label>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4 md:col-span-3">
                                    <select className="w-full text-sm p-2 border-2 border-purple-50 rounded-lg bg-white font-medium" value={tempLoad.type} onChange={e => setTempLoad({ ...tempLoad, type: e.target.value, bocas: e.target.value === 'ACU' || e.target.value === 'AVP' ? 1 : undefined } as any)}>
                                        <option value="ACU">ACU (Aire Acond.)</option>
                                        <option value="APM">APM (Pequeños Motores)</option>
                                        <option value="IUE">IUE (Ilum. Especial)</option>
                                        <option value="TUE">TUE (Tomas Especial)</option>
                                        <option value="ATE">ATE (Tensión Estabilizada)</option>
                                        <option value="MBTF">MBTF (Muy Baja Tensión Funcional)</option>
                                        <option value="MBTS">MBTS (Muy Baja Tensión Seguridad)</option>
                                        {/* ITE solo si NO es vivienda */}
                                        {(config as any).regimenUso !== 'habitacional' && config.destination !== 'vivienda' && (
                                            <option value="ITE">ITE (Ilum. Trifásica Específica)</option>
                                        )}
                                        <option value="OCE">OCE (Otros Circuitos Específicos)</option>
                                        {/* AVP solo para proyectos transitorios */}
                                        {(config as any).regimenUso === 'habitacional' || config.destination as string === 'provisorio_obra' && (
                                            <option value="AVP">AVP (Vivienda Provisoria)</option>
                                        )}
                                    </select>
                                    {(config as any).regimenUso === 'habitacional' || config.destination === 'vivienda' && tempLoad.type === 'ITE' && (
                                        <p className="text-[8px] text-red-600 mt-1 font-bold">⚠️ ITE prohibido en viviendas (AEA 771)</p>
                                    )}
                                </div>

                                {/* 🆕 Selector de Tipo (Mono/Tri) - Solo en proyectos 380V */}
                                {config.voltage === '380V' && (
                                    <div className="col-span-5 md:col-span-3">
                                        <label className="block text-[8px] font-bold text-purple-600 mb-1 uppercase">Tipo de Circuito</label>
                                        <select
                                            className="w-full text-sm p-2 border-2 border-purple-50 rounded-lg bg-white font-medium"
                                            value={(tempLoad as any).isThreePhase ? 'trifasico' : 'monofasico'}
                                            onChange={e => setTempLoad({
                                                ...tempLoad,
                                                isThreePhase: e.target.value === 'trifasico'
                                            } as any)}
                                        >
                                            <option value="monofasico">1~ Monofásico (220V)</option>
                                            <option value="trifasico">3~ Trifásico (380V)</option>
                                        </select>
                                    </div>
                                )}

                                <div className={`${config.voltage === '380V' ? 'col-span-3 md:col-span-2' : 'col-span-3 md:col-span-3'}`}>
                                    <input type="number" placeholder="VA" className="w-full text-sm p-2 border-2 border-purple-50 rounded-lg text-center font-bold" value={tempLoad.value} onChange={e => setTempLoad({ ...tempLoad, value: e.target.value })} />
                                </div>
                                <div className="col-span-2 md:col-span-2">
                                    <input
                                        type="number"
                                        placeholder="Bocas"
                                        className={`w-full text-sm p-2 border-2 rounded-lg text-center font-bold ${tempLoad.type === 'ACU' || tempLoad.type === 'AVP' ? 'border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-purple-50'}`}
                                        value={tempLoad.type === 'ACU' || tempLoad.type === 'AVP' ? 1 : ((tempLoad as any).bocas || '')}
                                        onChange={e => setTempLoad({ ...tempLoad, bocas: parseInt(e.target.value) || undefined } as any)}
                                        disabled={tempLoad.type === 'ACU' || tempLoad.type === 'AVP'}
                                        title={tempLoad.type === 'ACU' || tempLoad.type === 'AVP' ? 'ACU y AVP siempre son 1 boca (circuito individual)' : 'Cantidad de bocas para este circuito especial'}
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block text-[8px] font-bold text-purple-600 mb-1 uppercase">Descripción (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder={`Ej: ${tempLoad.type} Cocina, ${tempLoad.type} Principal, etc.`}
                                        className="w-full text-sm p-2 border-2 border-purple-50 rounded-lg font-medium"
                                        value={(tempLoad as any).description || ''}
                                        onChange={e => setTempLoad({ ...tempLoad, description: e.target.value } as any)}
                                    />
                                </div>
                                {/* 🆕 Selector de Naturaleza - Solo visible en modificación/existente/provisoria */}
                                {showNatureInputs && (
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-[8px] font-bold text-purple-600 mb-1 uppercase">Naturaleza</label>
                                        <div className="flex bg-purple-50 p-0.5 rounded-lg border-2 border-purple-100">
                                            <button
                                                onClick={() => setTempLoad({ ...tempLoad, nature: 'relevado' } as any)}
                                                className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${(tempLoad as any).nature === 'relevado'
                                                    ? 'bg-white text-purple-700 shadow-sm'
                                                    : 'text-purple-400 hover:text-purple-600'
                                                    }`}
                                            >
                                                EXIST.
                                            </button>
                                            <button
                                                onClick={() => setTempLoad({ ...tempLoad, nature: 'proyectado' } as any)}
                                                className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${(tempLoad as any).nature !== 'relevado'
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : 'text-purple-400 hover:text-purple-600'
                                                    }`}
                                            >
                                                PROY.
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (!tempLoad.value) return;
                                        const bocas = tempLoad.type === 'ACU' || tempLoad.type === 'AVP' ? 1 : ((tempLoad as any).bocas || undefined);
                                        const load = {
                                            id: Math.random().toString(36).substr(2, 9),
                                            name: (tempLoad as any).description || tempLoad.type,
                                            type: tempLoad.type as any,
                                            value: parseFloat(tempLoad.value),
                                            unit: 'VA' as any,
                                            bocas,
                                            isThreePhase: (tempLoad as any).isThreePhase || false,
                                            nature: (tempLoad as any).nature || 'proyectado' // 🆕 Naturaleza
                                        };
                                        setNewEnv({ ...newEnv, specialLoads: [...(newEnv.specialLoads || []), load] });
                                        setTempLoad({ ...tempLoad, value: '', bocas: undefined, description: '', nature: 'proyectado' } as any);
                                    }}
                                    className="col-span-12 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-purple-700 transition-all active:scale-95 py-2 mt-2"
                                >
                                    + Agregar Carga Especial
                                </button>
                            </div>
                            <p className="text-[9px] text-purple-600 mt-2 italic">
                                💡 <strong>Bocas:</strong> ACU siempre es 1 boca (circuito individual). APM, MBTF se agruparán hasta el máximo permitido.
                            </p>

                            {/* Lista de Cargas ya agregadas al ambiente actual */}
                            {newEnv.specialLoads && newEnv.specialLoads.length > 0 && (
                                <div className="mt-4 space-y-2 border-t border-purple-50 pt-3">
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest pl-1">Cargas Agregadas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {newEnv.specialLoads.map((load: any) => (
                                            <div key={load.id} className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 group animate-in zoom-in duration-300">
                                                <span className="text-[11px] font-bold text-purple-700">
                                                    {load.type}: {load.value}{load.unit} {load.bocas ? `(${load.bocas} bocas)` : ''}
                                                </span>
                                                <button
                                                    onClick={() => setNewEnv({ ...newEnv, specialLoads: newEnv.specialLoads?.filter((l: any) => l.id !== load.id) })}
                                                    className="text-purple-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECCIÓN DE DIAGNÓSTICO Y NOTAS (UNIFICADA) - Solo para Instalaciones Existentes */}
                    {(modoSimplificado || config.projectType === 'existente') && (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-5 mt-6">
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                📋 Relevamiento Técnico y Diagnóstico
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">Protección Existente</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border-2 border-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none font-medium shadow-inner"
                                        placeholder="Ej: C16, Térmica 20A"
                                        value={newEnv.breakerInfo || ''}
                                        onChange={e => setNewEnv({ ...newEnv, breakerInfo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">Conductor Existente</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border-2 border-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none font-medium shadow-inner"
                                        placeholder="Ej: 2.5mm² PVC"
                                        value={newEnv.cableInfo || ''}
                                        onChange={e => setNewEnv({ ...newEnv, cableInfo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-6 py-2 border-y border-slate-100">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600 transition-all shadow-sm"
                                            checked={newEnv.hasPAT || false}
                                            onChange={e => setNewEnv({ ...newEnv, hasPAT: e.target.checked })}
                                        />
                                        <CheckCircle className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none transition-opacity" />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-700 uppercase tracking-tighter">¿Tiene Puesta a Tierra?</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-slate-300 bg-white checked:border-green-600 checked:bg-green-600 transition-all shadow-sm"
                                            checked={newEnv.hasPE || false}
                                            onChange={e => setNewEnv({ ...newEnv, hasPE: e.target.checked })}
                                        />
                                        <CheckCircle className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none transition-opacity" />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-green-700 uppercase tracking-tighter">¿Tiene cable de protección?</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Observaciones Técnicas / Diagnóstico Escrito</label>
                                <textarea
                                    className="w-full p-4 border-2 border-slate-50 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-sm font-medium transition-all min-h-[140px] resize-none shadow-inner"
                                    placeholder="Describa irregularidades, estados de cajas, continuidad, etc."
                                    value={newEnv.observacionesTecnicas || ''}
                                    onChange={e => setNewEnv({ ...newEnv, observacionesTecnicas: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                        <button onClick={resetForm} className="px-6 py-2 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Cancelar</button>
                        <button onClick={saveEnvironment} className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 hover:shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest text-sm">
                            {editingId ? 'Actualizar Ambiente' : 'Guardar y Agregar'}
                        </button>
                    </div>
                </div>
            )
            }

            <div className="grid md:grid-cols-2 gap-4">
                {environments.map((env: any) => (
                    <div key={env.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition group border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Home className="w-4 h-4 text-slate-400" />{env.customName || env.name}</h4>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Tablero: {config.panels.find((p: any) => p.id === env.panelId)?.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setNewEnv(env); setEditingId(env.id); setIsAdding(true); }} className="text-slate-400 hover:text-blue-600 p-1 bg-slate-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => onUpdateEnvironments(environments.filter((e: any) => e.id !== env.id))} className="text-slate-400 hover:text-red-500 p-1 bg-slate-50 rounded green"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {/* Etiquetas condicionales según tipo de proyecto */}
                            {(modoSimplificado || config.projectType === 'existente') ? (
                                // Modo Instalación Existente: Mostrar bocasLuz y bocasTomas
                                <>
                                    {(env.bocasLuz || 0) > 0 && (
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold text-amber-700 border border-amber-100">
                                            <Lightbulb className="w-3 h-3" /> Luz: {env.bocasLuz}
                                        </div>
                                    )}
                                    {(env.bocasTomas || 0) > 0 && (
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
                                            <Plug className="w-3 h-3" /> Tomas: {env.bocasTomas}
                                        </div>
                                    )}
                                    {(env.cargasEspeciales || 0) > 0 && (
                                        <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded text-[10px] font-bold text-purple-700 border border-purple-100">
                                            <Zap className="w-3 h-3" /> {env.cargasEspeciales} VA
                                        </div>
                                    )}
                                    {env.assignedIugCircuit && (
                                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-700 border border-slate-200 uppercase mt-1">
                                            <LayoutGrid className="w-3 h-3" /> Circuito: {env.assignedIugCircuit}
                                        </div>
                                    )}
                                </>
                            ) : (
                                // Modo Instalación Nueva: Mostrar lights y regularOutlets con circuitos asignados
                                <>
                                    {(env.bocasLuzRelevado > 0 || env.bocasLuzProyectado > 0 || env.lights > 0) && (
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold text-amber-700 border border-amber-100">
                                            IUG: {(env.bocasLuzRelevado || 0) + (env.bocasLuzProyectado || 0) || (env.lights || 0)}
                                            {(env.bocasLuzRelevado > 0 || env.bocasLuzProyectado > 0) && (
                                                <span className="opacity-60 text-[8px] ml-1">
                                                    ({env.bocasLuzRelevado || 0}R + {env.bocasLuzProyectado || 0}P)
                                                </span>
                                            )}
                                            <span className="ml-1 opacity-40">({env.assignedIugCircuit || 'IUG-1'})</span>
                                        </div>
                                    )}
                                    {(env.bocasTomasRelevado > 0 || env.bocasTomasProyectado > 0 || env.regularOutlets > 0) && (
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
                                            TUG: {(env.bocasTomasRelevado || 0) + (env.bocasTomasProyectado || 0) || (env.regularOutlets || 0)}
                                            {(env.bocasTomasRelevado > 0 || env.bocasTomasProyectado > 0) && (
                                                <span className="opacity-60 text-[8px] ml-1">
                                                    ({env.bocasTomasRelevado || 0}R + {env.bocasTomasProyectado || 0}P)
                                                </span>
                                            )}
                                            <span className="ml-1 opacity-40">({env.assignedTugCircuit || 'TUG-1'})</span>
                                        </div>
                                    )}
                                    {env.specialLoads?.map((load: any) => (
                                        <div key={load.id} className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded text-[10px] font-bold text-purple-700 border border-purple-100">
                                            {load.nature === 'relevado' && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded mr-1">R</span>}
                                            {load.name}: {load.value} {load.unit} {load.bocas ? `(${load.bocas} b)` : ''}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 📊 TABLA DE DISTRIBUCIÓN DE CIRCUITOS (HABILITADA PARA AMBOS MODOS) */}
            {environments.length > 0 && (
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mt-6 shadow-lg">
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" />
                        Distribución de Bocas por Circuito
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="p-2 text-left border font-bold text-slate-700">Ambiente</th>
                                    {/* Columnas IUG (o Circuitos de Grupo en modoExistente) */}
                                    {modoSimplificado ? (
                                        (circuitsNeeded as any).customIds.map((id: string) => (
                                            <th key={id} className="p-2 text-center border bg-slate-100 font-bold text-slate-700 uppercase">
                                                <LayoutGrid className="w-3 h-3 inline mr-1" /> {id}
                                            </th>
                                        ))
                                    ) : (
                                        <>
                                            {Array.from({ length: circuitsNeeded.iug }, (_, i) => (
                                                <th key={`iug-${i}`} className="p-2 text-center border bg-yellow-50 font-bold text-yellow-700">
                                                    💡 IUG-{i + 1}
                                                </th>
                                            ))}
                                            {Array.from({ length: circuitsNeeded.tug }, (_, i) => (
                                                <th key={`tug-${i}`} className="p-2 text-center border bg-blue-50 font-bold text-blue-700">
                                                    🔌 TUG-{i + 1}
                                                </th>
                                            ))}
                                        </>
                                    )}
                                    {/* Columnas Circuitos Especiales */}
                                    {specialCircuits.map(circuit => {
                                        const type = circuit.split('-')[0];
                                        const icon = type === 'ACU' ? '⚡' : type === 'TUE' ? '🔋' : type === 'IUE' ? '💫' : '⚙️';
                                        const bgColor = type === 'ACU' ? 'bg-purple-50' : type === 'TUE' ? 'bg-pink-50' : type === 'IUE' ? 'bg-indigo-50' : 'bg-gray-50';
                                        const textColor = type === 'ACU' ? 'text-purple-700' : type === 'TUE' ? 'text-pink-700' : type === 'IUE' ? 'text-indigo-700' : 'text-gray-700';
                                        return (
                                            <th key={circuit} className={`p-2 text-center border ${bgColor} font-bold ${textColor} text-[10px]`}>
                                                {icon} {circuit}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {environments.map(env => (
                                    <tr key={env.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2 border font-medium text-slate-700">
                                            {env.customName || env.name}
                                        </td>

                                        {/* Celdas IUG / Grupos Dinámicos */}
                                        {modoSimplificado ? (
                                            (circuitsNeeded as any).customIds.map((id: string) => {
                                                const bocas = circuitDistribution[env.id]?.[id] || 0;
                                                return (
                                                    <td key={id} className="p-2 text-center border bg-slate-50/30">
                                                        {bocas > 0 ? (
                                                            <span className="font-bold text-slate-700">{bocas}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        ) : (
                                            <>
                                                {Array.from({ length: circuitsNeeded.iug }, (_, i) => {
                                                    const circuit = `IUG-${i + 1}`;
                                                    const bocas = circuitDistribution[env.id]?.[circuit] || 0;
                                                    return (
                                                        <td key={circuit} className="p-2 text-center border bg-yellow-50/30">
                                                            {bocas > 0 ? (
                                                                <span className="font-bold text-yellow-700">{bocas}</span>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {Array.from({ length: circuitsNeeded.tug }, (_, i) => {
                                                    const circuit = `TUG-${i + 1}`;
                                                    const bocas = circuitDistribution[env.id]?.[circuit] || 0;
                                                    return (
                                                        <td key={circuit} className="p-2 text-center border bg-blue-50/30">
                                                            {bocas > 0 ? (
                                                                <span className="font-bold text-blue-700">{bocas}</span>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* Celdas Circuitos Especiales */}
                                        {specialCircuits.map(circuit => {
                                            const bocas = circuitDistribution[env.id]?.[circuit] || 0;
                                            const type = circuit.split('-')[0];
                                            const bgColor = type === 'ACU' ? 'bg-purple-50/30' : type === 'TUE' ? 'bg-pink-50/30' : type === 'IUE' ? 'bg-indigo-50/30' : 'bg-gray-50/30';
                                            const textColor = type === 'ACU' ? 'text-purple-700' : type === 'TUE' ? 'text-pink-700' : type === 'IUE' ? 'text-indigo-700' : 'text-gray-700';

                                            // Buscar el nombre de la carga especial
                                            const load = env.specialLoads?.find((l: any) => {
                                                const loadCircuit = `${l.type}-${env.id.substring(0, 4)}-${env.specialLoads.indexOf(l) + 1}`;
                                                return loadCircuit === circuit;
                                            });
                                            const loadName = load?.name || '';

                                            return (
                                                <td key={circuit} className={`p-2 text-center border ${bgColor}`}>
                                                    {bocas > 0 ? (
                                                        <span className={`font-bold ${textColor} text-[10px]`}>
                                                            {bocas}{loadName && loadName !== type ? ` - ${loadName}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                                {/* Fila de Totales */}
                                <tr className="bg-slate-800 text-white font-bold">
                                    <td className="p-2 border">📊 TOTAL BOCAS</td>
                                    {Object.keys(circuitTotals).map(circuit => (
                                        <td key={circuit} className="p-2 text-center border">
                                            {circuitTotals[circuit]}
                                        </td>
                                    ))}
                                    {specialCircuits.map(circuit => {
                                        const total = Object.values(circuitDistribution).reduce((sum, envDist) => sum + (envDist[circuit] || 0), 0);
                                        return (
                                            <td key={circuit} className="p-2 text-center border">
                                                {total}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Fila de Límites */}
                                <tr className="bg-slate-100 text-slate-600 text-[10px]">
                                    <td className="p-2 border font-bold">⚠️ LÍMITE</td>
                                    {Object.keys(circuitTotals).map(circuit => (
                                        <td key={circuit} className="p-2 text-center border">
                                            15
                                        </td>
                                    ))}
                                    {specialCircuits.map(circuit => {
                                        const type = circuit.split('-')[0];
                                        const limit = type === 'ACU' ? 1 : (type === 'TUE' || type === 'IUE') ? 12 : 15;
                                        return (
                                            <td key={circuit} className="p-2 text-center border">
                                                {limit}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Fila de Porcentaje de Carga */}
                                <tr className="bg-slate-50 text-[10px]">
                                    <td className="p-2 border font-bold text-slate-700">📈 CARGA %</td>
                                    {Object.entries(circuitTotals).map(([circuit, total]) => {
                                        const percentage = Math.round((total / 15) * 100);
                                        const color = percentage > 100 ? 'text-red-600 font-bold' :
                                            percentage > 80 ? 'text-amber-600 font-bold' :
                                                'text-green-600';
                                        return (
                                            <td key={circuit} className={`p-2 text-center border ${color}`}>
                                                {percentage}%
                                            </td>
                                        );
                                    })}
                                    {specialCircuits.map(circuit => {
                                        const total = Object.values(circuitDistribution).reduce((sum, envDist) => sum + (envDist[circuit] || 0), 0);
                                        const type = circuit.split('-')[0];
                                        const limit = type === 'ACU' ? 1 : (type === 'TUE' || type === 'IUE') ? 12 : 15;
                                        const percentage = Math.round((total / limit) * 100);
                                        const color = percentage > 100 ? 'text-red-600 font-bold' :
                                            percentage > 80 ? 'text-amber-600 font-bold' :
                                                'text-green-600';
                                        return (
                                            <td key={circuit} className={`p-2 text-center border ${color}`}>
                                                {percentage}%
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Advertencias */}
                    {Object.entries(circuitTotals).some(([_, total]) => total === 0) && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs font-bold text-amber-800 mb-1">⚠️ CIRCUITOS SIN USO:</p>
                            <ul className="text-xs text-amber-700 list-disc list-inside">
                                {Object.entries(circuitTotals)
                                    .filter(([_, total]) => total === 0)
                                    .map(([circuit]) => (
                                        <li key={circuit}>{circuit} no tiene bocas asignadas</li>
                                    ))}
                            </ul>
                            <p className="text-xs text-amber-600 mt-2 italic">
                                {modoSimplificado
                                    ? 'Estos circuitos han sido definidos en el relevamiento pero no contienen bocas.'
                                    : `Estos circuitos son requeridos por el grado de electrificación (${currentGrade}) pero no tienen carga asignada.`}
                            </p>
                        </div>
                    )}

                    {/* Circuitos sobrecargados */}
                    {Object.entries(circuitTotals).some(([_, total]) => total > 15) && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs font-bold text-red-800 mb-1">🚨 CIRCUITOS SOBRECARGADOS:</p>
                            <ul className="text-xs text-red-700 list-disc list-inside">
                                {Object.entries(circuitTotals)
                                    .filter(([_, total]) => total > 15)
                                    .map(([circuit, total]) => (
                                        <li key={circuit}>
                                            {circuit} tiene {total} bocas (límite: 15 según AEA 770.6.6)
                                        </li>
                                    ))}
                            </ul>
                            <p className="text-xs text-red-600 mt-2 font-bold">
                                ⚠️ Debe redistribuir las bocas entre los circuitos disponibles.
                            </p>
                        </div>
                    )}

                    {/* Resumen de circuitos */}
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="font-bold text-blue-800 mb-1">Circuitos Mínimos (Grado {currentGrade}):</p>
                                <p className="text-blue-700">
                                    {minCircuits.iug} IUG + {minCircuits.tug} TUG{minCircuits.libre > 0 ? ` + ${minCircuits.libre} Libre` : ''} = {minCircuits.iug + minCircuits.tug + minCircuits.libre} circuitos
                                </p>
                            </div>
                            <div>
                                <p className="font-bold text-blue-800 mb-1">Circuitos Calculados (según bocas):</p>
                                <p className="text-blue-700">
                                    {modoSimplificado
                                        ? `${(circuitsNeeded as any).customIds.length} Relevados`
                                        : `${circuitsNeeded.iug} IUG + ${circuitsNeeded.tug} TUG`
                                    }
                                    {specialCircuits.length > 0 ? ` + ${specialCircuits.length} Especiales` : ''}
                                    = {(modoSimplificado ? (circuitsNeeded as any).customIds.length : (circuitsNeeded.iug + circuitsNeeded.tug)) + specialCircuits.length} circuitos
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t">
                <button onClick={onBack} className="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors">Atrás</button>
                <button onClick={onNext} disabled={environments.length === 0} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${environments.length > 0 ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-slate-300 cursor-not-allowed'}`}>
                    Continuar a Tableros
                </button>
            </div>
        </div >
    );
}