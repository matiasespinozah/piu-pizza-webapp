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

`/admin/carta` lo usan `admin` y `superadmin`. La pantalla abre con cuadros para elegir «Productos» o «Categorías», más accesos a Agotados, Ocultos y Sin foto. Los productos se muestran como tarjetas y se buscan y filtran en el navegador; editar abre un panel lateral en escritorio y una hoja a pantalla completa en el celular. Crear un producto puede incluir la foto: primero se guarda el registro y después se sube el archivo. El precio, la disponibilidad y la visibilidad también se cambian desde el menú «⋯» de cada tarjeta. El orden se mueve con «Mover antes» y «Mover después» dentro de una categoría, no arrastrando. La foto se convierte en el servidor a WebP de hasta 1200 px y 150 KB y se guarda en Storage en `products/{id}/{hash}.webp`. Eliminar un producto borra el registro. Ocultarlo lo deja guardado y fuera de la carta pública. Agotado sigue visible, con el aviso de que no se puede pedir.

Las sugerencias de la Home son como máximo tres, primero las de «SUGERENCIAS DEL CHEF» y sin repetir el mismo nombre.

## Caché

La lectura pública usa `cacheTag("catalog")` y se invalida cuando el panel guarda. Cada consulta lleva `limit()`.
