# Motor de Cálculo Res. 54/2018 - Implementación

Documentación del motor de cálculo específico para instalaciones existentes según Resolución 54/2018.

---

## 📐 Función: `calcularPotenciaRes54()`

### Propósito
Calcula la potencia de instalaciones eléctricas existentes (pre-2017) según la **Resolución General 54/2018** del ERSeP (Ente Regulador de Servicios Públicos de Córdoba).

### Firma de la Función

```typescript
export function calcularPotenciaRes54(
  bocasLuz: number,
  bocasTomas: number,
  cargasEspeciales: number = 0
): {
  vaTotal: number;
  dpms: number;
  kw: number;
  alerts: string[];
  warnings: string[];
}
```

---

## 🔢 Fórmula Implementada

### Paso 1: Suma de VA Totales
```
VA_Total = (BocasLuz × 25 VA) + (BocasTomas × 240 VA) + CargasEspeciales
```

### Paso 2: Aplicar Coeficiente de Simultaneidad
```
DPMS = VA_Total × 0.8
```

### Paso 3: Aplicar Factor de Potencia
```
Watts = DPMS × 0.85
kW = Watts / 1000
```

### Paso 4: Validación de Categoría Profesional
```
Si kW > 10 → Alerta: Requiere Cat I/II
```

---

## 📊 Valores Normativos

| Concepto | Valor | Normativa |
|----------|-------|-----------|
| VA por boca de luz | 25 VA | Res. 54/2018 |
| VA por boca de toma | 240 VA | Res. 54/2018 |
| Coeficiente de simultaneidad | 0.8 | Res. 54/2018 |
| Factor de potencia | 0.85 | Res. 54/2018 |
| Límite Cat III | 10 kW | ERSeP |

---

## 💻 Ejemplos de Uso

### Ejemplo 1: Vivienda Pequeña (Dentro del Límite)

```typescript
// Vivienda con 10 bocas de luz, 8 tomas, sin cargas especiales
const resultado = calcularPotenciaRes54(10, 8, 0);

console.log(resultado);
// {
//   vaTotal: 2170,        // (10×25) + (8×240) = 250 + 1920
//   dpms: 1736,           // 2170 × 0.8
//   kw: 1.48,             // (1736 × 0.85) / 1000
//   alerts: [],           // Sin alertas (< 10kW)
//   warnings: []
// }
```

### Ejemplo 2: Vivienda Grande (Supera el Límite)

```typescript
// Vivienda con 20 bocas de luz, 30 tomas, aire acondicionado 2200W
const resultado = calcularPotenciaRes54(20, 30, 2200);

console.log(resultado);
// {
//   vaTotal: 9900,        // (20×25) + (30×240) + 2200 = 500 + 7200 + 2200
//   dpms: 7920,           // 9900 × 0.8
//   kw: 6.73,             // (7920 × 0.85) / 1000
//   alerts: [],           // Sin alertas (< 10kW)
//   warnings: []
// }
```

### Ejemplo 3: Local Comercial (Requiere Cat I/II)

```typescript
// Local con 30 bocas de luz, 50 tomas, cargas especiales 5000VA
const resultado = calcularPotenciaRes54(30, 50, 5000);

console.log(resultado);
// {
//   vaTotal: 17750,       // (30×25) + (50×240) + 5000 = 750 + 12000 + 5000
//   dpms: 14200,          // 17750 × 0.8
//   kw: 12.07,            // (14200 × 0.85) / 1000
//   alerts: [
//     "⚠️ ATENCIÓN: La potencia calculada (12.07 kW) supera los 10 kW. " +
//     "Según normativa ERSeP, esta certificación requiere un profesional Categoría I o II. " +
//     "Los instaladores Categoría III solo pueden certificar hasta 10 kW."
//   ],
//   warnings: []
// }
```

### Ejemplo 4: Validación de Datos

```typescript
// Sin bocas ingresadas
const resultado1 = calcularPotenciaRes54(0, 0, 0);
// warnings: ["⚠️ No se han ingresado bocas de luz ni tomas. Verifique los datos."]

// Carga especial menor a 500VA
const resultado2 = calcularPotenciaRes54(5, 5, 300);
// warnings: ["⚠️ Las cargas especiales menores a 500 VA deberían considerarse como tomas generales."]
```

---

## 🔄 Integración con el Wizard

### Detección Automática del Motor de Cálculo

```typescript
// En el wizard, al seleccionar tipo de proyecto
const tramite = getCertificationRequirements('INST_EXIST');

if (tramite.motor_calculo === 'EXISTENTE') {
  // Usar calcularPotenciaRes54
  const totalLuz = environments.reduce((sum, env) => sum + env.lights, 0);
  const totalTomas = environments.reduce((sum, env) => sum + env.regularOutlets, 0);
  const totalEspeciales = environments.reduce((sum, env) => {
    return sum + (env.specialLoads?.reduce((s, l) => s + l.value, 0) || 0);
  }, 0);

  const resultado = calcularPotenciaRes54(totalLuz, totalTomas, totalEspeciales);

  // Mostrar resultados
  console.log(`DPMS: ${resultado.dpms} VA`);
  console.log(`Potencia: ${resultado.kw.toFixed(2)} kW`);

  // Mostrar alertas si existen
  if (resultado.alerts.length > 0) {
    alert(resultado.alerts.join('\n'));
  }
}
```

### Comparación con Motor PMU_FS

| Aspecto | Res. 54/2018 (EXISTENTE) | AEA 770/771 (PMU_FS) |
|---------|--------------------------|----------------------|
| **Bocas de luz** | 25 VA | 40 VA (60VA × 2/3) |
| **Bocas de tomas** | 240 VA | 2200 VA por circuito |
| **Simultaneidad** | 0.8 fijo | Variable (0.6-1.0) según cantidad |
| **PMU** | No requiere | Sí requiere |
| **Grado de electrificación** | No aplica | Sí aplica |
| **Uso** | Instalaciones pre-2017 | Instalaciones nuevas |

---

## ⚠️ Validaciones Implementadas

### 1. Límite de 10 kW (Categoría Profesional)

```typescript
if (kw > 10) {
  alerts.push(
    "⚠️ ATENCIÓN: La potencia calculada supera los 10 kW. " +
    "Requiere profesional Categoría I o II."
  );
}
```

**Justificación**: Los instaladores Categoría III solo pueden certificar instalaciones de hasta 10 kW según normativa ERSeP.

### 2. Bocas Vacías

```typescript
if (bocasLuz === 0 && bocasTomas === 0) {
  warnings.push("⚠️ No se han ingresado bocas. Verifique los datos.");
}
```

**Justificación**: Una instalación sin bocas es inválida.

### 3. Cargas Especiales Menores a 500 VA

```typescript
if (cargasEspeciales > 0 && cargasEspeciales < 500) {
  warnings.push("⚠️ Cargas < 500 VA deberían ser tomas generales.");
}
```

**Justificación**: Cargas pequeñas se consideran parte de las tomas generales.

---

## 📋 Documentos Requeridos (Res. 54/2018)

Según `requisitos_certificacion.csv` para `INST_EXIST`:

- ✅ Diagrama Unifilar
- ✅ Fotos de Verificación
- ✅ **Acreditación Instalación Existente** (Checklist):
  - Diferencial funcionando
  - Puesta a tierra correcta
  - Estado de cables aceptable
- ❌ NO requiere PMU
- ❌ NO requiere Plano de ubicación
- ❌ NO requiere Memoria técnica

---

## 🎯 Casos de Uso Típicos

### Caso 1: Departamento Existente

**Datos:**
- 12 bocas de luz
- 10 tomas
- 1 aire acondicionado 2200W

**Cálculo:**
```typescript
const resultado = calcularPotenciaRes54(12, 10, 2200);
// vaTotal: 4900 VA
// dpms: 3920 VA
// kw: 3.33 kW ✅ (< 10kW, Cat III puede certificar)
```

### Caso 2: Casa Existente Grande

**Datos:**
- 25 bocas de luz
- 20 tomas
- 2 aires acondicionados (2200W c/u) + termotanque (1500W)

**Cálculo:**
```typescript
const resultado = calcularPotenciaRes54(25, 20, 5900);
// vaTotal: 11325 VA
// dpms: 9060 VA
// kw: 7.70 kW ✅ (< 10kW, Cat III puede certificar)
```

### Caso 3: Local Comercial Existente

**Datos:**
- 40 bocas de luz
- 60 tomas
- Cargas especiales: 8000 VA

**Cálculo:**
```typescript
const resultado = calcularPotenciaRes54(40, 60, 8000);
// vaTotal: 23400 VA
// dpms: 18720 VA
// kw: 15.91 kW ❌ (> 10kW, requiere Cat I/II)
// alerts: ["⚠️ ATENCIÓN: Requiere Cat I/II"]
```

---

## 🔗 Relación con Otras Funciones

### Función Principal: `calculateProjectDemand()`

La función `calculateProjectDemand()` ya detecta automáticamente si es instalación existente:

```typescript
// Línea 309 de electrical-rules.ts
const dpms = config.projectType === 'existente' 
  ? totalAritmeticVA * 0.8    // Usa factor 0.8 de Res. 54/2018
  : totalAritmeticVA * ctResults.fs;  // Usa factor variable de AEA 770/771
```

### Función de Circuitos: `calculatePanelCircuits()`

```typescript
// Líneas 348-358
if (config.projectType === 'existente') {
  // IUG: bocas × 25 VA
  circuits.push({ 
    power: totalIug * 25,
    ib: (totalIug * 25) / 220
  });
  
  // TUG: bocas × 240 VA
  circuits.push({ 
    power: totalTug * 240,
    ib: (totalTug * 240) / 220
  });
}
```

---

## ✅ Resumen

### Función Implementada
- ✅ `calcularPotenciaRes54()` exportada
- ✅ Fórmula Res. 54/2018 correcta
- ✅ Validación de 10 kW
- ✅ Warnings para datos inválidos

### Integración
- ✅ Compatible con `calculateProjectDemand()`
- ✅ Compatible con `calculatePanelCircuits()`
- ✅ Detecta automáticamente `projectType === 'existente'`

### Próximos Pasos
1. Integrar en UI del wizard
2. Mostrar alertas de Cat I/II en pantalla
3. Generar checklist de acreditación existente
4. Agregar campo para fotos de verificación

**El motor de cálculo Res. 54/2018 está completo y listo para usar.**
