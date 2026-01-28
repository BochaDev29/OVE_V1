# Tablas Maestras CSV - Sistema OVE

Documentación completa de las tres tablas maestras que definen el comportamiento de la aplicación OVE.

---

## 📊 Arquitectura de 3 Dimensiones

El sistema OVE se basa en la intersección de tres dimensiones:

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA OVE                              │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   DESTINO    │   │   TRÁMITE    │   │   CIRCUITO   │   │
│  │  (Inmueble)  │ × │ (Certificac.)│ × │   (Línea)    │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         ↓                   ↓                   ↓          │
│  7 tipos destino    6 tipos trámite    17 tipos circuito  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Tabla 1: `tipos_circuitos_lineas.csv`

### Propósito
Define todos los tipos de circuitos y líneas eléctricas permitidos en instalaciones, con sus características técnicas normativas.

### Estructura
**17 filas** × **16 columnas**

### Columnas

| Columna | Tipo | Valores | Descripción |
|---------|------|---------|-------------|
| `tipo_circuito` | Texto | uso_general, uso_especial, uso_especifico, linea_principal, circuito_seccional, cable_proteccion | Categoría del circuito |
| `designacion` | Texto | - | Nombre descriptivo completo |
| `sigla` | Texto | IUG, TUG, IUE, TUE, etc. | Sigla oficial según AEA |
| `max_bocas` | Número | 1-15, -1 (sin límite), 0 (no aplica) | Máximo de bocas permitidas |
| `max_proteccion_a` | Número | 16-32, -1 (proyectista), 0 (no aplica) | Calibre máximo de protección (A) |
| `seccion_min_mm2` | Número | 1.5-6.0 | Sección mínima monofásico (mm²) |
| `seccion_min_tri_mm2` | Número | 1.5-6.0 | Sección mínima trifásico (mm²) |
| `permite_vivienda` | Sí/No | Sí, No | Permitido en viviendas |
| `permite_comercio` | Sí/No | Sí, No | Permitido en comercios/oficinas |
| `permite_industria` | Sí/No | Sí, No | Permitido en industrias/talleres |
| `permite_publica_concurrencia` | Sí/No | Sí, No | Permitido en edificios públicos |
| `permite_transitorio` | Sí/No | Sí, No | Permitido en suministros transitorios |
| `requiere_nueva` | Sí/No | Sí, No | Aplica a instalaciones nuevas |
| `requiere_existente` | Sí/No | Sí, No | Aplica a instalaciones existentes |
| `calculo_auto` | Sí/No | Sí, No | La app calcula automáticamente |
| `observaciones` | Texto | - | Notas técnicas adicionales |
| `normativa` | Texto | AEA 770, AEA 771, IRAM 2281 | Referencia normativa |

### Tipos de Circuitos Incluidos

#### Uso General (2)
- **IUG**: Iluminación uso general (15 bocas, 16A, 1.5mm²)
- **TUG**: Tomacorriente uso general (15 bocas, 20A, 2.5mm²)

#### Uso Especial (2)
- **IUE**: Iluminación uso especial (12 bocas, 32A, 2.5mm²)
- **TUE**: Tomacorriente uso especial (12 bocas, 32A, 2.5mm²)

#### Uso Específico (7)
- **MBTF**: Alimentación MBTF (15 bocas, 20A, 1.5mm²)
- **APM**: Alimentación pequeños motores (15 bocas, 25A, 2.5mm²)
- **ATE**: Alimentación tensión estabilizada (15 bocas, proyectista, 2.5mm²)
- **MBTS**: Circuitos MBTS (sin límite, proyectista, 2.5mm²)
- **ITE**: Iluminación trifásica específica (12 bocas, proyectista, 2.5mm²) - **Prohibido en viviendas**
- **ACU**: Alimentación carga única (1 boca, proyectista, 2.5mm²)
- **OCE**: Otros circuitos específicos (sin límite, proyectista, 2.5mm²)
- **AVP**: Alimentación vivienda provisoria (1 boca, proyectista, 2.5mm²) - **Solo transitorios**

#### Líneas Principales y Protección (6)
- **LP**: Línea medidor-TP (4.0mm²)
- **CS**: Línea TP-TS (2.5mm²)
- **PE**: Cable de puesta a tierra (2.5mm²)
- **PAT monofásico**: Jabalina a bornera (4.0mm²)
- **PAT trifásico**: Jabalina a bornera (6.0mm²)

### Valores Especiales

- **max_bocas = -1**: Sin límite de bocas
- **max_bocas = 0**: No aplica el concepto de bocas (líneas, cables)
- **max_proteccion_a = -1**: Responsabilidad del proyectista
- **max_proteccion_a = 0**: No requiere protección (cables PE/PAT)

---

## 📋 Tabla 2: `requisitos_certificacion.csv`

### Propósito
Define los requisitos documentales y de cálculo para cada tipo de trámite de certificación ante ERSeP.

### Estructura
**6 filas** × **15 columnas**

### Columnas

| Columna | Tipo | Valores | Descripción |
|---------|------|---------|-------------|
| `tipo_tramite` | Texto | - | Nombre del trámite |
| `codigo_tramite` | Texto | INST_NUEVA, INST_EXIST, etc. | Código único identificador |
| `normativa_aplicable` | Texto | AEA 770/771, Res. 54/2018 | Normativa que rige el trámite |
| `requiere_pmu` | Sí/No | Sí, No | Requiere cálculo de PMU |
| `requiere_calculo_dpms` | Sí/No | Sí, No | Requiere cálculo de DPMS |
| `requiere_unifilar` | Sí/No | Sí, No | Requiere diagrama unifilar |
| `requiere_fotos_verif` | Sí/No | Sí, No | Requiere fotos de verificación |
| `requiere_plano_ubicacion` | Sí/No | Sí, No | Requiere plano de ubicación |
| `requiere_memoria_tecnica` | Sí/No | Sí, No | Requiere memoria técnica |
| `permite_vivienda` | Sí/No | Sí, No | Aplica a viviendas |
| `permite_comercio` | Sí/No | Sí, No | Aplica a comercios |
| `permite_industria` | Sí/No | Sí, No | Aplica a industrias |
| `permite_publica_concurrencia` | Sí/No | Sí, No | Aplica a edificios públicos |
| `factor_simultaneidad` | Número | 0.8, 1.0 | Factor de simultaneidad a aplicar |
| `descripcion` | Texto | - | Descripción del trámite |
| `observaciones` | Texto | - | Notas adicionales |

### Tipos de Trámites

#### 1. Instalación Nueva (`INST_NUEVA`)
- **Normativa**: AEA 90364-7-770/771
- **Requiere**: PMU, DPMS, Unifilar, Plano ubicación, Memoria técnica
- **Factor simultaneidad**: 0.8
- **Aplica a**: Todos los destinos
- **Descripción**: Proyecto completo desde cero según normativa vigente

#### 2. Instalación Existente (`INST_EXIST`)
- **Normativa**: Res. General 54/2018
- **Requiere**: DPMS, Unifilar, Fotos verificación
- **Factor simultaneidad**: 0.8
- **Aplica a**: Vivienda, Comercio, Industria
- **Descripción**: Verificación de seguridad para instalaciones pre-2017

#### 3. Suministro Transitorio Obra (`TRANS_OBRA`)
- **Normativa**: AEA 90364-7-770
- **Requiere**: DPMS, Unifilar, Plano ubicación
- **Factor simultaneidad**: 1.0
- **Aplica a**: Solo obras
- **Duración**: Máximo 12 meses (renovable)

#### 4. Suministro Transitorio Evento (`TRANS_EVENTO`)
- **Normativa**: AEA 90364-7-770
- **Requiere**: DPMS, Unifilar, Plano ubicación
- **Factor simultaneidad**: 1.0
- **Aplica a**: Solo eventos en espacios públicos
- **Duración**: Máximo 30 días (no renovable)

#### 5. Ampliación/Modificación (`AMPLIACION`)
- **Normativa**: AEA 90364-7-770/771
- **Requiere**: PMU, DPMS, Unifilar, Memoria técnica
- **Factor simultaneidad**: 0.8
- **Aplica a**: Todos los destinos
- **Descripción**: Solo sectores nuevos o modificados

#### 6. Regularización (`REGULAR`)
- **Normativa**: Res. General 54/2018
- **Requiere**: DPMS, Unifilar, Fotos verificación, Memoria técnica
- **Factor simultaneidad**: 0.8
- **Aplica a**: Vivienda, Comercio, Industria
- **Descripción**: Puesta en regla de instalación informal (requiere inspección previa ERSeP)

---

## 📋 Tabla 3: `destinos_inmueble.csv`

### Propósito
Define las características de cada tipo de destino de inmueble y los requisitos de categoría profesional.

### Estructura
**7 filas** × **8 columnas**

### Columnas

| Columna | Tipo | Valores | Descripción |
|---------|------|---------|-------------|
| `codigo_destino` | Texto | vivienda, comercio, etc. | Código único identificador |
| `nombre_destino` | Texto | - | Nombre descriptivo |
| `categoria` | Texto | Residencial, Comercial, Industrial, Especial, Temporal | Categoría general |
| `requiere_categoria_profesional` | Número | 2, 3 | Categoría mínima del profesional |
| `max_potencia_cat2_kw` | Número | 5-999 | Potencia máxima para Cat. II (kW) |
| `normativa_base` | Texto | AEA 770, AEA 771 | Normativa aplicable |
| `descripcion` | Texto | - | Descripción del destino |
| `observaciones` | Texto | - | Notas sobre categoría profesional |

### Destinos Definidos

#### 1. Vivienda Unifamiliar (`vivienda`)
- **Categoría**: Residencial
- **Profesional**: Cat. II hasta 10kW, Cat. III >10kW
- **Normativa**: AEA 770

#### 2. Vivienda Multifamiliar (`vivienda_multifamiliar`)
- **Categoría**: Residencial
- **Profesional**: Cat. II hasta 10kW, Cat. III >10kW
- **Normativa**: AEA 770

#### 3. Local Comercial (`comercio`)
- **Categoría**: Comercial
- **Profesional**: Cat. II hasta 10kW, Cat. III >10kW
- **Normativa**: AEA 771

#### 4. Oficina (`oficina`)
- **Categoría**: Comercial
- **Profesional**: Cat. II hasta 10kW, Cat. III >10kW
- **Normativa**: AEA 771

#### 5. Industria/Taller (`industria`)
- **Categoría**: Industrial
- **Profesional**: **Siempre Cat. III**
- **Normativa**: AEA 771

#### 6. Pública Concurrencia (`publica_concurrencia`)
- **Categoría**: Especial
- **Profesional**: **Siempre Cat. III**
- **Normativa**: AEA 771
- **Ejemplos**: Escuelas, hospitales, teatros, cines

#### 7. Suministro Provisorio Obra (`provisorio_obra`)
- **Categoría**: Temporal
- **Profesional**: **Solo Cat. II** (máx. 5kW)
- **Normativa**: AEA 770
- **Duración**: Máximo 12 meses

---

## 🔗 Relaciones Entre Tablas

### Ejemplo de Validación Cruzada

```typescript
// Usuario selecciona:
const destino = 'vivienda';
const tramite = 'INST_NUEVA';
const circuito = 'ITE';

// 1. Validar que el trámite permite el destino
const req = requisitos_certificacion.find(r => r.codigo_tramite === tramite);
if (req.permite_vivienda !== 'Sí') {
  ERROR: "Este trámite no aplica para viviendas"
}

// 2. Validar que el circuito permite el destino
const circ = tipos_circuitos_lineas.find(c => c.sigla === circuito);
if (circ.permite_vivienda !== 'Sí') {
  ERROR: "ITE está prohibido en viviendas" ✅ CORRECTO
}

// 3. Validar categoría profesional
const dest = destinos_inmueble.find(d => d.codigo_destino === destino);
const potenciaTotal = 12; // kW
if (potenciaTotal > dest.max_potencia_cat2_kw) {
  ALERTA: "Requiere profesional Categoría III"
}
```

---

## 📊 Matriz de Compatibilidad

### Circuitos × Destinos

| Circuito | Vivienda | Comercio | Industria | Pública Conc. | Transitorio |
|----------|----------|----------|-----------|---------------|-------------|
| IUG | ✅ | ✅ | ✅ | ✅ | ✅ |
| TUG | ✅ | ✅ | ✅ | ✅ | ✅ |
| IUE | ✅ | ✅ | ✅ | ✅ | ❌ |
| TUE | ✅ | ✅ | ✅ | ✅ | ❌ |
| ITE | ❌ | ✅ | ✅ | ✅ | ❌ |
| ACU | ✅ | ✅ | ✅ | ✅ | ✅ |
| AVP | ❌ | ❌ | ❌ | ❌ | ✅ |

### Trámites × Destinos

| Trámite | Vivienda | Comercio | Industria | Pública Conc. |
|---------|----------|----------|-----------|---------------|
| INST_NUEVA | ✅ | ✅ | ✅ | ✅ |
| INST_EXIST | ✅ | ✅ | ✅ | ✅ |
| TRANS_OBRA | ❌ | ❌ | ❌ | ❌ |
| TRANS_EVENTO | ❌ | ❌ | ❌ | ✅ |
| AMPLIACION | ✅ | ✅ | ✅ | ✅ |
| REGULAR | ✅ | ✅ | ✅ | ❌ |

---

## 🎯 Casos de Uso

### Caso 1: Vivienda Nueva
```
Destino: vivienda
Trámite: INST_NUEVA
Circuitos permitidos: IUG, TUG, IUE, TUE, MBTF, APM, ATE, MBTS, ACU, OCE, LP, CS, PE, PAT
Circuitos prohibidos: ITE, AVP
Documentos: PMU, DPMS, Unifilar, Plano ubicación, Memoria técnica
```

### Caso 2: Comercio Existente
```
Destino: comercio
Trámite: INST_EXIST
Circuitos permitidos: IUG, TUG, TUE, ATE, ITE, ACU, OCE, LP, CS, PE, PAT
Circuitos prohibidos: IUE, AVP
Documentos: DPMS, Unifilar, Fotos verificación
```

### Caso 3: Obra Transitoria
```
Destino: provisorio_obra
Trámite: TRANS_OBRA
Circuitos permitidos: IUG, TUG, ACU, OCE, AVP, LP, PE, PAT
Circuitos prohibidos: IUE, TUE, ITE, MBTF, APM, ATE, MBTS
Documentos: DPMS, Unifilar, Plano ubicación
```

---

## ✅ Ventajas del Sistema

1. **Flexibilidad**: Agregar nuevos circuitos/trámites/destinos sin tocar código
2. **Validación Automática**: Cruza las 3 dimensiones para validar compatibilidad
3. **Trazabilidad Normativa**: Cada regla tiene su referencia AEA/IRAM
4. **Gestión en Excel**: Editable por no-programadores
5. **Fallback Robusto**: Si CSV falla, usa valores hardcodeados
6. **Escalable**: Preparado para nuevas normativas o jurisdicciones

---

## 📝 Edición en Excel

### Cómo Agregar un Nuevo Circuito

1. Abrir `tipos_circuitos_lineas.csv` en Excel
2. Agregar nueva fila al final
3. Completar todas las columnas
4. Guardar como **CSV UTF-8**
5. Recargar aplicación (F5)

### Ejemplo: Agregar Circuito de Calefacción
```csv
uso_especifico,Alimentación calefacción,CAL,1,-1,4.0,4.0,Sí,Sí,No,No,No,Sí,No,No,Calefacción eléctrica,AEA 770
```

---

## 🔍 Próximos Pasos

Una vez integradas estas tablas en el código:

1. ✅ Validación automática de circuitos según destino
2. ✅ Generación dinámica de documentación según trámite
3. ✅ Alertas de categoría profesional
4. ✅ Filtrado inteligente de opciones en UI
5. ✅ Cálculo automático vs. manual según `calculo_auto`

---

**Estas tres tablas son la columna vertebral del sistema OVE y definen completamente su comportamiento normativo.**
