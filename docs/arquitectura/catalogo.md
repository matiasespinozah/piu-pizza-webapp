# Catálogo

La carta pública y las tres sugerencias del chef leen Firestore cuando este proceso tiene `PIU_FIREBASE_DATA=on` o apunta al emulador. Si no, siguen con el catálogo local de `src/lib/catalog/data.ts`: tres pizzas y el resto de categorías vacío. Así el sitio publicado no cambia hasta que se autorice el acceso, y esta rama no escribe en `piu-pizza-cl`.

El menú de origen está en `data/catalog/piu-catalogo-fudo.json`: 14 categorías y 131 productos, con los nombres, textos, precios y disponibilidad del archivo. No hay fotos reales. Si falta la descripción, la carta no inventa ingredientes. Si falta la foto, se usa `/not_image.png`.

## Importar

`node scripts/import-catalog.mjs` carga ese archivo en el emulador de Firestore (`demo-piu-pizza`). La segunda corrida no crea copias. Si un producto ya existe, conserva el nombre, la descripción y el precio editados en `/admin/carta`, la foto y si está oculto. Para volver a copiar nombre, descripción y precio desde el JSON hay que pedirlo: `node scripts/import-catalog.mjs --sobrescribir`.

Escribir en `piu-pizza-cl` exige `PIU_CATALOG_IMPORT_PRODUCTION=on` en esa corrida y no usa el emulador. Sin esa variable el script se niega. `PIU_FIREBASE_DATA` no alcanza para autorizarla.

No publica reglas ni índices. Cuando se autorice, en el proyecto de pruebas:

```bash
firebase deploy --only firestore,storage --project piu-pizza-staging
```

## Panel

`/admin/carta` lo usan `admin` y `superadmin`. La pantalla abre en los productos, con accesos a Agotados, Ocultos, Sin foto, Categorías y Configuración. «Agregar» deja elegir un producto o «Añadir nueva categoría». Los productos se muestran como tarjetas y se buscan y filtran en el navegador; editar abre un panel lateral en escritorio y una hoja a pantalla completa en el celular. Crear un producto puede incluir la foto: primero se guarda el registro y después se sube el archivo. El precio, la disponibilidad y la visibilidad también se cambian desde el menú «⋯» de cada tarjeta. Mostrar un producto desde Ocultos lo saca de ese filtro y el botón no acepta otro toque hasta que la lista confirma el cambio. El orden de los productos se mueve con «Mover antes» y «Mover después» dentro de una categoría, no arrastrando. El orden de las categorías visibles está en Configuración: se arrastra el punto o se usa subir y bajar, y el orden nuevo se guarda junto. Arriba queda primera en la carta del cliente. Un nombre que ya existe no crea otra categoría ni reemplaza la anterior. Borrar un producto o una categoría pide confirmación. Una categoría con productos no se elimina. La foto se convierte en el servidor a WebP de hasta 1600 px y 400 KB, sin bajar de calidad 72 y se guarda en Storage en `products/{id}/{hash}.webp`. Junto a ella se guardan dos versiones chicas, `{hash}-900.webp` y `{hash}-360.webp`, cuyas URLs quedan en `imageVariants` del producto y de la carta pública: las listas y las tarjetas descargan la de 360 o 900 px según la pantalla en vez de la original. Si las versiones no se pueden generar, la foto se publica igual y se usa sola. Eliminar un producto borra el registro y su foto. Ocultarlo lo deja guardado y fuera de la carta pública. Agotado sigue visible, con el aviso de que no se puede pedir.

Las sugerencias de la Home son como máximo tres, primero las de «SUGERENCIAS DEL CHEF» y sin repetir el mismo nombre.

## Caché

La lectura pública usa `cacheTag("catalog")` y un solo documento, `catalog/public`. Ese documento se escribe en la misma transacción que el producto o la categoría. Si la transacción falla, el panel recibe el error y la carta anterior sigue publicada.

En Next.js 16.4.6 el perfil es `stale` 300 s, `revalidate` 300 s y `expire` 86400 s. El CDN guarda la página fresca 300 s (`s-maxage`). Después puede entregarla mientras revalida, hasta un día (`stale-while-revalidate`). Así una recarga forzada no se queda esperando a que Cloud Run despierte. Si el origen responde, la visita siguiente ya trae el documento nuevo. Cada instancia de App Hosting tiene su propia memoria y la descarta a los 300 s. `revalidateTag("catalog", { expire: 0 })` solo obliga a la instancia que guardó a leer de nuevo. No purga el CDN ni las otras instancias. Quien tenga la página abierta necesita recargarla. Con el servidor despierto, el atraso esperado sigue siendo de unos 5 minutos.

Hasta que exista `catalog/public`, la página arma la carta desde los documentos de origen y no los modifica. Abrir `/admin/carta` lo crea si falta, sin pisar uno que ya esté. Una importación al emulador lo vuelve a armar al final, también sin cambiar los productos a mano.

## Versiones chicas de las fotos existentes

Las fotos subidas antes de las versiones chicas no las tienen. Mientras falten, el sitio funciona igual y usa la foto principal. Para generarlas sin cambiar ninguna foto ni su dirección:

```bash
pnpm backfill:photos                 # simulación: lista lo pendiente y no escribe nada
pnpm backfill:photos --apply --limit 1                       # emulador, o producción con PIU_BACKFILL_PRODUCTION=on
pnpm backfill:photos --apply --only <id-del-producto>
```

Es seguro repetirlo y detenerlo: lo ya migrado se salta. Cada producto pasa por la misma publicación del panel (`addProductPhotoVariants`), así que la carta pública se actualiza sola. Contra producción necesita `PIU_BACKFILL_PRODUCTION=on` y credenciales de Google (ADC) con acceso a `piu-pizza-cl`. La prueba con Storage emulado es `pnpm test:catalog-photos`.
