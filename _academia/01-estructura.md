# 01 — Estructura del Proyecto

## ¿Por qué importa la estructura?

Cuando el proyecto tiene 1 archivo, la estructura no importa. Cuando tiene 50+, una mala estructura hace que:
- Tardés 10 minutos en encontrar dónde está algo
- Cambiar una cosa rompa algo en otro lado inesperadamente
- Sea imposible trabajar en equipo

La estructura de OVE sigue el principio de **Separation of Concerns** (Separación de Responsabilidades): cada carpeta tiene UN propósito claro.

---

## 📁 Mapa del proyecto

```
project OVE_V1/
│
├── src/                        ← TODO el código fuente va acá
│   ├── components/             ← Piezas visuales reutilizables (UI)
│   │   ├── wizard/             ← El wizard de 4 pasos para crear proyectos
│   │   │   ├── ProjectWizard.tsx          ← Coordina los 4 pasos
│   │   │   ├── ProjectWizardStep3.tsx     ← Paso 3: tableros y circuitos
│   │   │   ├── WizardStep2_Ambientes.tsx  ← Paso 2: ambientes y bocas
│   │   │   └── panels/                   ← Subcomponentes del panel eléctrico
│   │   └── ui/                 ← Botones, inputs, modales genéricos
│   │
│   ├── lib/                    ← Lógica de negocio PURA (sin UI)
│   │   └── electrical-rules.ts ← Cálculos eléctricos, generación de circuitos
│   │
│   ├── pages/                  ← Cada "página" de la app (una por ruta)
│   │   ├── Dashboard.tsx       ← Página principal
│   │   └── Profile.tsx         ← Perfil de usuario
│   │
│   ├── services/               ← Comunicación con el exterior (Supabase, APIs)
│   │   └── project.service.ts  ← Guardar/cargar proyectos desde la DB
│   │
│   ├── contexts/               ← Estado global compartido entre componentes
│   │   └── AuthContext.tsx     ← ¿Está logueado el usuario? ¿Quién es?
│   │
│   └── App.tsx                 ← Punto de entrada, define las rutas
│
├── _academia/                  ← 📚 Esta carpeta (aprendizaje)
├── public/                     ← Archivos estáticos (favicon, imágenes)
├── .env                        ← Variables secretas (NO va a GitHub)
├── package.json                ← Lista de dependencias del proyecto
└── vite.config.ts              ← Configuración del servidor de desarrollo
```

---

## 🔍 La regla de oro

> **Si no sabés dónde buscar algo, preguntate: ¿es UI, es lógica o es datos?**

- **UI** → `components/`
- **Lógica/cálculos** → `lib/`
- **Datos/base de datos** → `services/`
- **Estado global** → `contexts/`

---

## 🎯 Ejemplo concreto: el bug de triplicación

Cuando debuggeamos la triplicación del circuito, buscamos en:

1. `src/lib/electrical-rules.ts` — ¿los circuitos se generaban duplicados? (**lógica**)
2. `src/components/wizard/ProjectWizardStep3.tsx` — ¿la asignación tenía un race condition? (**UI/lógica combinada**)
3. `src/components/wizard/panels/PanelOutputSection.tsx` — ¿el render duplicaba las claves? (**UI**)

Si todo estuviera en un solo archivo enorme, encontrar el bug hubiera tardado horas.

---

## 🆚 Comparación con Java

En Java también existe esta separación, la conocés como:
- `Model` (datos) → `services/` + `lib/`
- `View` (presentación) → `components/`
- `Controller` (coordinación) → `pages/` + la lógica en los componentes

En React no se llama MVC, pero el concepto es el mismo.

---

**→ Siguiente tema: [SOLID en OVE](./02-solid-en-ove.md)**
