# Catálogo y `/carta` (solo frontend)

La carta funciona con datos locales en memoria: sin Firebase, sin red y sin credenciales.

| Capa | Archivo |
|---|---|
| Contratos (`Category`, `Product`) | `src/lib/catalog/types.ts` |
| Datos locales (única fuente para Home y `/carta`) | `src/lib/catalog/data.ts` |
| Acceso a datos (`CatalogDataSource`) | `src/lib/catalog/catalog-data-source.ts` |
| Búsqueda local (sin acentos) | `src/lib/catalog/search.ts` |
| Interfaz | `src/components/features/menu/` y `src/app/carta/page.tsx` |

Hoy solo «Sugerencias del chef» tiene productos (los tres confirmados). Las demás categorías existen en `data.ts`, sin productos, y la interfaz las muestra como «En preparación».

## Conectar Firestore más adelante (no implementado)

El contrato de las colecciones `categories` y `products` ya está en `docs/arquitectura/firebase.md`. `/carta` sigue usando `localCatalogDataSource`. No cambiar ese punto hasta el hito del catálogo.

1. `src/server/dal/catalog.ts` ya lee solo documentos visibles, con `limit()`, y no se usa. Al conectarlo: agregar `"use cache"` + `cacheLife` + `cacheTag("catalog")` y mapear al contrato `Category` / `Product`.
2. Implementar `CatalogDataSource` sobre ese DAL y cambiar el único punto de intercambio: `catalogDataSource` en `catalog-data-source.ts`.
3. Los componentes (`MenuExplorer`, `ProductList`, `ChefSuggestions`…) no cambian: reciben `Category[]` y `Product[]` por props.
4. Las fotografías llegan en `imageUrl`; los orígenes remotos deben declararse en `images.remotePatterns` (ver `images-media.md`).
5. Invalidar con `updateTag("catalog")` desde las Server Actions del futuro panel.
