# Estándares de código

## TypeScript
- `strict` siempre. Prohibido `any`; usar `unknown` + narrowing o zod.
- Tipos derivados de esquemas zod (`z.infer<typeof Schema>`) para todo lo que cruza una frontera (formularios, Firestore, APIs).
- Preferir `type` sobre `interface` salvo para extender. Exportar tipos desde `src/lib/types/`.

## React / Next.js 16
- Server Components por defecto. `"use client"` solo en el componente hoja que necesita estado, efectos o eventos.
- No usar `useEffect` para cargar datos. Los datos llegan del servidor por props.
- Formularios con Server Actions + `useActionState`. Mostrar estado pendiente y errores accesibles.
- Respetar Cache Components: `"use cache"` + `cacheLife` en lecturas; APIs dinámicas (`cookies`, `headers`, `searchParams`) dentro de `<Suspense>`.
- Cada ruta con datos tiene `loading.tsx` o un `<Suspense>` con skeleton, y `error.tsx`.
- Metadata (`generateMetadata`) en cada página pública: título, descripción, OG.

## Estilo
- Nombres: componentes `PascalCase.tsx`, utilidades `kebab-case.ts`, hooks `use-*.ts`.
- Un componente por archivo. Archivos de más de ~200 líneas → dividir.
- Imports con alias `@/`. Orden: externos, `@/`, relativos.
- Sin código comentado ni `console.log` en commits. Usar logs estructurados solo en servidor y con moderación (Cloud Logging cobra sobre 50 GiB).
- Textos de UI en español; no hardcodear strings repetidos (centralizar en `src/lib/copy.ts` cuando crezcan).

## Estilos
- Solo Tailwind con los tokens de `globals.css` (`bg-cream`, `text-olive`, `border-olive-line`, `rounded-card`, `font-label`…).
- Prohibido usar colores arbitrarios (`#fff`, `bg-white`, `text-black`, `zinc-*`, `blue-*`). Ver `design-system.md`.
- **Mobile first** (obligatorio): ver `mobile-first.md`. Clases sin prefijo = móvil; probar primero a 375 px.

## Accesibilidad
- HTML semántico (`<main>`, `<nav>`, `<button>` para acciones, `<a>` para navegación).
- Todo `<Image>` con `alt` descriptivo (o `alt=""` si es decorativo).
- Foco visible (ya definido globalmente), objetivos táctiles ≥ 44 px, contraste AA.

## Dependencias
- Antes de agregar un paquete: ¿lo resuelve la plataforma o una utilidad de 20 líneas? Preferir eso.
- Nada que solo funcione en Vercel (`@vercel/*`) — desplegamos en Firebase App Hosting.
- Instalar con `pnpm add`. Fijar versiones mayores.

## Verificación
Antes de dar una tarea por terminada: `pnpm lint && pnpm exec tsc --noEmit && pnpm build`.
