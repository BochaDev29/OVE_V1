# 05 — Seguridad y Supabase

> La seguridad no es una feature que se agrega al final. En OVE está integrada desde la arquitectura.
> Este archivo explica cómo funciona la autenticación, qué protege los datos, y qué podría salir mal.

---

## ¿Qué es Supabase?

Supabase es un **Backend as a Service (BaaS)**: una base de datos PostgreSQL + autenticación + APIs, todo en la nube. En vez de escribir un servidor backend (Node, Java Spring, etc.), usás Supabase directamente desde el frontend.

```
Tu app (React)  →  Supabase API  →  PostgreSQL
```

---

## Autenticación: ¿cómo sabe Supabase quién sos?

### El flujo de login

1. El usuario ingresa email + contraseña
2. Supabase verifica las credenciales y devuelve un **JWT** (JSON Web Token)
3. El JWT se guarda en el navegador (localStorage o cookie)
4. Cada request siguiente incluye el JWT en el header

```
POST /auth/v1/token
{ email: "usuario@mail.com", password: "..." }
↓
{ access_token: "eyJhbGci..." } ← JWT
```

### ¿Qué es un JWT?

Es una cadena de texto en 3 partes separadas por puntos:
```
eyJhbGci.eyJ1c2VySWQ.HMAC_signature
  header    payload      firma
```

El **payload** contiene datos del usuario (id, email, rol). La **firma** garantiza que nadie alteró el token. El servidor verifica la firma sin consultar la base de datos en cada request → muy rápido.

**Podés decodificar cualquier JWT en**: https://jwt.io (los datos son legibles, por eso nunca pongas datos sensibles en el payload)

---

## Row Level Security (RLS): el guardián de los datos

### El problema sin RLS

Sin restricciones, cualquier usuario podría hacer:
```sql
SELECT * FROM projects; -- ← devolvería proyectos de TODOS los usuarios
```

### La solución: RLS en Supabase

```sql
-- Política de seguridad en la tabla projects
CREATE POLICY "usuarios solo ven sus propios proyectos"
ON projects
FOR SELECT
USING (auth.uid() = user_id);
-- auth.uid() = el ID del usuario autenticado (del JWT)
-- user_id   = columna en la tabla que indica el dueño del proyecto
```

Con esta política, aunque alguien intente `SELECT * FROM projects`, Supabase filtra automáticamente y solo devuelve los proyectos donde `user_id = su_id`.

**Es como un `WHERE user_id = :currentUser` que se aplica automáticamente en TODAS las queries.**

---

## Variables de entorno: secretos fuera del código

En el proyecto verás un archivo `.env`:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### ¿Por qué no hardcodear estos valores en el código?

```typescript
// ❌ MAL: este archivo va a GitHub y todo el mundo puede verlo
const supabase = createClient("https://xxx.supabase.co", "eyJhbGci...");

// ✅ BIEN: el valor viene de la variable de entorno
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

El `.env` está en el `.gitignore` y **nunca se sube a GitHub**. Cada developer tiene su propio `.env` local.

### La ANON KEY no es tan secreta

La `ANON_KEY` de Supabase es una **clave pública** — cualquier usuario puede verla en los headers del navegador (F12 → Network). Está diseñada así. La seguridad real viene del RLS, no de ocultar esta key.

Lo que SÍ debe mantenerse secreto es la **SERVICE_ROLE_KEY** que bypasea el RLS. Esa NUNCA va al frontend.

---

## El contexto de autenticación en OVE

En `src/contexts/AuthContext.tsx`:

```typescript
// Provee el usuario actual a toda la app
const AuthContext = createContext<{ user: User | null }>({ user: null });

// Uso en cualquier componente:
const { user } = useContext(AuthContext);
if (!user) return <Redirect to="/login" />;
```

Esto es el **Dependency Inversion** aplicado a la autenticación: los componentes no saben cómo funciona el auth, solo preguntan "¿hay un usuario?" al contexto.

---

## Posibles vulnerabilidades a conocer

| Vulnerabilidad | ¿Qué es? | ¿Cómo OVE se protege? |
|---------------|----------|----------------------|
| **XSS** | Inyectar JavaScript malicioso en la UI | React escapa el HTML por defecto |
| **SQL Injection** | Manipular queries con input de usuario | Supabase usa queries parametrizadas |
| **IDOR** | Acceder a recursos de otro usuario por ID | RLS en Supabase bloquea acceso cruzado |
| **Token steal** | Robar el JWT para hacerse pasar por el usuario | Tokens de corta duración + HTTPS |

---

## Resumen del flujo seguro en OVE

```
1. Usuario hace login
        ↓
2. Supabase devuelve JWT
        ↓
3. JWT se guarda en el navegador
        ↓
4. Cada request incluye JWT en header
        ↓
5. Supabase verifica JWT y aplica RLS
        ↓
6. Solo devuelve datos del usuario autenticado
```

---

*Esta carpeta seguirá creciendo. Podés pedirle al asistente que agregue un nuevo archivo de academia cuando trabajen en un tema nuevo.*
