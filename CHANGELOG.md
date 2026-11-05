# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).
Las reglas para mantenerlo están en [`.agents/rules/changelog.md`](.agents/rules/changelog.md).


## [Sin publicar]

### Agregado

- Home cinematográfica en `/`: fotografía de la mesa, navegación y secciones editoriales. El titular lleva una ola tricolor que vuelve al marfil y se detiene si se pide menos movimiento.
- Hero a `88svh`, con la marca PIÙ proporcionada al titular, botones de la misma altura y barra más sobria al desplazar.
- Hero móvil en dos zonas: bloque oliva con marca y copy, y fotografía gastronómica debajo, sin texto sobre la pizza. El escritorio no cambia.
- CI en GitHub Actions para la rama `develop` (`.github/workflows/ci.yml`): lint, tipos, changelog/versiones alineadas y build, en cada push y PR.
- Rama `develop` como rama de trabajo; `main` queda solo para producción.
- El CI también corre en cada push a ramas `feature/**` y `feat/**`, exigiendo la entrada del CHANGELOG respecto de `develop`.
- El CI vuelve a correr al editar un PR (por ejemplo, al cambiar su rama base), para que los checks reflejen la base actual.
- El CI también corre en PRs hacia `main`, con el job **"PR a main solo desde develop"**, que falla si el PR no viene de `develop`. Ambos jobs son checks obligatorios en los rulesets de GitHub.
- Script `pnpm typecheck` (`next typegen && tsc --noEmit`: genera los tipos de rutas de Next antes de chequear, necesario en un clon limpio como el CI).
- Modo CI en `scripts/check-changelog.mjs` (`CHANGELOG_BASE`): en un PR exige entrada en el CHANGELOG respecto de la rama base.

## [0.2.0] - 2026-11-03

### Agregado

- Versión de humo desplegada en Firebase App Hosting: backend `piu-pizza-webapp` (`us-central1`, Node 24), con lanzamientos automáticos desde `main`. URL: https://piu-pizza-webapp--piu-pizza-cl.us-central1.hosted.app
- Infraestructura Firebase en el proyecto `piu-pizza-cl` (`us-central1`): app web "PIU Pizza Web", Cloud Firestore (Standard), Cloud Storage (`piu-pizza-cl.firebasestorage.app`) y Authentication con email/contraseña y Google.
- `apphosting.yaml` con `minInstances: 0`, `maxInstances: 10`, 1 vCPU, 512 MiB y la config web en `NEXT_PUBLIC_FIREBASE_*`.
- `firebase.json`, `.firebaserc`, `firestore.rules` y `storage.rules` (deny by default) y `firestore.indexes.json`.
- SDKs `firebase` (cliente, `src/lib/firebase/client.ts`) y `firebase-admin` (servidor, `src/server/firebase/admin.ts`, con `server-only`).
- `.env.example` y `.nvmrc`; `engines.node` en `24.x`.

### Cambiado

- `.agents/rules/firebase-security.md`: sin emuladores, infraestructura solo con Firebase CLI, reglas publicadas solo desde el repo.
- `pnpm-workspace.yaml` declara los scripts de instalación permitidos (exigido por pnpm 11).
- Proveedores de Auth definidos: email/contraseña y Google, sin enlace por email ni SMS. Nombre y teléfono se pedirán como datos de perfil. Actualizados `cost-control.md`, `firebase-security.md`, `docs/ux/ideas-niusushi.md`, el diagrama y el informe de costos.

### Seguridad

- Reglas de Firestore y Storage publicadas en modo deny-by-default.

## [0.1.0] - 2026-11-03

### Agregado

- Documento `docs/ux/ideas-niusushi.md` con ideas de usabilidad tomadas de niusushi.cl e ideas de implementación para PIÙ (por revisar, no implementado).
- Regla obligatoria **mobile first** (`.agents/rules/mobile-first.md`), cargada en `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor y Copilot.
- `viewport` en el layout raíz (`device-width`, `viewportFit: "cover"`, `themeColor` crema) y utilidades `pb-safe`, `pt-safe`, `px-safe` para safe areas.
- Estilos base móviles: sin destello al tocar, `touch-action: manipulation`, `text-size-adjust` y respeto de `prefers-reduced-motion`.
- Librería de componentes UI en `src/components/ui/` basada en shadcn/ui + Radix y adaptada a `DESIGN.md`:
  - `Button` (primary, secondary, tertiary, ghost, link; tamaños sm/md/lg/icon; estado `loading`; `asChild`).
  - `TextLink` (inline, nav, standalone, `external`), `Badge`, `Price` con formato CLP.
  - Tipografía: `Heading`, `Display`, `Text`, `Lead`, `Caption`, `Eyebrow`.
  - Layout: `Container`, `Section`, `Stack`.
  - `Card` con `CardMedia`, variantes default/raised/plain, tamaños compact/default/feature e `interactive`.
  - Formularios: `Input`, `Textarea`, `Label`, `Field`, `Select`, `Checkbox`, `RadioGroup`.
  - `Tabs`, `Accordion`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Toaster` (sonner), `Skeleton`, `Separator`, `VisuallyHidden`.
  - `Logo` como placeholder hasta contar con el SVG oficial.
- Muestrario interno de componentes en `/ui` (solo en desarrollo; 404 en producción).
- Tokens de marca en `globals.css` mapeados a los tokens semánticos de shadcn/ui, escala de radios y sombras de `DESIGN.md`.
- Carga automática de reglas para agentes de IA: `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc` y `.github/copilot-instructions.md`, todos apuntando a `AGENTS.md` y `.agents/rules/`.
- Este `CHANGELOG.md`, la regla `.agents/rules/changelog.md` y un hook de pre-commit que exige actualizarlo y que la versión de `package.json` coincida con la última versión publicada del changelog.
- Proyecto base Next.js 16.4 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS v4 y pnpm.
- Fuentes Anybody y Roboto Mono vía `next/font`.
- `DESIGN.md` con el sistema de diseño de la marca.
- `AGENTS.md` y reglas en `.agents/rules/`: arquitectura, estándares de código, sistema de diseño, control de costos, imágenes y seguridad con Firebase.
- Documentación en `docs/`: informe de costos de Firebase (`docs/costos/PIU-costos-firebase.pdf`) y diagrama de arquitectura (`docs/arquitectura/`).

### Cambiado

- `Button` (`sm`, `icon-sm`) y `Select` (`sm`) miden 44 px en móvil y se compactan a 40 px solo desde `md:`.

### Seguridad

- Headers HTTP por defecto: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` y `Permissions-Policy`; `poweredByHeader` desactivado.

### Eliminado

- Assets e íconos de ejemplo de create-next-app, la fuente Geist, el modo oscuro de shadcn/ui y la dependencia `next-themes`.

[Sin publicar]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/matiasespinozah/piu-pizza-webapp/releases/tag/v0.1.0
