# 03 — React y Estado

> Este tema es el más importante para entender cómo funciona cualquier app web moderna.
> Y lo vemos con el **bug real que debuggeamos**: la triplicación de circuitos.

---

## ¿Qué es "estado"?

En Java, el estado de un objeto son sus campos:
```java
class Circuito {
    String id;
    boolean isAsignado; // ← esto es el "estado"
}
```

En React, el estado de un componente es lo que determina **qué se muestra en pantalla**. Cuando el estado cambia, el componente se re-renderiza (se redibuja).

---

## useState — El estado básico

```typescript
// Declarar estado
const [config, setConfig] = useState<ProjectConfig>(initialConfig);
//     ↑ valor    ↑ función para cambiarlo
```

**Regla de oro**: **NUNCA modificar el estado directamente**. Siempre usar la función setter.

```typescript
// ❌ MAL (no dispara re-render)
config.panels.push(newPanel);

// ✅ BIEN (dispara re-render)
setConfig({ ...config, panels: [...config.panels, newPanel] });
```

El `...` (spread operator) crea un nuevo objeto en vez de mutar el existente. Esto es como hacer un `clone()` en Java.

---

## useEffect — Efectos secundarios

`useEffect` corre código **después** de que el componente se renderiza, cuando ciertas dependencias cambian.

```typescript
useEffect(() => {
    // este código corre cuando cambia config.includesPillar
    console.log("pillar cambió!");
}, [config.includesPillar]); // ← dependencias
```

### ⚠️ El bug de triplicación: `useEffect` mal usado

Este fue el bug que debuggeamos. Había un `useEffect` con esta dependencia:

```typescript
useEffect(() => {
    // generaba el inventario CAD
    const cad = generateCircuitInventoryForCAD(config);
    onChange({ ...config, circuitInventoryForCAD: cad });
}, [config.circuitInventory?.circuits]); // ← EL PROBLEMA
```

**¿Por qué fallaba?** Porque `config.circuitInventory.circuits` es un **array**. En JavaScript, dos arrays con el mismo contenido NO son iguales si son objetos distintos en memoria:

```javascript
[1, 2, 3] === [1, 2, 3] // → false !! (distintas referencias)
```

Entonces:
1. Usuario asigna circuito → se llama `onChange` con config nueva
2. React re-renderiza → `config.circuitInventory.circuits` es un array NUEVO (por el `.map()`)
3. `useEffect` detecta el cambio (referencia distinta) → corre de nuevo
4. Llama `onChange` otra vez → otro re-render → loop

**La solución**: eliminar el `useEffect` y hacer todo en una sola función `applyChange`.

---

## useRef — Referencia que no dispara re-render

```typescript
const configRef = useRef(config);
configRef.current = config; // actualizar sin re-renderizar
```

`useRef` es como tener un "puntero" a un valor. Útil para leer el valor más reciente dentro de callbacks o useEffects sin agregarlos como dependencias.

**Analogía Java**: es como tener un `AtomicReference<Config>` que podés leer en cualquier thread sin causar eventos.

---

## El flujo de datos en OVE (top-down)

```
ProjectWizard.tsx
  └── config (estado centralizado aquí)
       │
       ├── onChange={setConfig} ← función que actualiza el estado
       │
       └── <ProjectWizardStep3
               config={config}    ← config baja como prop (lectura)
               onChange={...}     ← función sube como prop (escritura)
           />
```

**Los datos fluyen hacia abajo (props), las actualizaciones suben hacia arriba (callbacks).**

Esto se llama "flujo de datos unidireccional" — es el corazón de React.

---

## Resumen: los 3 hooks más usados en OVE

| Hook | Para qué | Cuándo re-renderiza |
|------|----------|---------------------|
| `useState` | Guardar estado que afecta la UI | Cuando se llama el setter |
| `useEffect` | Efectos secundarios (fetch, timers) | Cuando cambian las dependencias |
| `useRef` | Guardar valor sin afectar UI | Nunca (no dispara re-render) |

---

**→ Siguiente tema: [TypeScript](./04-typescript.md)**
