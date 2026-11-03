# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).
Las reglas para mantenerlo están en [`.agents/rules/changelog.md`](.agents/rules/changelog.md).

## [Sin publicar]

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
- Este `CHANGELOG.md`, la regla `.agents/rules/changelog.md` y un hook de pre-commit que exige actualizarlo.
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
