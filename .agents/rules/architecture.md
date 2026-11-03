# Arquitectura

## Visión general

```
Navegador ──► Firebase App Hosting
                ├─ Cloud CDN  (HTML estático, RSC prerender, /_next/static, imágenes optimizadas)
                └─ Cloud Run  (Next.js SSR, Server Actions, Route Handlers)
                       ├─ Firebase Admin SDK ──► Firestore · Storage · Auth (verificación)
                       └─ Secret Manager (credenciales)
Navegador ──► Firebase Auth (login con Web SDK) ──► cookie de sesión verificada en servidor
```

Diagrama completo: `docs/arquitectura/arquitectura.svg`. Todo vive en **`us-central1`** (única región con todas las cuotas gratuitas, incluida la de Storage). La región de Firestore y Storage **no se puede cambiar** después de crearlas.

## Principios

1. **Server-first.** Las páginas son Server Components. El cliente recibe HTML + el mínimo JS.
2. **El servidor es el único que habla con Firestore para datos públicos** (menú, locales, horarios). El cliente usa el Web SDK solo para Auth y, si se justifica, para datos privados del propio usuario.
3. **Cachear por defecto.** Con `cacheComponents: true`, el contenido público se prerenderiza y se sirve desde CDN. Lo dinámico se aísla en `<Suspense>`.
4. **Una sola fuente de verdad por dato.** Nada de duplicar el menú en JSON local y en Firestore.

## Capas y carpetas

| Carpeta | Responsabilidad | Puede importar |
|---|---|---|
| `src/app/` | Rutas, layouts, `loading`/`error`, metadata. Delgado: compone componentes y llama al DAL | `components`, `server`, `lib` |
| `src/components/ui/` | Primitivas visuales (shadcn/ui adaptado a DESIGN.md). Sin lógica de negocio | `lib` |
| `src/components/features/` | Componentes de dominio (`MenuGrid`, `PizzaCard`) | `ui`, `lib` |
| `src/server/` | **Solo servidor**: Data Access Layer (`dal/`), Server Actions (`actions/`), Admin SDK. Cada archivo empieza con `import "server-only"` | `lib` |
| `src/lib/` | Utilidades puras, tipos, esquemas zod, cliente Web SDK (`lib/firebase/client.ts`) | — |

Reglas de dependencia: `components` **nunca** importa de `server`. Los datos llegan por props desde la página.

## Data Access Layer (DAL)

- Toda lectura/escritura a Firestore vive en `src/server/dal/<entidad>.ts`.
- Las funciones de lectura pública usan `"use cache"` + `cacheLife(...)` + `cacheTag("<entidad>")`.
- Las mutaciones (Server Actions en `src/server/actions/`) validan con zod, verifican sesión/rol, escriben, y luego `updateTag("<entidad>")` (lectura inmediata de lo escrito, solo en Server Actions) o `revalidateTag("<entidad>", "max")` (stale-while-revalidate; también en Route Handlers). La forma de un solo argumento de `revalidateTag` está deprecada.
- Devolver DTOs mínimos (solo los campos que la UI necesita), nunca el documento crudo ni datos de otros usuarios.

```ts
// src/server/dal/menu.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export async function getMenu() {
  "use cache";
  cacheLife("hours");
  cacheTag("menu");
  // const snap = await db.collection("products").where("active", "==", true).limit(100).get();
  // return snap.docs.map(toProductDTO);
}
```

## Rendering

- Páginas públicas (home, menú, locales): **estáticas/prerender** + revalidación por tag cuando el admin edita.
- Áreas autenticadas (cuenta, admin): dinámicas, dentro de `<Suspense>`, nunca cacheadas con datos de usuario en caché compartida.
- Leer `cookies()`/`headers()` solo dentro del componente que lo necesita, no en el layout raíz (eso vuelve dinámico todo el árbol).

## Integraciones

- No agregar servicios externos (pagos, mapas, analytics, email) sin dejarlo documentado en `docs/` con su costo.
- Cloud Functions solo para lo que no cabe en Next.js (triggers de Firestore/Storage, cron). Preferir Server Actions.
- Antes de usar una API de Next.js, leer su guía en `node_modules/next/dist/docs/` (la versión 16 cambió mucho).
