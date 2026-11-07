# Catálogo

La carta pública y las tres sugerencias del chef leen Firestore cuando este proceso tiene `PIU_FIREBASE_DATA=on` o apunta al emulador. Si no, siguen con el catálogo local de `src/lib/catalog/data.ts`: tres pizzas y el resto de categorías vacío. Así el sitio publicado no cambia hasta que se autorice el acceso, y esta rama no escribe en `piu-pizza-cl`.

El menú de origen está en `data/catalog/piu-catalogo-fudo.json`: 14 categorías y 131 productos, con los nombres, textos, precios y disponibilidad del archivo. No hay fotos reales. Si falta la descripción, la carta no inventa ingredientes. Si falta la foto, se usa `/not_image.png`.

## Importar

`node scripts/import-catalog.mjs` carga ese archivo en el emulador de Firestore (`demo-piu-pizza`). La segunda corrida no crea copias. Si un producto ya existe, conserva el nombre, la descripción y el precio editados en `/admin/carta`, la foto y si está oculto. Para volver a copiar nombre, descripción y precio desde el JSON hay que pedirlo: `node scripts/import-catalog.mjs --sobrescribir`. El script se niega si el proyecto es `piu-pizza-cl`.

No publica reglas ni índices. Cuando se autorice, en el proyecto de pruebas:

```bash
firebase deploy --only firestore,storage --project piu-pizza-staging
```

## Panel

`/admin/carta` lo usan `admin` y `superadmin`. Desde ahí se agregan, editan, ocultan y eliminan productos y categorías, y se cambia el precio. La foto se sube al servidor, que la convierte a WebP de hasta 1200 px y 150 KB y la guarda en Storage en `products/{id}/{hash}.webp`. Eliminar un producto borra el registro. Ocultarlo lo deja guardado y fuera de la carta pública.

Las sugerencias de la Home son como máximo tres, primero las de «SUGERENCIAS DEL CHEF» y sin repetir el mismo nombre.

## Caché

La lectura pública usa `cacheTag("catalog")` y se invalida cuando el panel guarda. Cada consulta lleva `limit()`.
