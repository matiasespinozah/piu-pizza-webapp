# Analítica (Google Analytics 4 / Firebase Analytics)

El sitio envía datos a la propiedad de GA4 que Firebase creó para `piu-pizza-cl` (ID de medición `G-2XJXG2E0WJ`, app web «PIU Pizza Web»). Se ven igual en la consola de Firebase (Analytics) y en `analytics.google.com`.

No usa el SDK de Firebase: carga `gtag.js` directamente. Así el sitio público sigue sin importar Firebase (lo exige `tests/public-surface.test.mjs`) y no suma su peso. Los datos van a la misma propiedad.

## Cómo funciona
- `src/components/features/analytics/analytics.tsx` está en el layout raíz. El script de Google se pide **al terminar de cargar la página** (`lazyOnload`).
- Solo carga en **producción** y con `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` definido (está en `apphosting.yaml`). En desarrollo, en los tests y en un build local sin ID no se envía nada. No pongas el ID en tu `.env.local`: tus pruebas entrarían a los datos reales.
- `src/lib/analytics/config.ts` decide qué se mide; `events.ts` arma los eventos (funciones puras, con tests); `track.ts` los envía.

## Qué NO se mide
- `/admin/**`, `/api/**`, `/correo` y `/ui`.
- **`/reservas/estado`**: la dirección lleva un código secreto de seguimiento. En esas rutas se activa el interruptor oficial `ga-disable-<ID>`, que apaga todo, incluso lo automático.
- Nunca se envían nombres, teléfonos, correos, notas, códigos de reserva ni la URL de un enlace de WhatsApp (el `?text=` puede llevar datos). `tests/analytics.test.mjs` lo vigila.

## Qué se mide y para qué
| Evento | Cuándo | Parámetros | Sirve para |
|---|---|---|---|
| `page_view` | cada página (también al navegar sin recargar) | `page_path`, `page_title` | qué páginas se visitan, en tiempo real |
| `view_item` | se abre la ficha de un producto | producto, categoría, precio | qué platos despiertan interés |
| `view_item_list` | se elige una categoría de la carta | categoría | qué secciones se miran |
| `search` | se termina de escribir en el buscador de la carta | `search_term`, `results_count` | qué busca la gente y no encuentra |
| `reservation_step` | se llega a un paso del formulario | `step` (1–3), `step_name` | **dónde se abandona** la reserva |
| `generate_lead` | solicitud de reserva nueva enviada | `party_size`, `zone`, `visit_weekday`, `visit_hour`, `days_ahead`, `marketing_opt_in` | **conversión**; qué días y horas se piden |
| `reservation_error` | el envío falla | `error_code`, `http_status` | por qué no se puede reservar (cupo, día cerrado, límite) |
| `click_whatsapp` | clic a un enlace de WhatsApp | `venue` (`casa`, `restaurant`, `otro`), `link_area` | cuánta gente prefiere WhatsApp y desde dónde |
| `click_directions` / `click_map` | clic a «Cómo llegar» o al mapa | `link_area` | intención de visita |
| `click_social` | clic a Instagram o TikTok | `network`, `link_area` | |
| `click_my_reservation` | clic a «Mi reserva» | `link_area` | |
| `LCP`, `CLS`, `INP`, `FCP`, `TTFB` | rendimiento real de cada visita | valor, `metric_rating` | **mantención**: velocidad real, por página y dispositivo |
| `exception` | error de JavaScript en el navegador | `description` (≤100 caracteres) | **mantención**: fallos que nadie reporta (máximo 5 por página) |

GA4 mide solo, sin código: dispositivo, navegador, sistema, país y ciudad, idioma, origen del tráfico (Instagram, Google, directo, campañas con `utm_*`), nuevos y recurrentes, scroll y tiempo en la página.

## Consentimiento (decisión pendiente con el dueño)
Hoy se declara **medición básica**: cookies de analítica sí, publicidad no (`consentDefault` en `config.ts`). No hay aviso de cookies ni página de privacidad.

Para pedir consentimiento cuando se decida:
1. En `consentDefault`, poner `analytics_storage: "denied"`.
2. Agregar un aviso (mobile-first, Aceptar y Rechazar) que llame a `gtag("consent", "update", { analytics_storage: "granted" })`.
3. Crear la página `/privacidad` y enlazarla.
Con `denied`, GA mide sin cookies y de forma aproximada hasta que el visitante acepta.

**Edad, género e intereses** no están activos. Necesitan las señales de Google (`googleSignals = true` en `config.ts`) y además conceder `ad_user_data` y `ad_personalization`, o sea cookies de publicidad. Se activa también en GA (Administrador → Configuración de datos → Recopilación de datos → Señales de Google). Con poco tráfico, Google oculta estos datos por umbrales de privacidad. Es una decisión del dueño.

## Qué hay que configurar en la consola de Google Analytics (no está en el código)
Una sola vez, en `analytics.google.com` → Administrador → propiedad de `piu-pizza-cl`:
1. **Flujos de datos → web → Medición mejorada → ícono de engranaje.** Apagar **«Cambios de página según eventos del historial del navegador»** (el sitio ya envía cada página; encendido duplicaría y podría enviar la dirección de `/reservas/estado`) y **«Clics de salida»** (el sitio los mide solo, sin la URL).
2. **Eventos → Marcar como evento clave:** `generate_lead` (reserva enviada) y, si quieres, `click_whatsapp`.
3. **Definiciones personalizadas → Dimensiones personalizadas (alcance: evento)**, para poder verlos en los informes: `visit_weekday`, `visit_hour`, `days_ahead`, `party_size`, `zone`, `venue`, `link_area`, `step_name`, `error_code`, `http_status`. Los parámetros no registrados no aparecen en los informes. Y para las métricas de rendimiento, `metric_rating`.
4. **Configuración de datos → Retención de datos:** 14 meses.
5. **Flujos de datos → Configurar ajustes de etiquetas → Definir tráfico interno** con la IP del local, y activar el filtro de tráfico interno, para no contar al personal.

## Dónde mirar
- **Tiempo real** (Informes → Tiempo real): quién está ahora, en qué páginas y desde qué dispositivo.
- **Participación → Páginas y pantallas**: páginas más vistas. **Tecnología**: dispositivos y navegadores. **Adquisición**: de dónde llegan.
- **Explorar → Exploración de embudo** con `page_view /reservas` → `reservation_step 2` → `3` → `generate_lead`: dónde se pierde la reserva.
- **Eventos**: `exception` y `reservation_error` para mantención; `LCP`, `CLS`, `INP` para velocidad real.
