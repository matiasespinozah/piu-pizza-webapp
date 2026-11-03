# PIÙ — Pizza & Dolce

Sitio web de PIÙ. Next.js 16 + Tailwind v4, pensado para desplegarse en Firebase App Hosting (Auth, Firestore y Storage en `us-central1`).

## Empezar

```bash
fnm use        # Node 24 (ver .nvmrc)
pnpm install
cp .env.example .env.local
pnpm dev        # http://localhost:3000
```

## Ramas, CI y despliegue

- **`feature/*` y `feat/*`:** ramas de trabajo, creadas desde `develop`. El CI corre en cada push.
- **`develop`:** integración. GitHub Actions (`.github/workflows/ci.yml`) corre lint, tipos, changelog/versiones y build en cada push y PR.
- **`main`:** producción. Solo se actualiza mergeando `develop` con el CI en verde.

## Despliegue

- **Producción:** Firebase App Hosting, proyecto `piu-pizza-cl`, backend `piu-pizza-webapp`, región `us-central1`. Cada push a `main` despliega automáticamente.
- **URL:** https://piu-pizza-webapp--piu-pizza-cl.us-central1.hosted.app
- **Estado del backend:** `firebase apphosting:backends:list`
- **Reglas de Firestore y Storage:** `firebase deploy --only firestore,storage` (no se despliegan con el push).
- Configuración del backend: `apphosting.yaml`.

`pnpm install` activa el hook de pre-commit (`.githooks/`) que exige actualizar `CHANGELOG.md` en cada commit.

## Documentación

| Archivo | Contenido |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Guía para agentes de IA: stack, comandos, reglas clave |
| [`.agents/rules/`](.agents/rules/) | Reglas de arquitectura, código, diseño, costos, imágenes y seguridad |
| [`DESIGN.md`](DESIGN.md) | Sistema de diseño de la marca |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de cambios (obligatorio en cada commit) |
| [`docs/arquitectura/`](docs/arquitectura/) | Diagrama de arquitectura en Firebase |
| [`docs/costos/`](docs/costos/) | Análisis de costos y estimaciones por volumen de usuarios |
| [`docs/ux/`](docs/ux/) | Referencias e ideas de usabilidad por revisar (p. ej. `ideas-niusushi.md`) |

## Estado

Base del proyecto desplegada en Firebase App Hosting (versión de humo). Sin funcionalidades de negocio todavía.
