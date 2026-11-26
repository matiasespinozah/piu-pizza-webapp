# Google Maps en la Home

La sección **Ven a encontrarnos** incrusta un mapa con el iframe oficial de Google Maps, sin Maps JavaScript API ni claves.

- **Destinos:** Restaurant Più Pizzas (Primera Transversal 2595) y Casa Più (Av. Santa Rosa 63), Maipú, Chile. Cada iframe usa el embed oficial (`maps/embed?pb=…`) con la dirección escrita, no el nombre comercial, para no pinchar otra ficha.
- **Costo:** el embed no factura en Google Cloud. No hay SDK, listeners ni geolocalización nuestra.
- **Carga:** `loading="lazy"` en el iframe; no entra en el LCP de la portada.
- **Interacción:** el mapa es visual (`pointer-events: none`) para no capturar el scroll; las indicaciones van por «Cómo llegar».
- **Indicaciones:** `https://www.google.com/maps/dir/?api=1&destination=…` abre Maps nativo o web.

Datos centralizados en `src/lib/site.ts` (`visitVenues` en el inicio; `venue`, `mapsEmbedUrl` y `directionsUrl` para reservas y datos estructurados). El horario del footer sale de la configuración del local.
