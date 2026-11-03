# Changelog (obligatorio)

**Todo cambio que se commitee debe venir con su entrada en [`/CHANGELOG.md`](../../CHANGELOG.md), en el mismo commit.** Un hook de pre-commit lo verifica y bloquea el commit si falta.

## Formato
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) en español + [SemVer](https://semver.org/lang/es/).

- Las entradas nuevas van siempre bajo `## [Sin publicar]`, arriba de todo.
- Categorías, en este orden y solo las que apliquen: `Agregado`, `Cambiado`, `Obsoleto`, `Eliminado`, `Corregido`, `Seguridad`.
- Una línea por cambio, en español, en tiempo pasado implícito y pensada para una persona (no un diff): qué cambió y, si no es obvio, por qué.
- Mencionar archivos, rutas o componentes con `código` cuando ayuda a ubicarlos.
- Los cambios que afectan **costos** (nuevo servicio, más lecturas, cambio de `minInstances`, región) o **seguridad** (reglas, auth, secretos) se escriben explícitamente aunque sean chicos.

```md
## [Sin publicar]

### Agregado
- Componente `ProductCard` en `src/components/features/` para el menú.

### Corregido
- `Select` no mostraba el foco con teclado.
```

## Qué cuenta como cambio
- Sí: código, configuración, dependencias, reglas de seguridad, reglas para agentes (`.agents/`, `AGENTS.md`), `DESIGN.md`, documentación de `docs/`.
- No hace falta entrada (el hook los ignora): solo `pnpm-lock.yaml` sin cambios en `package.json`, o archivos de editor/OS.

## Publicar una versión
1. Renombrar `## [Sin publicar]` a `## [x.y.z] - AAAA-MM-DD` y crear un `## [Sin publicar]` vacío encima.
2. Actualizar `version` en `package.json`.
3. SemVer: `MAJOR` rompe algo para el usuario o el admin, `MINOR` agrega funcionalidad, `PATCH` corrige.

## Saltarse el hook
Solo en casos excepcionales y justificados (commit de merge, revert inmediato): `SKIP_CHANGELOG=1 git commit …`. Un agente de IA **nunca** se salta el hook por su cuenta ni usa `--no-verify`.
