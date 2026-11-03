# PIÙ — Pizza & Dolce

Sitio web de PIÙ. Next.js 16 + Tailwind v4, pensado para desplegarse en Firebase App Hosting (Auth, Firestore y Storage en `us-central1`).

## Empezar

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

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

Solo la base del proyecto. Firebase, GitHub y el despliegue todavía no están configurados.
