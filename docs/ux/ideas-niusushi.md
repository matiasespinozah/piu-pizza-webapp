# Ideas de usabilidad tomadas de Niu Sushi

> **Estado:** por revisar. Nada de esto está implementado ni decidido.
> **Origen:** revisión exploratoria de [niusushi.cl](https://www.niusushi.cl/) en vista móvil (iPhone 13), noviembre de 2026. Al cliente le gusta cómo funciona el flujo de pedido de Niu, aunque no su diseño.
> **Uso:** referencia para cuando se definan las funcionalidades de PIÙ. Se toman ideas de **cómo se usa**, no de cómo se ve: la identidad visual es la de [`DESIGN.md`](../../DESIGN.md).

Antes de implementar cualquier idea, revisar [`AGENTS.md`](../../AGENTS.md) y las reglas de [`.agents/rules/`](../../.agents/rules/), sobre todo `mobile-first.md`, `cost-control.md` y `firebase-security.md`.

---

## Resumen

| # | Idea | Valor para el cliente | Esfuerzo | Costo de infraestructura |
|---|---|---|---|---|
| 1 | Inicio con dos acciones: "Ver menú" y "Repetir pedido" | Alto | Bajo | Ninguno |
| 2 | Repetir pedido sin cuenta | Alto | Medio | Casi nulo |
| 3 | Agregar al carro en un toque (o `Sheet` si hay opciones) | Alto | Medio | Ninguno |
| 4 | Cantidad visible en la tarjeta y el carro | Medio | Bajo | Ninguno |
| 5 | Filtro "con / sin ingrediente" | Medio | Medio | Ninguno |
| 6 | Estado del local (abierto/cerrado) visible desde el inicio | Alto | Bajo | Ninguno |
| 7 | Selección destacada al inicio del menú | Medio | Bajo | Ninguno |
| 8 | Categorías en tabs fijos | Medio | Bajo | Ninguno |
| 9 | Menú lateral corto y orientado a acciones | Bajo | Bajo | Ninguno |
| 10 | Login simple y opcional (Google o email y contraseña) | Medio | Medio | Solo MAU de quienes lo usan |
| 11 | Barra de pedido fija abajo *(mejora propia)* | Alto | Bajo | Ninguno |
| 12 | Checkout como invitado *(mejora propia)* | Alto | Medio | Reduce MAU |

---

## 1. Inicio con solo dos acciones

**Qué hace Niu:** el inicio es una foto grande y dos botones enormes abajo: "Carta" y "Repetir pedido". No hay más contenido que leer.

**Por qué funciona:** quien entra a pedir no quiere explorar. El cliente habitual de pizza pide casi siempre lo mismo.

**Implementación sugerida**
- Hero con una foto real (`next/image` con `priority`) y dos `Button` de tamaño `lg` en la parte baja de la pantalla (zona del pulgar).
- "Repetir mi pedido" aparece solo si existe un pedido anterior (ver idea 2). Si no, el botón principal es "Ver menú" y el secundario puede ser "Locales" o "Cómo llegar".
- La página sigue siendo estática: el botón "Repetir" se muestra desde un componente cliente pequeño que lee el pedido guardado, para no volver dinámica toda la portada (`cost-control.md`).

## 2. Repetir pedido sin cuenta

**Qué hace Niu:** "Repetir pedido" exige iniciar sesión. Nosotros queremos lo mismo **sin obligar a registrarse**.

**Implementación sugerida**, en tres capas complementarias:

| Capa | Cómo funciona | Cubre |
|---|---|---|
| a. Memoria del dispositivo | Al confirmar, se guarda **qué** se pidió (ids de producto, tamaño, extras; nunca precios) en `localStorage` **y** en una cookie que pone el servidor, de un año. Safari borra lo que guarda JavaScript si el sitio no se visita en 7 días; la cookie del servidor no tiene ese límite. | Vuelve desde el mismo celular (el caso más común) |
| b. Link en la confirmación | El email/WhatsApp de confirmación incluye `/repetir/<token>`. El token es largo, aleatorio y firmado en el servidor; nunca el número de pedido ni el teléfono. La página muestra **solo los productos**, no la dirección ni el teléfono. | Cambió de celular, pide desde el computador |
| c. Cuenta opcional | En "Pedido confirmado": "¿Guardamos tus pedidos? Crea tu cuenta con Google o con email y contraseña". El pedido recién hecho queda en su historial. | Quiere historial y favoritos |

**Reglas**
- Al repetir, el carro se arma con los **precios y la disponibilidad actuales**. Si un producto ya no existe, se avisa ("La Diavola no está disponible hoy") y se arma el resto.
- **No** buscar pedidos por teléfono o email sin verificación: cualquiera podría ver qué pidió otra persona y dónde vive. Verificar por SMS está descartado por costo.
- **No** usar Auth anónima de Firebase como "cuenta invisible": se pierde igual que el `localStorage` y probablemente cuenta como MAU (no confirmado).

**Costo:** capa a, nulo. Capa b, una lectura de Firestore por clic. Capa c, solo los MAU de quienes crean cuenta.

## 3. Agregar al carro en un toque

**Qué hace Niu:** el botón "+" de cada producto lo agrega directo, sin abrir ningún detalle.

**Adaptación a pizza:** una pizza tiene más opciones que un roll (tamaño, mitad y mitad, extras).
- **Sin opciones** (bebidas, dolci, pizzas de un solo tamaño): un toque, como Niu, con un `toast` de confirmación ("Agregado · Deshacer").
- **Con opciones:** tocar abre un `Sheet` desde abajo con la opción más pedida ya elegida (por ejemplo, tamaño mediano) y un botón fijo "Agregar · $12.990" que actualiza el precio en vivo.
- Tocar la tarjeta (no solo el botón) también abre el `Sheet` con foto, descripción e ingredientes. En Niu, tocar la foto no lleva a un detalle útil.

## 4. Cantidad visible en la tarjeta y el carro

**Qué hace Niu:** al agregar, el botón del producto muestra la cantidad (un "1") y el ícono del carro en el header muestra el total.

**Implementación sugerida**
- Estado del carro en el cliente (contexto de React + `localStorage`), sin escrituras a Firestore hasta confirmar el pedido.
- En la tarjeta: `Badge` con la cantidad y, si hay unidades, controles `−` / `+` de 44 px.
- El contador del header y la barra de pedido (idea 11) leen el mismo estado.
- Anunciar los cambios a lectores de pantalla con `aria-live="polite"`.

## 5. Filtro "con / sin ingrediente"

**Qué hace Niu:** el buscador pregunta "¿Qué ingrediente quieres? (o cuál no)", con ejemplos como "Con pollo, sin salmón".

**Adaptación a pizza:** es todavía más útil ("sin cebolla", "con champiñones", "vegetariana").
- En vez de texto libre, **chips** de ingredientes: un toque marca "con", el segundo "sin", el tercero lo quita. Es más fácil en el celular que escribir.
- El filtro corre **en el cliente** sobre el menú que ya llegó cacheado: sin lecturas extra a Firestore ni motor de búsqueda.
- Requiere que cada producto tenga en sus datos una lista de ingredientes normalizada (`ingredients: ["mozzarella", "albahaca", …]`).
- Mostrar el número de resultados ("8 pizzas") y un botón "Limpiar filtros".

## 6. Estado del local visible desde el inicio

**Qué hace Niu:** al elegir región muestra "Locales cerrados (abren de 12:00 a 23:30)" antes de armar el pedido.

**Implementación sugerida**
- Badge en el header: "Abierto · cierra 23:30" o "Cerrado · abre mañana 12:00".
- El horario vive en Firestore (un documento `settings/hours`) y se lee cacheado. El cálculo de abierto/cerrado se hace **en el cliente** con la hora local (zona `America/Santiago`), así la página sigue siendo estática.
- Si está cerrado: se puede navegar el menú, pero el botón de pagar dice "Cerrado ahora · abre a las 12:00", o se ofrece programar el pedido si se implementa.
- El servidor vuelve a validar el horario al confirmar el pedido: no confiar solo en el cliente.

## 7. Selección destacada al inicio del menú

**Qué hace Niu:** la primera sección abierta es "Recomendaciones del Chef", una selección corta.

**Implementación sugerida:** sección "Las favoritas" (4–6 productos) arriba del menú, marcada desde el panel de administración con un campo `featured: true`. Solo con productos reales; no inventar "más vendidos" (`DESIGN.md` §4).

## 8. Categorías en tabs fijos

**Qué hace Niu:** categorías como acordeones que se abren y cierran.

**Adaptación:** PIÙ tiene pocas categorías, así que son mejores los **tabs fijos arriba** (`Tabs` en `sticky top-0`): Pizza · Dolce · Bebidas. Con acordeones se pierde la ubicación al hacer scroll. Si las categorías crecen, los tabs pueden volverse chips con scroll horizontal (`snap-x`) que marcan la sección visible.

## 9. Menú lateral corto y orientado a acciones

**Qué hace Niu:** Favoritos, Repetir pedidos, Carta, Locales, Mi perfil, Contacto, Preguntas frecuentes, más redes sociales.

**Implementación sugerida:** `Sheet` lateral con Repetir pedido, Menú, Locales, Contacto y Preguntas frecuentes. "Mi perfil" y "Favoritos" solo si hay sesión. Enlaces de 44 px de alto, con el tamaño de navegación de `TextLink`.

## 10. Login simple y opcional

**Qué hace Niu:** email o "Ingresar con Google", nada más.

**Implementación sugerida:** Firebase Auth con **Google** y **email y contraseña** (los dos proveedores habilitados en el proyecto). El registro pide además nombre y teléfono como datos de perfil, también a quienes entran con Google. Sin SMS (`cost-control.md`). Se ofrece **después** del pedido, nunca antes. Ver la idea 12 y `firebase-security.md` para la cookie de sesión.

---

## Mejoras propias (corregir lo que Niu hace mal)

### 11. Barra de pedido fija abajo
Desde que hay un producto en el carro, una barra `sticky bottom-0` con "Ver pedido · 2 · $24.980" y `pb-safe` para el notch y la barra de gestos. Tocarla abre el carro en un `Sheet`. Siempre visible en la zona del pulgar (`mobile-first.md` §2).

### 12. Checkout como invitado
En Niu, abrir el carro exige iniciar sesión: es la mayor fricción del flujo.
- Carro y checkout **sin cuenta**: nombre, teléfono (`type="tel"`, `autoComplete="tel"`), retiro o despacho, dirección si aplica.
- La cuenta se ofrece al final (idea 2c).
- Menos personas registradas significa menos MAU en Auth (ver el informe de costos en `docs/costos/`).
- El servidor recalcula totales y valida disponibilidad y horario; nunca confiar en precios del cliente (`firebase-security.md`).

### Otros detalles
- **Ingredientes visibles en la tarjeta:** Niu muestra solo nombre y precio. Para pizza, una línea con los ingredientes principales.
- **Sin banner de "Descarga la App":** ocupa espacio arriba en cada página y PIÙ no tendrá app.
- **Sin carrusel en el inicio:** en el celular las flechas casi no se usan; mejor una foto fija y fuerte.

---

## Lo que no se copia

| Qué hace Niu | Por qué no |
|---|---|
| Obligar a iniciar sesión para ver el carro | Fricción; se resuelve con checkout como invitado |
| Banner fijo de descarga de app | Quita espacio; no habrá app |
| Carrusel del inicio con flechas | Poco usable en el celular |
| Fondo negro, rojo intenso, nombres en mayúsculas | El diseño es el de `DESIGN.md` |
| Sin detalle útil al tocar la foto del producto | En PIÙ la tarjeta abre el `Sheet` del producto |

---

## Preguntas abiertas para definir con el cliente
- ¿Despacho propio, solo retiro, o ambos? ¿Zonas y costo de despacho?
- ¿Pago en línea (qué pasarela) o al recibir?
- ¿Se permite pizza mitad y mitad? ¿Cómo se cobra?
- ¿Pedidos programados cuando el local está cerrado?
- ¿Por dónde se envía la confirmación: email, WhatsApp o ambos? (afecta la idea 2b)
- ¿Uno o varios locales?

## Componentes disponibles
Todo lo anterior se arma con lo que ya existe en `src/components/ui/`: `Sheet`, `Tabs`, `Badge`, `Button`, `Price`, `Card`, `Toaster`, `Field`, `Input`. Lo nuevo sería de dominio y va en `src/components/features/`: `OrderBar`, `ProductSheet`, `IngredientFilter`, `StoreStatus`, `RepeatOrderButton`.
