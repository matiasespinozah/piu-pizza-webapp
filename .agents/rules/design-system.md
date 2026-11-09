# Sistema de diseño

**La fuente de verdad es [`/DESIGN.md`](../../DESIGN.md).** Léelo completo antes de diseñar una pantalla o un componente nuevo. Este archivo resume lo esencial y documenta la librería de componentes.

## Tokens (`src/app/globals.css`)

| Uso | Clase Tailwind | Valor |
|---|---|---|
| Fondo general | `bg-background` / `bg-cream` | `#E8E9D9` |
| Texto, botones, iconos | `text-foreground` / `bg-primary` / `text-olive` | `#2B341F` |
| Acción sobre foto | `bg-terracotta` / `text-terracotta-soft` | `#9C422F` / `#E7B5A2` |
| Párrafo principal | `text-olive-strong` | olivo 85% |
| Metadatos | `text-muted-foreground` / `text-olive-muted` | olivo 66% |
| Bordes de inputs | `border-input` / `border-olive-soft` | olivo 40% |
| Bordes de cards, divisores | `border-border` / `border-olive-line` | olivo 18% |
| Hover | `bg-accent` / `bg-olive-hover` | olivo 6% |
| Superficie secundaria | `bg-surface-raised` / `bg-popover` | `#F0F0E4` |
| Tipografía | `font-sans` / `font-heading` | Anybody 400–900 |
| Etiquetas / precios | `font-label` | Roboto Mono 500–700 |
| Sombras | `shadow-tactile` · `shadow-lift` · `shadow-hover` · `shadow-overlay` | DESIGN.md §6 |

**Escala de radios redefinida** (para que shadcn caiga en los valores de marca):
`rounded-sm/md` = 4 px · `rounded-lg` = 6 px (botones, inputs) · `rounded-xl` = 12 px (cards, imágenes) · `rounded-2xl` = 16 px (contenedores) · `rounded-4xl` = pill.

Los tokens semánticos de shadcn (`primary`, `muted`, `border`, …) están mapeados a la marca. **No hay modo oscuro**: la variante `dark:` solo se activa con una clase `.dark` que nunca se aplica. **No hay color de error**: los errores se comunican con texto + ícono (`FieldError`).

## Reglas
- **Nunca** blanco puro, negro, grises (`zinc-*`, `gray-*`, `neutral-*`), azules, rojos ni gradientes. Nada de colores arbitrarios (`bg-[#…]`).
- **Única excepción: estados de reserva.** `ReservationStatusBadge` y el stepper de `/reservas/estado` usan los tokens `status-*` (ámbar, verde, verde fuerte, rojo suave) de DESIGN.md §2 · Colores de estado, a través de `src/lib/reservations/status-tone.ts`. No los uses fuera de estados de reserva, y siempre con ícono y texto.
- Botón primario = `<Button>`; secundario = `<Button variant="secondary">`. No estilizar `<button>` a mano.
- Titulares con `<Heading>` / `<Display>`; no poner `text-5xl font-black` sueltos.
- **No reconstruir el logo con texto.** `<Logo>` es un placeholder hasta tener el SVG oficial.
- **Mobile first**: todo componente se diseña primero a 375 px (ver `mobile-first.md`). Objetivos táctiles ≥ 44 px en móvil; no reducirlos con `className`.
- Fotografía real; nunca inventar productos, precios o claims (DESIGN.md §4).

## Librería de componentes (`src/components/ui/`)

| Componente | Archivo | Notas |
|---|---|---|
| `Button` | `button.tsx` | `primary` · `secondary` · `tertiary` (flecha) · `ghost` · `link` · `accent` (terracota) · `onPhoto` (borde crema); tamaños `sm` `md` `lg` `icon` `icon-sm`; `loading`; `asChild` para envolver `<Link>` |
| `TextLink` | `text-link.tsx` | Envuelve `next/link`. `inline` · `nav` (usa `aria-current="page"`) · `standalone`; `external` |
| `Heading`, `Display`, `Text`, `Lead`, `Caption`, `Eyebrow` | `typography.tsx` | `as` = nivel semántico, `size` = tamaño visual |
| `Price`, `formatCLP` | `price.tsx` | Entero en CLP; `compareAt` solo si hay rebaja real |
| `Badge` | `badge.tsx` | Pill. `outline` · `solid` · `soft` |
| `Card` + `CardMedia`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `card.tsx` | `variant`: default · raised · plain; `size`: compact · default · feature; `interactive` |
| `Container`, `Section`, `Stack` | `layout.tsx` | Máx. 1200 px; ritmo vertical de DESIGN.md §5 |
| `Input`, `Textarea`, `Label`, `Field*`, `Select`, `Checkbox`, `RadioGroup` | varios | Siempre dentro de `Field` con `FieldLabel` y `FieldError` |
| `Tabs` | `tabs.tsx` | Pill (Pizza / Dolce) o `variant="line"` |
| `Accordion`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip` | varios | Radix vía shadcn/ui |
| `Toaster` + `toast()` de `sonner` | `sonner.tsx` | Ya montado en el layout raíz |
| `Skeleton`, `Separator`, `VisuallyHidden`, `Logo` | varios | — |

**Muestrario:** `http://localhost:3000/ui` (solo en desarrollo; en producción da 404). Todo componente nuevo o variante nueva se agrega ahí.

## Agregar un componente de shadcn
1. `pnpm dlx shadcn@latest add <componente>`
2. Revisar el archivo generado y adaptarlo: alturas ≥ 44 px en controles, radios de la escala, sin `ring-*` de shadcn en el foco (usar `focus-visible:outline-2 focus-visible:outline-ring`), textos en español (`Close` → `Cerrar`), sin `bg-black`/`bg-white`.
3. Agregarlo al muestrario `/ui` y a la tabla de arriba.
4. Los componentes de dominio (ProductCard, Navbar, Hero…) van en `src/components/features/`, no en `ui/`.
