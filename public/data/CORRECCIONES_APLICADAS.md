# Correcciones Aplicadas a Tablas Maestras CSV

Correcciones críticas aplicadas según observaciones del usuario sobre categorías profesionales y requisitos documentales.

---

## 🔧 Correcciones Realizadas

### 1. **Lógica de Categorías Profesionales (INVERTIDA)**

#### ❌ Antes (INCORRECTO)
```
Cat II hasta 10kW → Cat III mayor a 10kW
```

#### ✅ Ahora (CORRECTO)
```
Cat III hasta 10kW → Cat I/II mayor a 10kW
```

**Justificación**: Los instaladores de Categoría III pueden certificar instalaciones de **hasta 10 kW**. Para potencias superiores se requiere Categoría I o II.

---

### 2. **Destinos Agregados**

#### Nuevos Tipos de Inmuebles

**Departamento** (`departamento`)
- Unidad funcional en edificio de departamentos
- Cat III hasta 10kW
- Cat I/II mayor a 10kW

**Departamento PH** (`departamento_ph`)
- Departamento con acceso independiente (Propiedad Horizontal)
- Cat III hasta 10kW
- Cat I/II mayor a 10kW
- **Observación especial**: Requiere verificación de medidor individual

**Diferencia entre departamento y departamento_ph**: El PH tiene acceso independiente y generalmente medidor propio, lo que puede afectar la certificación.

---

### 3. **Pública Concurrencia - PROHIBICIÓN Cat III**

#### ❌ Antes (INCORRECTO)
```csv
publica_concurrencia,Especial,3,999,PROHIBIDO para Cat III
```

#### ✅ Ahora (CORRECTO)
```csv
publica_concurrencia,Especial,1,999,PROHIBIDO para Cat III (Sección 718 AEA) - Solo Cat I/II
```

**Justificación**: Según **Sección 718 de la AEA**, los instaladores de Categoría III tienen **PROHIBIDO** certificar instalaciones de pública concurrencia (escuelas, hospitales, teatros, cines, etc.). Solo pueden hacerlo profesionales de Categoría I o II.

---

### 4. **Industrias - Límite 10kW para Cat III**

#### ❌ Antes (INCORRECTO)
```csv
industria,Industrial,3,10,Siempre requiere Categoría III
```

#### ✅ Ahora (CORRECTO)
```csv
industria,Industrial,3,10,Cat III hasta 10kW - Cat I/II mayor a 10kW
```

**Justificación**: Cat III puede certificar **pequeñas instalaciones industriales** de hasta 10 kW. Para instalaciones mayores se requiere Cat I/II.

---

### 5. **Suministro Provisorio - Límite 10kW**

#### ❌ Antes (INCORRECTO)
```csv
provisorio_obra,Temporal,2,5,Solo Categoría II
```

#### ✅ Ahora (CORRECTO)
```csv
provisorio_obra,Temporal,3,10,Cat III hasta 10kW - Máximo 12 meses
```

**Justificación**: Cat III está habilitado para luz de obra en viviendas unifamiliares o pequeños locales de **hasta 10 kW**.

---

### 6. **Edificio Multifamiliar Completo**

#### ✅ Actualizado
```csv
vivienda_multifamiliar,Residencial,1,999,Siempre requiere Cat I/II - Instalación compleja
```

**Justificación**: Un edificio completo de departamentos (áreas comunes, instalación general) es una instalación compleja que **siempre requiere Cat I/II**, independientemente de la potencia.

---

### 7. **Instalación Existente - Documentos Adicionales**

#### Nueva Columna: `requiere_acreditacion_existente`

```csv
requiere_acreditacion_existente
```

#### Actualización para INST_EXIST y REGULAR

```csv
Instalación Existente,INST_EXIST,...,Sí,...,Checklist: diferencial + tierra + estado cables
Regularización,REGULAR,...,Sí,...,Requiere inspección previa ERSeP
```

**Documentos requeridos para instalaciones existentes**:
- ✅ Fotos de verificación (`requiere_fotos_verif: Sí`)
- ✅ Acreditación instalación existente (checklist de seguridad)
  - Diferencial funcionando
  - Puesta a tierra correcta
  - Estado de cables aceptable

---

### 8. **Motor de Cálculo - Nueva Columna**

#### Nueva Columna: `motor_calculo`

Identifica qué motor de cálculo usar para cada trámite:

| Trámite | Motor de Cálculo | Descripción |
|---------|------------------|-------------|
| INST_NUEVA | `PMU_FS` | Cálculo con PMU + Factor Simultaneidad |
| INST_EXIST | `EXISTENTE` | Motor específico Res. 54/2018 |
| TRANS_OBRA | `SIMPLE` | Cálculo simplificado |
| TRANS_EVENTO | `SIMPLE` | Cálculo simplificado |
| AMPLIACION | `PMU_FS` | Cálculo con PMU + Factor Simultaneidad |
| REGULAR | `EXISTENTE` | Motor específico Res. 54/2018 |

**Justificación**: La Res. 54/2018 tiene su **propio motor de cálculo** diferente al de instalaciones nuevas (AEA 770/771).

---

## 📊 Tabla Actualizada: `destinos_inmueble.csv`

### Resumen de Cambios

| Destino | Cat. Mín. | Potencia Cat III | Observaciones |
|---------|-----------|------------------|---------------|
| Vivienda unifamiliar | 3 | ≤10 kW | Cat I/II >10kW |
| **Departamento** | **3** | **≤10 kW** | **NUEVO** |
| **Departamento PH** | **3** | **≤10 kW** | **NUEVO - Verificar medidor** |
| Edificio multifamiliar | 1 | N/A | Siempre Cat I/II |
| Local comercial | 3 | ≤10 kW | Cat I/II >10kW |
| Oficina | 3 | ≤10 kW | Cat I/II >10kW |
| Industria/Taller | 3 | ≤10 kW | Cat I/II >10kW |
| **Pública concurrencia** | **1** | **PROHIBIDO** | **Solo Cat I/II** |
| Provisorio obra | 3 | ≤10 kW | Máx 12 meses |

**Total destinos**: 9 (antes 7)

---

## 📋 Tabla Actualizada: `requisitos_certificacion.csv`

### Nuevas Columnas

1. **`requiere_acreditacion_existente`**: Sí/No
   - Checklist de seguridad para instalaciones pre-2017

2. **`motor_calculo`**: PMU_FS | EXISTENTE | SIMPLE
   - Identifica qué algoritmo de cálculo usar

### Cambios por Trámite

#### Instalación Existente
- ✅ `requiere_fotos_verif: Sí` (confirmado)
- ✅ `requiere_acreditacion_existente: Sí` (agregado)
- ✅ `motor_calculo: EXISTENTE` (agregado)

#### Regularización
- ✅ `requiere_fotos_verif: Sí`
- ✅ `requiere_acreditacion_existente: Sí`
- ✅ `motor_calculo: EXISTENTE`

---

## ✅ Validaciones Implementadas

### Validación de Categoría Profesional

```typescript
function validateProfessionalCategory(destino: string, potenciaKW: number) {
  const dest = destinos.find(d => d.codigo_destino === destino);
  
  // Caso especial: Pública concurrencia
  if (destino === 'publica_concurrencia') {
    return {
      allowed: false,
      message: 'PROHIBIDO para Cat III (Sección 718 AEA). Requiere Cat I/II'
    };
  }
  
  // Caso especial: Edificio multifamiliar completo
  if (destino === 'vivienda_multifamiliar') {
    return {
      allowed: false,
      message: 'Instalación compleja. Requiere Cat I/II'
    };
  }
  
  // Regla general: Cat III hasta max_potencia_cat3_kw
  if (potenciaKW <= dest.max_potencia_cat3_kw) {
    return {
      allowed: true,
      category: 3,
      message: `Cat III habilitada (≤${dest.max_potencia_cat3_kw} kW)`
    };
  } else {
    return {
      allowed: false,
      category: [1, 2],
      message: `Requiere Cat I/II (>${dest.max_potencia_cat3_kw} kW)`
    };
  }
}
```

### Validación de Documentos Requeridos

```typescript
function getRequiredDocuments(tramite: string) {
  const req = requisitos.find(r => r.codigo_tramite === tramite);
  
  const docs = [];
  if (req.requiere_pmu === 'Sí') docs.push('PMU');
  if (req.requiere_unifilar === 'Sí') docs.push('Diagrama Unifilar');
  if (req.requiere_fotos_verif === 'Sí') docs.push('Fotos de Verificación');
  if (req.requiere_plano_ubicacion === 'Sí') docs.push('Plano de Ubicación');
  if (req.requiere_memoria_tecnica === 'Sí') docs.push('Memoria Técnica');
  if (req.requiere_acreditacion_existente === 'Sí') {
    docs.push('Acreditación Instalación Existente (Checklist)');
  }
  
  return docs;
}
```

---

## 🎯 Casos de Uso Actualizados

### Caso 1: Departamento 85m² - 8kW

```
Destino: departamento
Potencia: 8 kW
Categoría: Cat III ✅ (≤10kW)
Documentos: PMU, DPMS, Unifilar, Plano, Memoria
```

### Caso 2: Departamento PH - 12kW

```
Destino: departamento_ph
Potencia: 12 kW
Categoría: Cat I/II ❌ (>10kW)
Observación: Verificar medidor individual
```

### Caso 3: Escuela - 5kW

```
Destino: publica_concurrencia
Potencia: 5 kW
Categoría: PROHIBIDO Cat III ❌
Requiere: Cat I/II (Sección 718 AEA)
```

### Caso 4: Taller - 8kW

```
Destino: industria
Potencia: 8 kW
Categoría: Cat III ✅ (≤10kW)
Documentos: PMU, DPMS, Unifilar, Plano, Memoria
```

### Caso 5: Instalación Existente - Vivienda

```
Destino: vivienda
Trámite: INST_EXIST
Motor de cálculo: EXISTENTE (Res. 54/2018)
Documentos requeridos:
  - DPMS ✅
  - Diagrama Unifilar ✅
  - Fotos de Verificación ✅
  - Acreditación Existente (Checklist) ✅
    • Diferencial funcionando
    • Puesta a tierra correcta
    • Estado de cables aceptable
```

---

## 📝 Resumen de Correcciones

### Cambios en `destinos_inmueble.csv`
- ✅ Columna renombrada: `max_potencia_cat2_kw` → `max_potencia_cat3_kw`
- ✅ Lógica invertida: Cat III hasta 10kW (antes era al revés)
- ✅ Agregado: `departamento`
- ✅ Agregado: `departamento_ph`
- ✅ Corregido: `publica_concurrencia` → PROHIBIDO Cat III
- ✅ Corregido: `industria` → Cat III hasta 10kW
- ✅ Corregido: `provisorio_obra` → Cat III hasta 10kW
- ✅ Corregido: `vivienda_multifamiliar` → Siempre Cat I/II

### Cambios en `requisitos_certificacion.csv`
- ✅ Nueva columna: `requiere_acreditacion_existente`
- ✅ Nueva columna: `motor_calculo`
- ✅ Confirmado: `INST_EXIST` requiere fotos verificación
- ✅ Agregado: Checklist de seguridad para instalaciones existentes
- ✅ Documentado: Motor de cálculo específico por trámite

---

## ✅ Archivos Actualizados

```
public/data/
├── destinos_inmueble.csv          ✅ ACTUALIZADO (9 destinos)
├── requisitos_certificacion.csv   ✅ ACTUALIZADO (2 columnas nuevas)
├── tipos_circuitos_lineas.csv     (sin cambios)
└── grados_electrificacion.csv     (sin cambios)
```

**Las correcciones están listas y los archivos CSV actualizados.**
