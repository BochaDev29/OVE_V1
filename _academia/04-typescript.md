# 04 — TypeScript: tu red de seguridad

> TypeScript es JavaScript con tipos. Y los tipos son contratos que el compilador verifica antes de que corras el código.
> En Java ya usás tipos todo el tiempo (`String`, `int`, `boolean`). Acá es lo mismo, pero opcional (aunque en OVE lo usamos siempre).

---

## ¿Por qué TypeScript en OVE?

Durante el debugging de la triplicación, el compilador nos mostró esto:

```
El tipo 'string' no se puede asignar al tipo '"R" | "S" | "T" | "RST" | undefined'
```

Esto significa que alguien intentó asignar una fase con un valor que no es válido. TypeScript lo atajó **antes de ejecutar** el código. Sin TypeScript, ese bug aparecería en producción.

---

## Interfaces: el contrato de los datos

En `src/lib/electrical-rules.ts` (línea ~395):

```typescript
export interface CircuitInventoryItem {
    id: string;                          // texto, obligatorio
    type: string;                        // texto, obligatorio
    bocas: number;                       // número, obligatorio
    assignedPanelId?: string;            // texto, OPCIONAL (el ? indica opcional)
    isAssigned: boolean;                 // verdadero/falso, obligatorio
    assignedPhase?: 'R' | 'S' | 'T' | 'RST'; // solo estos 4 valores posibles
}
```

**Esto es exactamente como una `interface` en Java**, excepto que:
- El `?` hace el campo opcional (en Java usarías `@Nullable`)
- `'R' | 'S' | 'T'` es un "union type" — solo esos valores son válidos (en Java sería un `enum`)

---

## Union Types: valores posibles predefinidos

```typescript
// En vez de String libre (que podría ser cualquier cosa)
assignedPhase: string; // ❌ podría ser "fase1", "ROJO", lo que sea

// Union type: solo estos valores son válidos
assignedPhase: 'R' | 'S' | 'T' | 'RST'; // ✅ el compilador verifica
```

**Equivalente en Java**: un `enum Phase { R, S, T, RST }`

---

## Generics: funciones reutilizables con tipos

```typescript
// Esta función sirve para cualquier tipo T
function getItemById<T extends { id: string }>(items: T[], id: string): T | undefined {
    return items.find(item => item.id === id);
}

// Uso con circuitos
const circuit = getItemById<CircuitInventoryItem>(circuits, 'IUG-1');
// TypeScript sabe que circuit es CircuitInventoryItem | undefined
```

**Equivalente en Java**: Generics `<T>` — exactamente el mismo concepto.

---

## Type vs Interface

En OVE verás ambas:

```typescript
// interface: para objetos que pueden extenderse
interface CircuitInventoryItem {
    id: string;
    // ...
}

// type: para aliases o unions complejos
type Phase = 'R' | 'S' | 'T' | 'RST';
type VoltageType = '220V' | '380V';
```

**Regla práctica**: usá `interface` para objetos, `type` para todo lo demás.

---

## El operador `?.` (optional chaining)

```typescript
// Sin optional chaining (Java style):
if (config !== null && config.circuitInventory !== null) {
    const circuits = config.circuitInventory.circuits;
}

// Con optional chaining (TypeScript moderno):
const circuits = config?.circuitInventory?.circuits;
// Si config o circuitInventory son null/undefined, devuelve undefined en vez de crashear
```

Lo verás constantemente en OVE porque muchos campos son opcionales.

---

## El operador `??` (nullish coalescing)

```typescript
// Si el valor es null o undefined, usar el default
const panelId = config.assignedPanelId ?? 'TP-MAIN';
// Equivalente en Java: config.getAssignedPanelId() != null ? config.getAssignedPanelId() : "TP-MAIN"
```

---

## ¿Cómo TypeScript te ayudó en el debugging?

Cuando cambiamos `env.name` por `env.id` en el generador de circuitos, TypeScript verificó que `env.id` efectivamente existiera en el tipo `EnvironmentCalculation`. Si no existiera, hubiera marcado error antes de correr el código.

---

## Resumen

| Concepto Java | Equivalente TypeScript |
|---------------|----------------------|
| `interface` | `interface` (igual) |
| `enum` | `'A' \| 'B' \| 'C'` (union type) |
| `@Nullable T` | `T \| undefined` o `T?` |
| `<T>` Generics | `<T>` Generics (igual) |
| `Object` | `any` (evitar!) |
| `null check` | `?.` (optional chaining) |

---

**→ Siguiente tema: [Seguridad y Supabase](./05-seguridad.md)**
