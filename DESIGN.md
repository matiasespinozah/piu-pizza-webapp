# PIÙ — Design System

> **Marca:** PIÙ — Pizza & Dolce  
> **Dirección visual:** calidez editorial italiana + minimalismo funcional inspirado en la estructura de Lovable.  
> **Fuente de verdad:** el logotipo de PIÙ y sus dos colores. Este documento reemplaza las decisiones de marca del diseño de referencia de Lovable; no debe copiar su identidad.

## 1. Visual Theme & Atmosphere

PIÙ debe sentirse como una pizzería y dolceria italiana contemporánea: artesanal, cálida, segura de sí misma, juguetona sin ser infantil y muy apetecible. Mantener de Lovable su espacio generoso, interfaces limpias, contención mediante bordes finos, sombras discretas y jerarquía editorial. Sustituir su estética de software por una identidad gastronómica centrada en el producto, la fotografía y el carácter tipográfico.

El fondo principal es un **crema verdoso** (`#E8E9D9`), y el texto, las formas y las llamadas a la acción son **verde oliva muy oscuro** (`#2B341F`). Son los colores dominantes medidos de la imagen de referencia del logo. No cambiar a blanco puro, negro neutro, azules de interfaz ni gradientes multicolor. El logo es una pieza gráfica particular: aunque se usa Anybody como aproximación tipográfica, **no reconstruir ni reemplazar el logo original por texto de fuente** si existe su archivo SVG/PNG.

**Características clave**
- Fondo crema verdoso `#E8E9D9` + verde oliva oscuro `#2B341F`.
- Tipografía principal **Anybody** de Google Fonts, con pesos 400–900; 800–900 para titulares de mayor personalidad.
- Espaciado editorial amplio; pocos elementos y alto contraste visual.
- Sistema tonal derivado del verde oliva mediante transparencias, en lugar de una escala de grises fríos.
- Fotografía real y apetitosa de pizza, masas, ingredientes y dolci; natural, con textura, sin estética corporativa.
- Bordes suaves, botones táctiles y sombras casi imperceptibles.
- UI implementable con Tailwind CSS, shadcn/ui y Radix UI si el proyecto los utiliza.

## 2. Color Palette & Roles

### Colores principales (brand lockup)
| Token | Valor | Uso |
|---|---|---|
| `--brand-olive` | `#2B341F` | Logo, titulares, textos, botones principales, iconos |
| `--brand-cream` | `#E8E9D9` | Fondo general y texto de botones oscuros |

### Colores de soporte (derivados; no son nuevos colores de marca)
| Token | Valor | Uso |
|---|---|---|
| `--olive-strong` | `rgba(43,52,31,0.85)` | Párrafos principales |
| `--olive-muted` | `rgba(43,52,31,0.66)` | Descripciones, metadatos |
| `--olive-soft` | `rgba(43,52,31,0.40)` | Bordes interactivos y texto auxiliar de contraste suficiente según el tamaño |
| `--olive-line` | `rgba(43,52,31,0.18)` | Divisores, bordes de tarjetas |
| `--olive-hover` | `rgba(43,52,31,0.06)` | Hover sobre fondo claro |
| `--olive-wash` | `rgba(43,52,31,0.035)` | Contención y alternancia sutil de superficies |
| `--surface-raised` | `#F0F0E4` | Superficie clara secundaria, opcional; no sustituye el fondo base |
| `--focus-ring` | `rgba(43,52,31,0.60)` | Indicador de foco visible |

**Regla cromática:** mínimo 80–90 % de la interfaz en crema y verde oliva; la fotografía aporta el resto del color. Los elementos interactivos no deben depender del color únicamente para comunicar su estado. Evitar usar texto de bajo contraste sobre el fondo. Para texto pequeño, preferir `--brand-olive` o `--olive-strong`.

### Tokens CSS de referencia

```css
@import url('https://fonts.googleapis.com/css2?family=Anybody:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@500;600;700&display=swap');

:root {
  --brand-olive: #2B341F;
  --brand-cream: #E8E9D9;
  --olive-strong: rgba(43, 52, 31, 0.85);
  --olive-muted: rgba(43, 52, 31, 0.66);
  --olive-soft: rgba(43, 52, 31, 0.40);
  --olive-line: rgba(43, 52, 31, 0.18);
  --olive-hover: rgba(43, 52, 31, 0.06);
  --olive-wash: rgba(43, 52, 31, 0.035);
  --surface-raised: #F0F0E4;
  --focus-ring: rgba(43, 52, 31, 0.60);
  --font-display: 'Anybody', sans-serif;
  --font-body: 'Anybody', sans-serif;
  --font-label: 'Roboto Mono', monospace;
  --radius-button: 6px;
  --radius-card: 12px;
}

body {
  background: var(--brand-cream);
  color: var(--brand-olive);
  font-family: var(--font-body);
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}
```

## 3. Typography Rules

### Font Family
- **Principal:** [Anybody](https://fonts.google.com/specimen/Anybody) (Google Fonts), para títulos, cuerpo, botones, navegación y UI.
- **Display:** Anybody ExtraBold 800 o Black 900. La marca admite letras grandes, compactas y contundentes.
- **Secundaria opcional:** [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) 500–700 para pequeñas etiquetas en mayúsculas, numeración, precios destacados o microcopy como `PIZZA & DOLCE`; no usarla para párrafos largos.
- **Logotipo:** usar el asset oficial PIÙ. La tipografía Anybody es una aproximación al espíritu del logotipo, no una coincidencia exacta; conservar la tilde grave de `Ù` y la forma original del logo.
- **Fallbacks:** `sans-serif` y `monospace`, respectivamente.

### Jerarquía (desktop; escalar con `clamp()`)
| Rol | Familia | Tamaño | Peso | Line height | Tracking | Uso |
|---|---|---:|---:|---:|---:|---|
| Hero display | Anybody | 64–88px | 900 | 0.95–1.02 | -0.035em | Mensaje principal de portada |
| Hero alternativo | Anybody | 56–72px | 800 | 1.00–1.08 | -0.03em | Portadas más sobrias |
| H2 sección | Anybody | 44–56px | 800 | 1.03–1.12 | -0.025em | Pizzas, dolci, manifiesto |
| H3 subsección | Anybody | 30–36px | 700–800 | 1.10–1.18 | -0.02em | Subgrupos |
| Título tarjeta | Anybody | 20–24px | 700 | 1.18–1.25 | -0.01em | Productos |
| Entradilla | Anybody | 18–20px | 400–500 | 1.45 | normal | Intro editorial |
| Cuerpo | Anybody | 16px | 400 | 1.55 | normal | Descripciones y formularios |
| Botón / navegación | Anybody | 14–16px | 600–700 | 1.2–1.4 | normal | Acciones |
| Label / eyebrow | Roboto Mono | 11–13px | 600–700 | 1.4 | 0.10–0.16em | Etiquetas mayúsculas |
| Caption | Anybody | 13–14px | 400–500 | 1.45 | normal | Información secundaria |

### Principios
- Reservar el peso 900 para momentos de marca, héroes y titulares cortos; no para todo el contenido.
- Usar `letter-spacing` negativo solo en displays y headings, no en texto de lectura.
- Usar `Roboto Mono` con tracking positivo solo para etiquetas breves; no transformar todos los títulos a monoespaciado.
- Evitar texto hero excesivamente largo. Priorizar 1–2 líneas y buena legibilidad móvil.
- Escribir `PIÙ` con el acento correcto en todas las apariciones de la marca.

## 4. Component Stylings

### Botones

**Primario / oliva sólido**
- Fondo `#2B341F`; texto `#E8E9D9`; padding `12px 20px`; radio `6px`.
- Anybody 600–700, 14–16px. Altura táctil mínima `44px`.
- Hover: claridad o leve elevación mediante `box-shadow: 0 3px 12px rgba(43,52,31,.12)`; mantener contraste.
- Focus: outline visible `2px solid rgba(43,52,31,.60)` + offset, sin depender solo de sombra.
- Uso: **Ver menú**, **Pedir ahora**, **Reservar** (solo si estas acciones existen).

**Secundario / outline**
- Fondo transparente; texto `#2B341F`; borde `1px solid rgba(43,52,31,.40)`; radio `6px`; mismo tamaño.
- Hover: `rgba(43,52,31,.06)`; foco visible.
- Uso: **Conoce PIÙ**, **Ver ingredientes**, **Cómo llegar**.

**Terciario / texto**
- Sin fondo; oliva oscuro; subrayado o flecha como indicador de acción; hover mediante decoración.

**Píldora / icono**
- Radio `9999px` solo en chips, etiquetas y botones circulares o pills; no en todos los CTA rectangulares.

### Cards & Containers
- Fondo por defecto: transparente o `#E8E9D9`; tarjetas destacadas `#F0F0E4` solo para crear una jerarquía leve.
- Borde `1px solid rgba(43,52,31,.18)`; radio `12px` normal, `16px` destacado, `8px` compacto.
- Sin sombras por defecto. En hover: borde algo más marcado o elevación sutil.
- Tarjetas de productos: foto protagonista, nombre en Anybody 700, descripción corta y precio claro si existe.
- No inventar productos, fotos, precios, reseñas, promociones o claims del negocio.

### Inputs & Forms
- Fondo `#E8E9D9` o superficie secundaria; texto `#2B341F`; borde `1px solid rgba(43,52,31,.40)`.
- Radio `6px`; altura mínima `44px`; placeholder `rgba(43,52,31,.66)`.
- Estado focus con outline oliva visible de 2px; errores con texto claro y semántica, no solo cambio de color.

### Navigation
- Navbar limpia y preferentemente sticky sobre fondo crema, logo **original** alineado a la izquierda.
- Links en Anybody 600, 14–16px, verde oliva.
- CTA de pedido/reserva únicamente si el producto dispone de esa función.
- En móvil, menú accesible con botón de al menos 44 × 44px.
- Evitar suponer proporciones fijas del logo: mantener `width: auto` y proporción original.

### Links
- Verde oliva y subrayado visible cuando sea necesario. Hover por subrayado, espesor o cambio sutil de opacidad.
- Estados focus consistentes; no confiar solo en `hover` para dispositivos táctiles.

### Image Treatment
- Preferir fotografía gastronómica editorial, cálida y realista: pizzas, fermentación, horno, ingredientes, porciones y dolci.
- Luz natural, cercanía, textura, imperfección apetecible. Evitar renders 3D genéricos, filtros saturados o bancos de imágenes demasiado corporativos.
- Imagen hero de alto impacto; proporción 4:5 o 3:4 en editorial, 16:9 en panorámicas y 1:1 o 4:5 en tarjetas.
- Radio 12px si está contenida; se permite fotografía a sangre en secciones protagonistas.
- No usar degradados decorativos rosa/naranja/azul heredados de Lovable.

### Componentes distintivos de PIÙ

**Hero gastronómico**
- Headline corto y audaz en Anybody 900, texto oliva sobre fondo crema.
- Una gran fotografía de pizza o dolce; CTA principal y secundario discretos.
- Espacios amplios; permitir composiciones asimétricas que no comprometan legibilidad.

**Menú / Catálogo de productos**
- Separar Pizza y Dolce con titulares claros.
- Tarjetas ligeras, categorías fáciles de navegar y descripciones cortas.
- Precio, alérgenos y disponibilidad solo cuando estén respaldados por datos reales.

**Historia / Filosofía**
- Bloques editoriales con mucho espacio en blanco y fotografía de ingredientes o proceso.
- Títulos con carácter, texto cálido y natural; evitar copy genérico de startup.

**Datos de visita / Contacto**
- Dirección, horarios, redes, mapa y formas de contacto únicamente si están disponibles.
- No inventar dirección, horarios, teléfono o enlaces.

## 5. Layout Principles

### Spacing System
- Unidad base: `8px`.
- Escala: `8, 12, 16, 24, 32, 40, 56, 64, 80, 96, 128, 176px`.
- Separación entre secciones desktop: normalmente `80–144px`; móvil: `48–72px`.
- Espacio interior de tarjetas: `16–24px`.

### Grid & Container
- Ancho máximo de contenido: `1200px`, centrado con márgenes de `24–32px` en desktop.
- Hero: composición 1 o 2 columnas según contenido/fotografía, evitando simetría mecánica.
- Grillas de productos: 3 columnas desktop, 2 tablet, 1 móvil.
- Footer con datos prácticos, navegación y marca, sin columnas vacías.

### Whitespace Philosophy
- El aire alrededor de titulares y fotografías crea sensación premium, no la abundancia de efectos.
- Separar secciones mediante ritmo, fotografía y bordes finos, no fondos aleatorios.
- Evitar que las tarjetas parezcan dashboards de SaaS.

### Border Radius Scale
- `4px` detalles mínimos; `6px` botones/inputs; `8px` elementos compactos; `12px` tarjetas/imágenes; `16px` contenedores; `9999px` chips/pills.

## 6. Depth & Elevation

| Nivel | Tratamiento | Uso |
|---|---|---|
| 0 Plano | `#E8E9D9`, sin sombra | Página y secciones |
| 1 Delimitado | `1px solid rgba(43,52,31,.18)` | Cards y divisores |
| 2 Táctil | `inset 0 .5px rgba(255,255,255,.18), 0 1px 2px rgba(43,52,31,.08)` | CTA oscuro, opcional |
| 3 Hover | `0 4px 18px rgba(43,52,31,.10)` | Tarjeta interactiva, con moderación |
| Focus | `2px solid rgba(43,52,31,.60)` con offset 3px | Accesibilidad teclado |

**Filosofía:** heredar de Lovable la profundidad sutil y los bordes como contención. Renunciar a sombras grandes, glassmorphism, neones, blur intenso y gradientes multicolor. La textura y la fotografía aportan la riqueza visual.

### Decorative Depth
- Se pueden usar líneas finas, pequeños sellos tipográficos y recortes fotográficos como recursos editoriales.
- Mantener un fondo principalmente plano: el crema de PIÙ es parte central de su reconocimiento.

## 7. Do's and Don'ts

### Do
- Utilizar el fondo `#E8E9D9` y el verde `#2B341F` como base innegociable.
- Usar el logo original, no reemplazarlo por un encabezado de texto.
- Aplicar Anybody 800–900 a displays y 400–700 a cuerpo, controles y títulos menores.
- Reservar Roboto Mono para etiquetas y detalles pequeños si encaja con el diseño.
- Mantener la simplicidad estructural de Lovable: espacio, bordes, CTA claros y navegación fácil.
- Dar protagonismo a fotos de comida auténticas y apetecibles.
- Usar estados de foco visibles y tamaños táctiles accesibles.

### Don't
- No usar `#f7f4ed`, `#1c1c1c`, Camera Plain ni el azul de focus del documento Lovable anterior.
- No añadir colores intensos de forma arbitraria ni gradientes multicolor corporativos.
- No usar Anybody Black en todos los párrafos; la contundencia necesita contraste con texto ligero.
- No copiar interfaces de chat, galerías de templates o métricas de startup: no pertenecen por defecto a PIÙ.
- No inventar contenido comercial ni utilizar un claim de autenticidad/origen sin información confirmada.
- No usar fondos blancos puros, sombras pesadas o tarjetas flotantes indiscriminadamente.

## 8. Responsive Behavior

### Breakpoints sugeridos (Tailwind por defecto)
| Nombre | Ancho | Comportamiento |
|---|---|---|
| Mobile | `<640px` | Una columna; padding 20–24px; hero 38–48px |
| Small tablet | `640–767px` | Títulos 44–56px; grilla de 2 si cabe |
| Tablet | `768–1023px` | Navbar adaptada; 2 columnas de productos |
| Desktop | `1024–1279px` | Hero 2 columnas; 3 columnas de productos |
| Wide | `>=1280px` | Contenedor max 1200px; espacio editorial amplio |

### Touch Targets
- Superficies interactivas mínimas `44 × 44px` cuando sea viable.
- Labels de menú y precios legibles en 320px de ancho.
- Links y controles con foco visible y estados correctos.

### Collapsing Strategy
- Hero: `clamp(2.375rem, 6vw, 5.5rem)` como base adaptable; line-height ~1.
- Navegación horizontal → menú móvil antes de que los links se compriman.
- Cards 3 → 2 → 1 columnas; no cortar imágenes ni textos de precios.
- Secciones 128px desktop → 56–72px móvil.

### Image Behavior
- Ajustar `object-fit: cover` con `object-position` para conservar comida en encuadre.
- No recortar de manera que el producto deje de reconocerse.
- Cargar imágenes optimizadas y adaptar tamaños por viewport.

## 9. Agent Prompt Guide

### Quick Reference
- **Brand:** PIÙ — Pizza & Dolce.
- **Base:** `#E8E9D9`.
- **Primary / CTA / text:** `#2B341F`.
- **Raised surface (optional):** `#F0F0E4`.
- **Passive border:** `rgba(43,52,31,.18)`.
- **Interactive border:** `rgba(43,52,31,.40)`.
- **Font:** `Anybody`, Google Fonts.
- **Display:** Anybody 800–900; **body:** Anybody 400–500; **UI:** Anybody 600–700.
- **Optional micro-label:** Roboto Mono 600, uppercase, tracking +0.12em.
- **Buttons:** square-ish rounded corners, 6px; main button dark olive with cream lettering.
- **Imagery:** real food, editorial, natural light, appetizing textures.

### Prompts listos para el agente

**Hero:**
> Crea un hero para PIÙ — Pizza & Dolce con fondo #E8E9D9 y texto #2B341F. Titular corto en Anybody Black (900), 64–88px desktop, line-height 1.0 y tracking -0.035em; subtítulo en Anybody 400, 18px. Usa una foto gastronómica real como protagonista. CTA principal oliva con texto crema y radio 6px. Espacio editorial amplio y composición responsive; no inventes slogans comerciales ni datos del local.

**Tarjeta producto:**
> Diseña una tarjeta de pizza/dolce con foto grande y auténtica, fondo transparente o #E8E9D9, borde rgba(43,52,31,.18), radio 12px y sin sombra. Nombre Anybody 700 22px, descripción Anybody 400 16px y precio solo si se proporciona. Hover discreto, legibilidad y accesibilidad.

**Navegación:**
> Crea navbar para PIÙ usando el asset original del logo a la izquierda, fondo #E8E9D9, enlaces Anybody 600 color #2B341F y un CTA oliva si la acción existe. Usa menú móvil accesible bajo 768px. No reescribas el logo con una fuente.

**Menú y secciones:**
> Diseña secciones Pizza y Dolce con encabezados grandes Anybody 800, fotos apetitivas, layout aireado de máximo 1200px, bordes sutiles y muy pocos efectos. Mantén exactamente la paleta oliva/crema y prioriza la fotografía y la facilidad para explorar productos.

### Iteration Guide
1. Comprueba que ningún componente siga usando Camera Plain, negro Lovable o crema Lovable.
2. Verifica el uso consistente de `#2B341F` y `#E8E9D9`.
3. Mantén el carácter del logo original y usa Anybody como tipografía de sistema, no sustituto del asset.
4. Revisa títulos muy gruesos frente a cuerpo ligero; no usar Black de forma indiscriminada.
5. Evalúa si cada sección y CTA tiene sentido para una marca gastronómica.
6. Mantén sombras sutiles y bordes derivados del verde.
7. Revisa responsividad, contraste, foco y fotografía antes de cerrar el diseño.
