<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PIÙ — Pizza & Dolce · Guía para agentes

Sitio web de la pizzería PIÙ. Este archivo sigue el estándar [AGENTS.md](https://agents.md/): es el punto de entrada para cualquier agente de IA (Claude Code, Cursor, Codex, Copilot, etc.).

> **Mobile first:** la mayoría de los clientes entra desde el celular. Todo se diseña y construye primero para 375 px (ver `.agents/rules/mobile-first.md`).
>
> **Idioma:** contenido, UI y documentación en **español (Chile)**. Identificadores de código en inglés.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, `cacheComponents: true`, Turbopack) |
| UI | React 19, TypeScript estricto, **Tailwind CSS v4**, **shadcn/ui + Radix** adaptados a la marca, íconos **lucide-react** |
| Hosting | **Firebase App Hosting** (Cloud Run + Cloud CDN), backend `piu-pizza-webapp`, región `us-central1`, despliegue automático desde `main` → https://piu-pizza-webapp--piu-pizza-cl.us-central1.hosted.app |
| Backend | Firebase **Auth**, **Cloud Firestore** (Standard), **Cloud Storage** — proyecto `piu-pizza-cl`, todo en `us-central1` |
| Node.js | **24.x** (`engines` en `package.json`, `.nvmrc`) |
| Paquetes | **pnpm** (no usar npm ni yarn) |

Infraestructura: **solo Firebase CLI** (`firebase …`) y la consola web. Sin `gcloud` y sin emuladores.

| Archivo | Qué es |
|---|---|
| `apphosting.yaml` | Config del backend de App Hosting (`runConfig`, variables). Cambiar `minInstances` requiere aprobación |
| `firebase.json` / `.firebaserc` | Proyecto `piu-pizza-cl`, rutas de reglas e índices |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Reglas e índices; se publican con `firebase deploy --only firestore,storage` |
| `src/lib/firebase/client.ts` | Web SDK (navegador) |
| `src/server/firebase/admin.ts` | Admin SDK (solo servidor) |
| `.env.example` | Config web para `.env.local` en desarrollo |

## Comandos

```bash
pnpm install       # instalar dependencias
pnpm dev           # servidor local (http://localhost:3000)
pnpm build         # build de producción — debe pasar antes de dar algo por terminado
pnpm lint          # ESLint
pnpm exec tsc --noEmit   # chequeo de tipos
```

Muestrario de componentes: `http://localhost:3000/ui` (solo en desarrollo).

## Estructura

```
DESIGN.md              ← sistema de diseño (fuente de verdad visual)
CHANGELOG.md           ← historial de cambios (obligatorio)
AGENTS.md              ← este archivo (CLAUDE.md, GEMINI.md, .cursor/rules y .github/copilot-instructions.md apuntan aquí)
.agents/rules/         ← reglas detalladas por tema (leer la relevante antes de codear)
docs/                  ← arquitectura, costos, decisiones e ideas de UX por revisar (docs/ux/)
src/app/               ← rutas (App Router)
src/components/ui/     ← primitivas visuales (ver tabla en .agents/rules/design-system.md)
src/components/features/ ← componentes de dominio (ProductCard, Navbar…)
src/app/(dev)/ui/      ← muestrario interno de componentes
src/lib/               ← utilidades puras y clientes (firebase/ irá aquí)
src/server/            ← código solo-servidor (data access layer, server actions)
public/                ← solo assets estáticos pequeños (logo, favicon, OG)
```

## Reglas (obligatorio leer la que aplique)

| Archivo | Cuándo leerlo |
|---|---|
| [`.agents/rules/architecture.md`](.agents/rules/architecture.md) | Antes de crear rutas, carpetas, server actions o integrar servicios |
| [`.agents/rules/coding-standards.md`](.agents/rules/coding-standards.md) | Siempre que escribas código |
| [`.agents/rules/mobile-first.md`](.agents/rules/mobile-first.md) | **Siempre** que toques UI, layout o formularios |
| [`.agents/rules/design-system.md`](.agents/rules/design-system.md) | Cualquier cambio de UI (resume y apunta a `DESIGN.md`) |
| [`.agents/rules/cost-control.md`](.agents/rules/cost-control.md) | Cualquier cosa que toque datos, caché, rendering o infraestructura |
| [`.agents/rules/images-media.md`](.agents/rules/images-media.md) | Cualquier imagen, video, fuente o archivo subido |
| [`.agents/rules/firebase-security.md`](.agents/rules/firebase-security.md) | Auth, Firestore, Storage, secretos, reglas de seguridad |
| [`.agents/rules/changelog.md`](.agents/rules/changelog.md) | **Siempre**, antes de terminar cualquier tarea que cambie archivos |

## Las reglas que nunca se rompen

1. **Usa los componentes de `src/components/ui/`** antes de escribir HTML/Tailwind a mano.
2. **Mobile first.** Clases sin prefijo = móvil; `sm:`/`md:`/`lg:` solo agregan. Sin scroll horizontal a 360–375 px, controles ≥ 44 px, nada que dependa de hover.
3. **Server Components por defecto.** `"use client"` solo en hojas interactivas.
4. **Toda lectura a Firestore pasa por `src/server/`** y va cacheada (`"use cache"` + `cacheLife`). Nunca leer Firestore en cada request de una página pública.
5. **Nada de listeners en tiempo real (`onSnapshot`)** sin justificación escrita y `limit()`.
6. **Toda query lleva `limit()`** y paginación por cursor. Nunca `offset`.
7. **Imágenes siempre optimizadas** (AVIF/WebP, ≤ 300 KB, `next/image` con `sizes`). Nunca subir fotos crudas de cámara.
8. **`minInstances: 0`** en App Hosting salvo decisión explícita del dueño del proyecto.
9. **Sin login por SMS / Phone Auth** (cobra por mensaje).
10. **Reglas de seguridad deny-by-default** en Firestore y Storage; nunca `allow read, write: if true`.
11. **Secretos solo en Secret Manager / variables de entorno del servidor.** Nunca `NEXT_PUBLIC_` para algo secreto, nunca commitear `.env*`.
12. **Validar todo input del cliente en el servidor** (zod) y verificar auth/rol dentro de cada Server Action.
13. **Todo cambio actualiza `CHANGELOG.md`** bajo `## [Sin publicar]`, en el mismo commit. La versión de `package.json` y la última versión del CHANGELOG van **siempre alineadas**. El hook de pre-commit lo exige; nunca usar `--no-verify`.

## Definición de terminado

- `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build` pasan sin errores.
- La UI respeta `DESIGN.md` (colores, Anybody, radios, espaciado) y pasa el checklist de `.agents/rules/mobile-first.md` (revisada primero a 375 px).
- Componentes nuevos o variantes nuevas aparecen en el muestrario `/ui`.
- No se agregaron lecturas/escrituras sin caché, listeners ni imágenes sin optimizar.
- Si cambió algo de costos o arquitectura, se actualizó `docs/` y/o la regla correspondiente.
- `CHANGELOG.md` tiene la entrada del cambio (ver `.agents/rules/changelog.md`).
