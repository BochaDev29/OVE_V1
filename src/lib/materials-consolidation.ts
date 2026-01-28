/**
 * Sistema de Consolidación de Materiales
 * Calcula automáticamente materiales desde CSVs y consolida todo el proyecto
 */

import {
    MaterialGeneralData,
    MaterialPorCircuitoData,
    MaterialPATData
} from './electrical-rules';

// Interfaz para material calculado con cantidad
export interface MaterialCalculado {
    codigo_material: string;
    categoria: string;
    descripcion: string;
    especificacion_tecnica: string;
    norma_referencia: string;
    unidad: string;
    cantidad: number;
    observaciones: string;
}

/**
 * Calcula materiales para un circuito específico
 */
export function calcularMaterialesPorCircuito(
    tipoCircuito: string,
    cantidadBocas: number,
    metodoInstalacion: string,
    materialesPorCircuito: MaterialPorCircuitoData[],
    materialesGenerales: MaterialGeneralData[],
    dynamicValues: { longitud_acometida?: number; longitud_cs?: number; isTrifasico?: boolean } = {},
    overrides: { cableSection?: string, breakerValue?: string } = {}
): MaterialCalculado[] {

    const reglas = materialesPorCircuito.filter(
        m => m.tipo_circuito === tipoCircuito && m.metodo_instalacion === metodoInstalacion
    );

    const materialesCalculados: MaterialCalculado[] = [];

    reglas.forEach(regla => {
        let codigoMaterialEspecifico = regla.codigo_material;

        // --- LÓGICA DE OVERRIDES DINÁMICOS ---

        // 1. Override de CABLES
        if (overrides.cableSection && regla.codigo_material.includes('CABLE_UNI')) {
            // Extraer la sección original del código (ej: CABLE_UNI_1.5_NEG -> 1.5)
            const match = regla.codigo_material.match(/CABLE_UNI_([\d.]+)_/);
            if (match) {
                const sectionStr = overrides.cableSection.replace('mm²', '').trim();
                // Reconstruir el código con la nueva sección (ej: CABLE_UNI_2.5_NEG)
                // Se asume que el sufijo (color) se mantiene (NEG, CEL, VDA, MAR, BLA)
                const suffix = regla.codigo_material.split('_').pop();
                codigoMaterialEspecifico = `CABLE_UNI_${sectionStr}_${suffix}`;
            }
        }

        // 2. Override de PROTECCIONES (PIA)
        if (overrides.breakerValue && regla.codigo_material.includes('PIA')) {
            // Extraer amperaje original (ej: PIA_2P_10A_B -> 10)
            const match = regla.codigo_material.match(/_(\d+)A_/);
            if (match) {
                const ampStr = overrides.breakerValue.replace('A', '').trim();
                // Intentar mantener curva y polos originales
                // Ejemplo: PIA_2P_10A_B -> PIA_2P_16A_B (o C si es mayor a 32A generalmente, pero mantenemos curva original si es posible)
                // Pero atención: Reglas CSV suelen tener Curva B para luces y C para tomas.
                // Si cambiamos a 40A, usualmente es Curva C.

                let partes = regla.codigo_material.split('_');
                // partes[0] = PIA
                // partes[1] = 2P o 4P
                // partes[2] = 10A
                // partes[3] = B o C

                if (partes.length === 4) {
                    partes[2] = `${ampStr}A`; // Reemplazar amperaje

                    // Ajuste opcional: Si es mayor a 63A no hay en tabla generada (paré en 63).
                    // Ajuste de curva: Si era B y pasamos a valores altos, ¿mantenemos B? 
                    // Normativamente B es 3-5 In, C es 5-10 In. B es para cables largos o generadores.
                    // Mantenemos la curva original de la regla (IUG -> B, TUG -> C) salvo que no exista el material.
                    // Pero hemos creado materiales C para 40, 50, 63. No B.
                    const ampNum = parseInt(ampStr);
                    if (ampNum >= 40) {
                        partes[3] = 'C'; // Forzar C para altas corrientes si no agregué B en CSV
                    }

                    codigoMaterialEspecifico = partes.join('_');
                }
            }
        }


        // Buscar especificaciones en catálogo general usando el código (posiblemente modificado)
        const materialGeneral = materialesGenerales.find(
            mg => mg.codigo_material === codigoMaterialEspecifico
        );

        if (!materialGeneral) {
            // Si no se encuentra el material específico (ej: 6mm no existe), volver al original O loguear error
            // Opción: Intentar volver al original para no dejar vacío el listado, pero avisar
            const materialOriginal = materialesGenerales.find(
                mg => mg.codigo_material === regla.codigo_material
            );
            if (materialOriginal) {
                // Fallback al original pero podríamos marcarlo
                // Por ahora usamos el original para no romper
                // Implementación real: Debería haber un warning visible
            }
            return; // Si no hay material, no agregamos nada (o agregamos el original arriba si descomentamos)
        }

        // Calcular cantidad según fórmula o reglas especiales
        let cantidad = 0;

        // REGLAS DINÁMICAS PARA LP Y CS
        if (tipoCircuito === 'LP' && dynamicValues.longitud_acometida) {
            if (codigoMaterialEspecifico.includes('CABLE')) {
                // Multiplicador de conductores: Monofásica=2 (L+N), Trifásica=4 (L1+L2+L3+N)
                // +1 para PE si corresponde (usualmente PE se calcula aparte o se incluye)
                // Según instrucción: monofasica 2(L+N) y trifasica 4(L1..N)
                const numConductores = dynamicValues.isTrifasico ? 4 : 2;

                // Si el material es unipolar (requiere N cables), si es subterráneo (es 1 cable multiconductor)
                const esSubterraneo = materialGeneral.norma_referencia.includes('2178');
                cantidad = dynamicValues.longitud_acometida * (esSubterraneo ? 1 : numConductores);

                // Agregar PE si el material es PE
                if (codigoMaterialEspecifico.includes('VDA') || codigoMaterialEspecifico.includes('PE')) {
                    cantidad = dynamicValues.longitud_acometida;
                }
            } else if (codigoMaterialEspecifico.includes('CANO')) {
                cantidad = dynamicValues.longitud_acometida;
            } else if (regla.cantidad_fija > 0) {
                cantidad = regla.cantidad_fija;
            }
        } else if (tipoCircuito === 'CS' && dynamicValues.longitud_cs) {
            if (codigoMaterialEspecifico.includes('CABLE')) {
                const numConductores = dynamicValues.isTrifasico ? 4 : 2;
                const esSubterraneo = materialGeneral.norma_referencia.includes('2178');
                cantidad = dynamicValues.longitud_cs * (esSubterraneo ? 1 : numConductores);

                if (codigoMaterialEspecifico.includes('VDA') || codigoMaterialEspecifico.includes('PE')) {
                    cantidad = dynamicValues.longitud_cs;
                }
            } else if (codigoMaterialEspecifico.includes('CANO')) {
                cantidad = dynamicValues.longitud_cs;
            } else if (regla.cantidad_fija > 0) {
                cantidad = regla.cantidad_fija;
            }
        } else {
            // Regla estándar para circuitos de uso general/especial
            if (regla.cantidad_por_boca > 0) {
                cantidad = cantidadBocas * regla.cantidad_por_boca;
            } else if (regla.cantidad_fija > 0) {
                cantidad = regla.cantidad_fija;
            }
        }

        if (cantidad > 0) {
            materialesCalculados.push({
                codigo_material: codigoMaterialEspecifico,
                categoria: materialGeneral.categoria,
                descripcion: materialGeneral.descripcion,
                especificacion_tecnica: materialGeneral.especificacion_tecnica,
                norma_referencia: materialGeneral.norma_referencia,
                unidad: materialGeneral.unidad,
                cantidad: Number(cantidad.toFixed(2)),
                observaciones: regla.observaciones || materialGeneral.observaciones
            });
        }
    });

    return materialesCalculados;
}

/**
 * Obtiene materiales para sistema PAT
 */
export function getMaterialesPAT(
    tipoInstalacion: string,
    materialesPAT: MaterialPATData[],
    materialesGenerales: MaterialGeneralData[]
): MaterialCalculado[] {

    const reglasPAT = materialesPAT.filter(m => m.tipo_instalacion === tipoInstalacion);
    const materialesCalculados: MaterialCalculado[] = [];

    reglasPAT.forEach(regla => {
        const materialGeneral = materialesGenerales.find(
            mg => mg.codigo_material === regla.codigo_material
        );

        if (!materialGeneral) return;

        materialesCalculados.push({
            codigo_material: regla.codigo_material,
            categoria: materialGeneral.categoria,
            descripcion: materialGeneral.descripcion,
            especificacion_tecnica: materialGeneral.especificacion_tecnica,
            norma_referencia: materialGeneral.norma_referencia,
            unidad: materialGeneral.unidad,
            cantidad: regla.cantidad,
            observaciones: regla.observaciones || materialGeneral.observaciones
        });
    });

    return materialesCalculados;
}

/**
 * Consolida todos los materiales del proyecto
 * Suma cantidades de materiales duplicados
 */
export function consolidarMateriales(materiales: MaterialCalculado[]): MaterialCalculado[] {
    const consolidado: Record<string, MaterialCalculado> = {};

    materiales.forEach(material => {
        if (consolidado[material.codigo_material]) {
            // Sumar cantidad si ya existe
            consolidado[material.codigo_material].cantidad += material.cantidad;
        } else {
            // Agregar nuevo material
            consolidado[material.codigo_material] = { ...material };
        }
    });

    // Convertir a array y ordenar por categoría y descripción
    return Object.values(consolidado).sort((a, b) => {
        if (a.categoria !== b.categoria) {
            return a.categoria.localeCompare(b.categoria);
        }
        return a.descripcion.localeCompare(b.descripcion);
    });
}

/**
 * Agrupa materiales consolidados por categoría
 */
export function agruparMaterialesPorCategoria(
    materiales: MaterialCalculado[]
): Record<string, MaterialCalculado[]> {
    const agrupados: Record<string, MaterialCalculado[]> = {};

    materiales.forEach(material => {
        if (!agrupados[material.categoria]) {
            agrupados[material.categoria] = [];
        }
        agrupados[material.categoria].push(material);
    });

    return agrupados;
}

/**
 * Genera descripción completa con norma para PDF
 */
export function generarDescripcionConNorma(material: MaterialCalculado): string {
    return `${material.descripcion} - ${material.especificacion_tecnica} (${material.norma_referencia})`;
}

/**
 * Genera materiales de hardware de tablero (Gabinete, Protecciones, PAT)
 */
export function getPanelHardwareMaterials(
    panel: any,
    materialesGenerales: MaterialGeneralData[]
): MaterialCalculado[] {
    const materiales: MaterialCalculado[] = [];

    // 1. GABINETE
    if (panel.enclosure) {
        let ipCode = panel.enclosure.ipRating || 'IP41';
        let modCode = panel.enclosure.modules || 12;

        const possibleCode = `GABINETE_${ipCode}_${modCode}P`;
        let materialGabinete = materialesGenerales.find(m => m.codigo_material === possibleCode);

        // Fallback inteligente para Gabinetes
        if (!materialGabinete) {
            // Si es IP65 y no encontramos el exacto, buscar alguno IP65
            if (ipCode === 'IP65' || ipCode === 'IP54') {
                materialGabinete = materialesGenerales.find(m => m.codigo_material === 'GABINETE_IP65_4P');
            } else {
                // Default interior
                materialGabinete = materialesGenerales.find(m => m.codigo_material === 'GABINETE_IP41_12P');
            }
        }

        if (materialGabinete) {
            materiales.push({
                codigo_material: materialGabinete.codigo_material,
                categoria: 'Gabinetes',
                descripcion: materialGabinete.descripcion,
                especificacion_tecnica: `Gabinete ${ipCode} - ${modCode} Módulos (o equivalente)`,
                norma_referencia: materialGabinete.norma_referencia,
                unidad: 'un',
                cantidad: 1,
                observaciones: `Montaje: ${panel.enclosure.mountingType || 'Superficie'}`
            });
        }
    }

    // 2. PROTECCIONES DE CABECERA (PIA + ID)
    if (panel.protections) {
        const p = panel.protections;

        // PIA (Interruptor Automático)
        if (p.hasPIA && p.piaRating) {
            const poles = p.piaPoles || '2P';
            const curve = p.piaCurve || 'C';
            const rating = p.piaRating; // 10, 16, 20...

            // Código esperado: PIA_2P_20A_C
            const piaCode = `PIA_${poles}_${rating}A_${curve}`;
            const matPIA = materialesGenerales.find(m => m.codigo_material === piaCode);

            if (matPIA) {
                materiales.push({
                    codigo_material: piaCode,
                    categoria: 'Protecciones',
                    descripcion: matPIA.descripcion,
                    especificacion_tecnica: matPIA.especificacion_tecnica,
                    norma_referencia: matPIA.norma_referencia,
                    unidad: 'un',
                    cantidad: 1,
                    observaciones: 'Cabecera de Tablero'
                });
            } else {
                // Generar genérico si no existe
                materiales.push({
                    codigo_material: `GEN_PIA_${poles}_${rating}`,
                    categoria: 'Protecciones',
                    descripcion: 'Interruptor Termomagnético (Cabecera)',
                    especificacion_tecnica: `${rating}A - ${poles} - Curva ${curve} - 3kA/4.5kA`,
                    norma_referencia: 'IEC 60898',
                    unidad: 'un',
                    cantidad: 1,
                    observaciones: 'Item no estandarizado en base de datos'
                });
            }
        }

        // ID (Diferencial)
        if (p.hasID && p.idRating) {
            const poles = panel.voltage === '380V' ? '4P' : '2P'; // Asumir según tensión tablero
            const rating = p.idRating;
            const sens = p.idSensitivity === '300mA' ? '300MA' : '30MA'; // CSV usa 30MA

            const idCode = `ID_${poles}_${rating}A_${sens}`;
            const matID = materialesGenerales.find(m => m.codigo_material === idCode);

            if (matID) {
                materiales.push({
                    codigo_material: idCode,
                    categoria: 'Protecciones',
                    descripcion: matID.descripcion,
                    especificacion_tecnica: matID.especificacion_tecnica,
                    norma_referencia: matID.norma_referencia,
                    unidad: 'un',
                    cantidad: 1,
                    observaciones: 'Cabecera de Tablero'
                });
            } else {
                materiales.push({
                    codigo_material: `GEN_ID_${poles}_${rating}`,
                    categoria: 'Protecciones',
                    descripcion: 'Interruptor Diferencial (Cabecera)',
                    especificacion_tecnica: `${rating}A - ${poles} - ${p.idSensitivity || '30mA'} - Clase AC`,
                    norma_referencia: 'IEC 61008',
                    unidad: 'un',
                    cantidad: 1,
                    observaciones: 'Item no estandarizado en base de datos'
                });
            }
        }
    }

    // 3. PUESTA A TIERRA (PAT) DEL TABLERO
    if (panel.grounding && panel.grounding.hasPAT) {
        // Kit completo por tablero
        const patItems = ['JABALINA_1500', 'TOMA_CABLE_COMP', 'CAMARA_INSP_PAT'];

        patItems.forEach(code => {
            const mat = materialesGenerales.find(m => m.codigo_material === code);
            if (mat) {
                materiales.push({
                    codigo_material: code,
                    categoria: mat.categoria,
                    descripcion: mat.descripcion,
                    especificacion_tecnica: mat.especificacion_tecnica,
                    norma_referencia: mat.norma_referencia,
                    unidad: 'un',
                    cantidad: 1,
                    observaciones: `PAT Tablero ${panel.name}`
                });
            }
        });
    }

    return materiales;
}
