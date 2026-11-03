# Mobile first (obligatorio)

La mayoría de los clientes de PIÙ entra desde el celular, muchas veces con una mano, apurado y con datos móviles. **Se diseña y se construye primero para móvil**; el desktop es una mejora progresiva.

## 1. Cómo se escribe el CSS
- Las clases **sin prefijo son para móvil**. `sm:` / `md:` / `lg:` solo **agregan** o ajustan hacia pantallas grandes.
  ```tsx
  // ✅ móvil primero
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  // ❌ desktop primero (y luego "arreglar" móvil)
  <div className="grid grid-cols-3 max-md:grid-cols-1">
  ```
- Prohibido usar `max-*:` para construir el layout base. Solo se permite para excepciones puntuales y justificadas.
- Viewport de referencia: **375 px** (y probar 360 px). Ningún contenido puede generar **scroll horizontal**, salvo carruseles intencionales con `snap-x`.
- Usar `dvh`/`svh` en vez de `vh` para alturas de pantalla completa (la barra del navegador móvil cambia de tamaño).

## 2. Toque y ergonomía
- Objetivos táctiles de **al menos 44 × 44 px** en móvil, con ≥ 8 px de separación entre ellos. Los componentes de `src/components/ui/` ya lo cumplen; no reducirlos con `className`.
- La acción principal (pedir, agregar, ver menú) va en la **zona del pulgar**: parte inferior de la pantalla. En flujos de compra, usar una barra de acción fija abajo (`sticky bottom-0`) con `padding-bottom: env(safe-area-inset-bottom)`.
- **Nada depende de hover.** Todo lo que aparece con hover debe tener equivalente al tocar. `Tooltip` no puede contener información esencial.
- En móvil, preferir `Sheet` (panel desde abajo o el costado) antes que `Dialog` centrado o `DropdownMenu` para menús largos.
- Respetar los safe areas (notch, barra de gestos) en elementos fijos con las utilidades `pb-safe`, `pt-safe` y `px-safe` (definidas en `globals.css`; el layout ya usa `viewportFit: "cover"`).
- No bloquear el zoom (`maximum-scale=1` / `user-scalable=no` están prohibidos).

## 3. Formularios
- Texto de inputs **≥ 16 px** (`text-base`). Con menos, iOS hace zoom al enfocar.
- Usar siempre `type`, `inputMode` y `autoComplete` correctos: `type="tel"` + `autoComplete="tel"`, `type="email"`, `inputMode="numeric"`, `autoComplete="street-address"`, etc.
- Un campo por fila en móvil. Labels visibles arriba del campo (no solo placeholder).
- El teclado no debe tapar el botón de enviar: botón al final del formulario, no flotante sobre los inputs.

## 4. Contenido y tipografía
- Cuerpo mínimo 16 px. Titulares con `clamp()` (ya incluido en `Heading`/`Display`).
- Una columna en móvil. Textos cortos: lo importante (precio, horario, botón de pedir) visible sin scroll en la primera pantalla cuando aplique.
- Teléfono con `tel:`, dirección con link a mapas, WhatsApp con `https://wa.me/` (solo con datos reales).

## 5. Rendimiento en redes móviles
- Objetivo en móvil (Lighthouse, 4G simulado): **LCP < 2,5 s**, **CLS < 0,1**, **INP < 200 ms**.
- JS de cliente mínimo: Server Components por defecto, `"use client"` solo en hojas interactivas, sin librerías pesadas para cosas simples.
- Imágenes: `sizes` pensado primero en móvil (`sizes="(max-width: 640px) 100vw, …"`), `priority` solo en la imagen LCP. Ver `images-media.md`.
- Nada de video autoplay ni fuentes extra en móvil.

## 6. Movimiento
- Animaciones cortas (≤ 200 ms) y siempre respetando `prefers-reduced-motion` (`motion-safe:` / `motion-reduce:` en Tailwind).

## 7. Verificación
- Revisar **primero a 375 px** y después a 768 px y 1280 px. En el muestrario `/ui` y en cada página nueva.
- Chrome DevTools → modo dispositivo (iPhone SE / Pixel 7) y, cuando se pueda, en un celular real.
- Checklist antes de terminar una tarea de UI:
  - [ ] Sin scroll horizontal a 360 y 375 px.
  - [ ] Todos los controles ≥ 44 px y usables con el pulgar.
  - [ ] Nada depende de hover.
  - [ ] Inputs con `text-base` y `type`/`autoComplete` correctos.
  - [ ] Elementos fijos respetan los safe areas.
