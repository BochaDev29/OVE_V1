# 02 — SOLID aplicado a OVE

> SOLID es un conjunto de 5 principios para escribir código que sea fácil de mantener, extender y entender.
> Como ya estudiás Java, los vas a reconocer. Acá los vemos con código **real** de esta app.

---

## S — Single Responsibility (Una sola responsabilidad)

> *"Una clase/función debe tener una sola razón para cambiar"*

### ❌ Cómo NO hacerlo (todo en una función)

```typescript
// MAL: Esta función hace demasiadas cosas
function asignarCircuitoYGuardarYActualizarUI(circuitId, panelId) {
    // calcula
    // actualiza base de datos
    // regenera inventario CAD
    // actualiza el estado de React
    // muestra notificación
}
```

### ✅ Cómo está hecho en OVE

En `src/components/wizard/ProjectWizardStep3.tsx`:

```typescript
// Cada función hace UNA cosa:

// 1. Solo asigna el circuito al panel
const assignCircuitToPanel = (circuitId: string, panelId: string) => { ... }

// 2. Solo desasigna
const unassignCircuit = (circuitId: string) => {
    assignCircuitToPanel(circuitId, ''); // reutiliza assignCircuitToPanel
}

// 3. Solo aplica el cambio y regenera CAD (atómicamente)
const applyChange = (newConfig: ProjectConfig) => { ... }
```

Cada función tiene **una razón para cambiar**. Si cambia la lógica de asignación, solo tocás `assignCircuitToPanel`. Si cambia cómo se genera el CAD, solo tocás `applyChange`.

---

## O — Open/Closed (Abierto para extensión, cerrado para modificación)

> *"El código debe poder extenderse sin modificar lo que ya funciona"*

### En `src/lib/electrical-rules.ts`

La función `generateCircuitInventory` genera circuitos de distintos tipos:
- IUG, TUG (circuitos generales)
- ACU, TUE, IUE, APM... (circuitos especiales)

Si mañana se agrega un nuevo tipo "XYZ", se puede agregar al switch/map de tipos especiales **sin tocar la lógica de IUG/TUG que ya funciona**.

```typescript
// Agregar nuevo tipo de circuito: solo agregás acá
const groupableTypes = ['TUE', 'IUE', 'APM', 'MBTF']; // ← agregar 'XYZ' acá
```

La función principal no cambia. Solo se extiende la lista.

---

## L — Liskov Substitution (Sustitución de Liskov)

> *"Un subtipo debe poder usarse donde se usa el tipo base"*

En React esto se ve en los **componentes**. `PanelEditor` recibe props con una interfaz definida:

```typescript
// Si el componente espera esto:
interface PanelEditorProps {
    panel: Panel;
    onAssignCircuit: (circuitId: string, panelId: string) => void;
}

// Cualquier función que cumpla esa firma puede pasarse como prop.
// No importa si es assignCircuitToPanel o una versión de prueba.
```

Esto es especialmente poderoso con TypeScript, que verifica en tiempo de compilación.

---

## I — Interface Segregation (Segregación de interfaces)

> *"No obligues a nadie a implementar lo que no necesita"*

### En `src/lib/electrical-rules.ts` (línea ~395)

```typescript
// CircuitInventoryItem tiene muchos campos opcionales con ?
export interface CircuitInventoryItem {
    id: string;               // obligatorio
    type: string;             // obligatorio
    assignedPanelId?: string; // opcional — no todos los circuitos están asignados
    isThreePhase?: boolean;   // opcional — solo circuitos trifásicos
    terminalLine?: { ... };   // opcional — solo cuando se configura instalación
}
```

El `?` en TypeScript indica opcional. Un circuito básico solo necesita `id` y `type`. Un circuito avanzado usa todos los campos. La interfaz no te obliga a llenarlos todos.

---

## D — Dependency Inversion (Inversión de dependencias)

> *"Dependé de abstracciones, no de implementaciones concretas"*

### El caso más claro: `onChange` prop en Step 3

```typescript
// ProjectWizardStep3.tsx recibe onChange como prop
interface Step3Props {
    onChange: (config: ProjectConfig) => void; // ← abstracción
}
```

Step3 **no sabe** si `onChange` guarda en Supabase, en localStorage, o no hace nada. Solo "llama a onChange con la config nueva".

En `ProjectWizard.tsx` se decide qué pasa:
```typescript
// El padre decide la implementación concreta
<ProjectWizardStep3
    onChange={setConfig}  // ← implementación real
/>
```

En tests podrías pasar `onChange={() => {}}` (función vacía) y testear Step3 sin base de datos.

---

## 💡 Resumen visual

```
S → assignCircuitToPanel hace UNA cosa
O → agregar tipo de circuito sin romper los existentes
L → cualquier función que cumpla la firma puede pasarse como prop
I → campos opcionales con ? en las interfaces
D → onChange como prop, Step3 no conoce a Supabase
```

---

**→ Siguiente tema: [React y Estado](./03-react-estado.md)**
