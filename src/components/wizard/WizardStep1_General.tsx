import { User, Zap, Ruler, ShieldCheck, AlertTriangle, Home, Briefcase, Factory, FilePlus, FileSearch, FileEdit } from 'lucide-react';
import { ProjectConfig, getAcometidaTypes, AcometidaType, getPropertyDestinations } from '../../lib/electrical-rules';
import { useMemo } from 'react';


interface Step1Props {
    config: ProjectConfig;
    onChange: (config: ProjectConfig) => void;
    onNext: () => void;
    onResetEnvironments?: () => void;
}

export default function WizardStep1_General({ config, onChange, onNext, onResetEnvironments }: Step1Props) {

    // Detectar modo Flash
    const isFlashMode = sessionStorage.getItem('projectType') === 'flash';

    // 🆕 Determinar si se deben mostrar selectores de naturaleza
    // Solo se muestran en modificación, existente o provisoria (NO en obra nueva)
    const showNatureSelectors = useMemo(() => {
        return ['modificacion', 'existente', 'provisoria'].includes(config.estadoObra || '');
    }, [config.estadoObra]);

    const handleChange = (field: keyof ProjectConfig, value: any) => {
        let newConfig = { ...config, [field]: value };

        // Sincronizar estadoObra con projectType (Legacy compatibility)
        if (field === 'estadoObra') {
            newConfig.projectType = value === 'modificacion' ? 'nueva' : value;
        }

        // Sincronizar regimenUso con destination (Legacy compatibility)
        if (field === 'regimenUso') {
            if (value === 'habitacional') newConfig.destination = 'vivienda';
            if (value === 'comercial') newConfig.destination = 'comercio';
            if (value === 'industrial') newConfig.destination = 'industria';

            // Si cambia el régimen, reseteamos ambientes
            if (value !== config.regimenUso && onResetEnvironments) {
                onResetEnvironments();
            }
        }

        onChange(newConfig);
    };

    const handleOwnerDetailChange = (field: keyof typeof config.ownerDetail, value: string) => {
        onChange({
            ...config,
            ownerDetail: {
                ...config.ownerDetail,
                [field]: value
            }
        });
    };

    // Validación actualizada para nuevos campos desglosados
    // Modo Flash: solo requiere datos mínimos para carátula
    const isComplete = isFlashMode
        ? // Validación simplificada para Flash
        config.clientName &&
        config.ownerDetail.street &&
        config.ownerDetail.number &&
        config.ownerDetail.city &&
        config.ownerDetail.province &&
        config.regimenUso &&
        config.destination
        : // Validación completa para modo normal
        config.clientName &&
        config.ownerDetail.dniCuit &&
        config.ownerDetail.street &&
        config.ownerDetail.number &&
        config.ownerDetail.city &&
        config.regimenUso &&
        config.destination &&
        config.estadoObra &&
        config.voltage &&
        (config.surfaceArea > 0);


    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-10">

            {/* 1. Datos del Titular */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 h-5 text-blue-600" />
                    Datos del Titular / Ubicación (ERSeP)
                </h3>

                <div className="grid md:grid-cols-12 gap-5">
                    <div className="md:col-span-12 lg:col-span-8">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo / Razón Social *</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.clientName}
                            onChange={(e) => handleChange('clientName', e.target.value)}
                            placeholder="Ej: Juan Perez / Empresa S.A."
                        />
                    </div>
                    <div className="md:col-span-12 lg:col-span-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            DNI / CUIT {isFlashMode ? '(opcional)' : '*'}
                        </label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.ownerDetail.dniCuit}
                            onChange={(e) => handleOwnerDetailChange('dniCuit', e.target.value)}
                            placeholder="Ej: 20-12345678-9"
                        />
                    </div>

                    <div className="md:col-span-12 lg:col-span-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Calle / Bv. *</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.ownerDetail.street}
                            onChange={(e) => handleOwnerDetailChange('street', e.target.value)}
                            placeholder="Ej: Av. Colon"
                        />
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nº *</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.ownerDetail.number}
                            onChange={(e) => handleOwnerDetailChange('number', e.target.value)}
                            placeholder="1234"
                        />
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Piso / Depto</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="w-1/2 p-2.5 border border-slate-300 rounded-lg outline-none"
                                value={config.ownerDetail.floor || ''}
                                onChange={(e) => handleOwnerDetailChange('floor', e.target.value)}
                                placeholder="P"
                            />
                            <input
                                type="text"
                                className="w-1/2 p-2.5 border border-slate-300 rounded-lg outline-none"
                                value={config.ownerDetail.apartment || ''}
                                onChange={(e) => handleOwnerDetailChange('apartment', e.target.value)}
                                placeholder="D"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Localidad *</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.ownerDetail.city}
                            onChange={(e) => handleOwnerDetailChange('city', e.target.value)}
                            placeholder="Ej: Córdoba"
                        />
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provincia *</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={config.ownerDetail.province || ''}
                            onChange={(e) => handleOwnerDetailChange('province', e.target.value)}
                            placeholder="Ej: Córdoba"
                        />
                    </div>
                </div>
            </div>

            {/* 2. NIVEL 1: Régimen de Uso */}
            <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 sm:w-6 h-6 text-green-600" />
                    ¿Cuál es el Régimen de Uso?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { id: 'habitacional', label: 'Habitacional', icon: Home, desc: 'Viviendas, Deptos, PH', color: 'blue' },
                        { id: 'comercial', label: 'Comercial', icon: Briefcase, desc: 'Locales, Oficinas', color: 'emerald' },
                        { id: 'industrial', label: 'Industrial', icon: Factory, desc: 'Talleres, Fábricas', color: 'indigo' },
                    ].map((item) => {
                        const colors = {
                            blue: config.regimenUso === item.id ? 'border-blue-500 bg-blue-50 ring-blue-500/10' : '',
                            emerald: config.regimenUso === item.id ? 'border-emerald-500 bg-emerald-50 ring-emerald-500/10' : '',
                            indigo: config.regimenUso === item.id ? 'border-indigo-500 bg-indigo-50 ring-indigo-500/10' : ''
                        };
                        const iconColors = {
                            blue: config.regimenUso === item.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                            emerald: config.regimenUso === item.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                            indigo: config.regimenUso === item.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        };
                        const textColors = {
                            blue: config.regimenUso === item.id ? 'text-blue-900' : 'text-slate-700',
                            emerald: config.regimenUso === item.id ? 'text-emerald-900' : 'text-slate-700',
                            indigo: config.regimenUso === item.id ? 'text-indigo-900' : 'text-slate-700'
                        };
                        const checkColors = {
                            blue: 'bg-blue-500',
                            emerald: 'bg-emerald-500',
                            indigo: 'bg-indigo-500'
                        };

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleChange('regimenUso', item.id)}
                                className={`relative p-4 sm:p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${config.regimenUso === item.id
                                    ? `shadow-md ring-4 ${colors[item.color as keyof typeof colors]}`
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${iconColors[item.color as keyof typeof iconColors]}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h4 className={`text-lg font-bold ${textColors[item.color as keyof typeof textColors]}`}>{item.label}</h4>
                                <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                                {config.regimenUso === item.id && (
                                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${checkColors[item.color as keyof typeof checkColors]}`}>
                                        <ShieldCheck className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 2.5. NIVEL 1.5: Destino Específico del Inmueble (Condicional) */}
                {config.regimenUso && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Home className="w-5 h-5 sm:w-6 h-6 text-blue-600" />
                            ¿Cuál es el Destino Específico?
                        </h3>

                        {getPropertyDestinations().length === 0 ? (
                            <div className="p-4 bg-slate-100 rounded-lg text-slate-500 text-sm">
                                Cargando destinos... (Si esto persiste, verifique la carga de CSVs)
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {getPropertyDestinations()
                                    .filter(dest => {
                                        // Filtrar por categoría según régimen
                                        if (config.regimenUso === 'habitacional') return dest.categoria === 'Residencial' || dest.categoria === 'Temporal';
                                        if (config.regimenUso === 'comercial') return dest.categoria === 'Comercial' || dest.categoria === 'Especial';
                                        if (config.regimenUso === 'industrial') return dest.categoria === 'Industrial' || dest.categoria === 'Especial';
                                        return false;
                                    })
                                    .map((dest) => {
                                        const isSelected = config.destination === dest.codigo_destino;
                                        const requiresCat12 = dest.requiere_categoria_profesional === '1' || dest.requiere_categoria_profesional === '2';

                                        return (
                                            <button
                                                key={dest.codigo_destino}
                                                onClick={() => handleChange('destination', dest.codigo_destino)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-md'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                                        {dest.nombre_destino}
                                                    </h4>
                                                    {isSelected && (
                                                        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 mb-2">{dest.descripcion}</p>

                                                {/* Badges informativos */}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${requiresCat12
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {requiresCat12 ? '⚠️ Cat I/II' : '✓ Cat III OK'}
                                                    </span>
                                                    {dest.max_potencia_cat3_kw && dest.max_potencia_cat3_kw < 999 && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                            Max: {dest.max_potencia_cat3_kw}kW
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Observaciones importantes */}
                                                {dest.observaciones && (
                                                    <p className="text-[10px] text-amber-700 mt-2 italic bg-amber-50 p-2 rounded border-l-2 border-amber-400">
                                                        {dest.observaciones}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. NIVEL 2: Estado de la Obra (Condicional) */}
            {config.regimenUso && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 sm:w-6 h-6 text-amber-500" />
                        ¿Cuál es el Estado de la Obra? {isFlashMode && <span className="text-sm font-normal text-slate-500">(opcional)</span>}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { id: 'nueva', label: 'Obra Nueva', icon: FilePlus, desc: 'Proyecto desde cero', color: 'blue' },
                            { id: 'existente', label: 'Existente', icon: FileSearch, desc: 'Instalación previa', color: 'amber' },
                            { id: 'modificacion', label: 'Modificación', icon: FileEdit, desc: 'Ampliación/Refacción', color: 'indigo' },
                            { id: 'provisoria', label: 'Transitorio', icon: Zap, desc: 'Luz de Obra / Evento', color: 'orange' },
                        ].map((item) => {
                            const borderColors = {
                                blue: config.estadoObra === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
                                amber: config.estadoObra === item.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300',
                                indigo: config.estadoObra === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300',
                                orange: config.estadoObra === item.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
                            };
                            const iconColors = {
                                blue: config.estadoObra === item.id ? 'text-blue-600' : 'text-slate-400',
                                amber: config.estadoObra === item.id ? 'text-amber-600' : 'text-slate-400',
                                indigo: config.estadoObra === item.id ? 'text-indigo-600' : 'text-slate-400',
                                orange: config.estadoObra === item.id ? 'text-orange-600' : 'text-slate-400'
                            };

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleChange('estadoObra', item.id)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${borderColors[item.color as keyof typeof borderColors]} shadow-sm`}
                                >
                                    <item.icon className={`w-8 h-8 mx-auto mb-2 ${iconColors[item.color as keyof typeof iconColors]}`} />
                                    <h4 className="font-bold text-slate-800">{item.label}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* AVISO LEGAL Y CONFIGURACIÓN SEGÚN SELECCIÓN */}
                    {config.estadoObra === 'existente' && (
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg animate-in fade-in duration-500">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-amber-800">Régimen Especial: Resolución 54/2018</h4>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Esta opción es exclusiva para <strong>Regularización de instalaciones construidas antes del 01/12/2017</strong>.
                                    </p>
                                    <p className="text-xs text-amber-600 mt-2 italic">
                                        Se habilitará el motor de cálculo simplificado y el checklist de seguridad obligatorio.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {config.estadoObra === 'modificacion' && (
                        <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg animate-in fade-in duration-500">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-indigo-800">Normativa AEA Vigente</h4>
                                    <p className="text-sm text-indigo-700 mt-1">
                                        Toda ampliación o modificación debe cumplir estrictamente con los PMU y requisitos de la <strong>AEA 90364-7-770/771</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {config.estadoObra === 'provisoria' && (
                        <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg animate-in fade-in duration-500">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-orange-800">Suministro Transitorio / AVP</h4>
                                    <p className="text-sm text-orange-700 mt-1">
                                        ⚠️ <strong>Certificación válida por 12 meses.</strong> Límite de potencia: <strong>10 kW</strong> (Categoría III).
                                    </p>
                                    <p className="text-xs text-orange-600 mt-2 italic">
                                        Se permite la instalación de un tablero de obra con 1 circuito de iluminación y hasta 3 tomacorrientes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 4. DATOS TÉCNICOS INICIALES (Voltage y Superficie) */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Ruler className="w-4 h-4 sm:w-5 h-5 text-blue-600" />
                    Datos Técnicos Iniciales
                </h3>

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Acometida / Tensión */}
                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Tipo de Acometida (Tensión y Método) {isFlashMode ? '(opcional)' : '*'}
                        </label>

                        {getAcometidaTypes().length === 0 ? (
                            <div className="p-4 bg-slate-100 rounded-lg text-slate-500 text-sm">
                                Cargando tipos de acometida... (Si esto persiste, verifique la carga de CSVs)
                            </div>
                        ) : (
                            <select
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                value={config.acometida?.tipo || ''}
                                onChange={(e) => {
                                    const selectedType = getAcometidaTypes().find(t => t.codigo === e.target.value);
                                    if (selectedType) {
                                        const isTri = selectedType.codigo.includes('TRI');
                                        const newVoltage = isTri ? '380V' : '220V';

                                        // Sincronizar voltage en todos los tableros (especialmente TP)
                                        const updatedPanels = (config.panels || []).map(p => ({
                                            ...p,
                                            voltage: newVoltage,
                                            // Si es trifásico, fase podría ser RST, si es mono, R (default)
                                            phase: isTri ? 'RST' : (p.phase === 'RST' ? 'R' : p.phase)
                                        }));

                                        onChange({
                                            ...config,
                                            voltage: newVoltage,
                                            panels: updatedPanels,
                                            acometida: {
                                                ...config.acometida,
                                                tipo: selectedType.codigo,
                                                material: selectedType.material as 'Cu' | 'Al' || 'Cu',
                                                observaciones: selectedType.observaciones,
                                                longitud: config.acometida?.longitud || 0
                                            }
                                        });
                                    }
                                }}
                            >
                                <option value="">-- Seleccione un tipo de acometida --</option>
                                {getAcometidaTypes().map((type) => {
                                    const isTri = type.codigo.includes('TRI');
                                    const prefix = isTri ? '⚡ 3~ Trifásica' : '⚡ 1~ Monofásica';
                                    return (
                                        <option key={type.codigo} value={type.codigo}>
                                            {prefix} - {type.descripcion} ({type.metodo_instalacion})
                                        </option>
                                    );
                                })}
                            </select>
                        )}

                        {/* Información adicional cuando hay selección */}
                        {config.acometida?.tipo && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-semibold">
                                            {getAcometidaTypes().find(t => t.codigo === config.acometida?.tipo)?.descripcion}
                                        </p>
                                        <p className="mt-1 text-blue-700">
                                            <strong>Método:</strong> {getAcometidaTypes().find(t => t.codigo === config.acometida?.tipo)?.metodo_instalacion} •
                                            <strong> Normativa:</strong> {getAcometidaTypes().find(t => t.codigo === config.acometida?.tipo)?.normativa}
                                        </p>
                                        {getAcometidaTypes().find(t => t.codigo === config.acometida?.tipo)?.observaciones && (
                                            <p className="mt-1 text-blue-600 italic">
                                                {getAcometidaTypes().find(t => t.codigo === config.acometida?.tipo)?.observaciones}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🆕 Selector de Naturaleza de Acometida - Solo visible en modificación/existente/provisoria */}
                        {config.acometida?.tipo && showNatureSelectors && (
                            <div className="mt-3 flex gap-2">
                                {(['proyectado', 'relevado'] as const).map((nat) => (
                                    <button
                                        key={nat}
                                        onClick={() => onChange({
                                            ...config,
                                            acometida: { ...config.acometida!, nature: nat }
                                        })}
                                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all ${config.acometida?.nature === nat
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}
                                    >
                                        {nat === 'proyectado' ? '🆕 PROYECTADA (A Instalar)' : '🔍 RELEVADA (Existente)'}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-slate-500 mt-2">
                            Seleccione el tipo exacto según ET-21 (EPEC) / AEA. Esto definirá la tensión (220V/380V).
                        </p>
                    </div>

                    {/* Checkbox: Incluye Certificación del Pilar */}
                    <div className="md:col-span-2">
                        <div className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                id="includesPillar"
                                className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                checked={config.includesPillar || false}
                                onChange={(e) => handleChange('includesPillar', e.target.checked)}
                            />
                            <label htmlFor="includesPillar" className="text-sm text-slate-700 cursor-pointer select-none flex-1">
                                <span className="font-bold text-slate-800 block mb-1">
                                    ✅ Incluye Certificación del Punto de Conexión (Pilar/TSG)
                                </span>
                                <span className="text-slate-600 text-xs block mb-2">
                                    Marcar si también se certificará la acometida/pilar en este expediente.
                                </span>
                                <span className="text-blue-700 text-xs block font-medium bg-blue-100 px-2 py-1 rounded inline-block">
                                    💡 Común en departamentos: La instalación comienza desde el TSG (Tablero Seccional General), omitiendo medidor y línea principal.
                                </span>

                                {/* 🆕 Selector de Naturaleza de Pilar - Solo visible en modificación/existente/provisoria */}
                                {config.includesPillar && showNatureSelectors && (
                                    <div className="mt-3 flex gap-2">
                                        {(['proyectado', 'relevado'] as const).map((nat) => (
                                            <button
                                                key={nat}
                                                onClick={() => onChange({
                                                    ...config,
                                                    pilar: { ...config.pilar!, nature: nat }
                                                })}
                                                className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-[10px] sm:text-xs font-bold transition-all ${config.pilar?.nature === nat
                                                    ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                {nat === 'proyectado' ? '🆕 PILAR NUEVO' : '🔍 PILAR EXISTENTE'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Superficie Estimada (SLA) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Superficie Total Estimada (m²) {isFlashMode ? '(opcional)' : '*'}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full p-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Ej: 85"
                                value={config.surfaceArea || ''}
                                onChange={(e) => handleChange('surfaceArea', Number(e.target.value))}
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">m²</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            SLA = Superficie Cubierta + 50% Semicubierta. Se ajustará con los ambientes.
                        </p>
                    </div>
                </div>
            </div>

            {/* 4. Aclaración del Inmueble (Para todos, una vez seleccionado el nivel 2) */}
            {config.estadoObra && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-500">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Aclaración del Tipo de Inmueble (Opcional)</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={config.aclaracionInmueble || ''}
                        onChange={(e) => handleChange('aclaracionInmueble', e.target.value)}
                        placeholder="Ej: Cabaña de madera, Carnicería, Taller mecánico, Departamento 1ºA..."
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        Esta información aparecerá en la Memoria Técnica para dar contexto a la instalación.
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 pb-8 sm:pb-4">
                <p className="text-sm text-slate-500 italic text-center sm:text-left">
                    * Campos obligatorios para avanzar.
                </p>
                <button
                    onClick={onNext}
                    disabled={!isComplete}
                    className={`w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-xl transition-all ${isComplete
                        ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    Siguiente: Configurar Tableros
                </button>
            </div>

        </div>
    );
}
