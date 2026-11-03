# Changelog (obligatorio)

**Todo cambio que se commitee debe venir con su entrada en [`/CHANGELOG.md`](../../CHANGELOG.md), en el mismo commit.**

**La versión de `package.json` y la última versión publicada del CHANGELOG deben ser siempre la misma.** Nunca pueden quedar desalineadas: si cambia una, cambia la otra en el mismo commit.

Un hook de pre-commit (`scripts/check-changelog.mjs`) verifica las tres cosas y bloquea el commit si alguna falla:
1. Hay cambios y `CHANGELOG.md` no está en el commit.
2. `package.json.version` ≠ primera versión `## [x.y.z]` del CHANGELOG.
3. La versión cambió en un archivo pero no se commitean los dos juntos.

Se puede correr a mano con `pnpm changelog:check`.

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
Siempre en **un solo commit** que toque los dos archivos:
1. En `CHANGELOG.md`: mover las entradas de `## [Sin publicar]` a un nuevo `## [x.y.z] - AAAA-MM-DD` justo debajo, dejando `## [Sin publicar]` vacío arriba.
2. En `package.json`: `"version": "x.y.z"` (o `pnpm version x.y.z --no-git-tag-version`).
3. Actualizar los links de comparación al final del CHANGELOG:
   ```md
   [Sin publicar]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/vx.y.z...HEAD
   [x.y.z]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/vANTERIOR...vx.y.z
   ```
4. Commit `chore(release): vx.y.z` y tag `vx.y.z`.
5. SemVer: `MAJOR` rompe algo para el cliente o el admin, `MINOR` agrega funcionalidad, `PATCH` corrige.

Mientras el proyecto esté en `0.x`, una funcionalidad nueva sube el `MINOR` (0.1.0 → 0.2.0) y una corrección el `PATCH` (0.2.0 → 0.2.1).

## Saltarse el hook
Solo en casos excepcionales y justificados (commit de merge, revert inmediato): `SKIP_CHANGELOG=1 git commit …`. Esto salta solo la regla 1; **la alineación de versiones se verifica siempre**. Un agente de IA **nunca** se salta el hook por su cuenta ni usa `--no-verify`.
