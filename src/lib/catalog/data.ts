import type { Category, Product } from "@/lib/catalog/types"

/**
 * Datos locales y en memoria del catálogo (sin backend).
 * Única fuente de nombres, precios y descripciones: la Home y `/carta` leen de aquí.
 * Solo "Sugerencias del chef" tiene productos confirmados; el resto de las
 * categorías queda preparado, sin productos ni precios inventados.
 */

const CHEF_CATEGORY_ID = "sugerencias-del-chef"

const localCategories: readonly Category[] = [
  { id: CHEF_CATEGORY_ID, slug: "sugerencias-del-chef", name: "Sugerencias del chef", sortOrder: 1, isVisible: true },
  { id: "pizzas-clasicas", slug: "pizzas-clasicas", name: "Pizzas clásicas", sortOrder: 2, isVisible: true },
  { id: "pizzas-especiales", slug: "pizzas-especiales", name: "Pizzas especiales", sortOrder: 3, isVisible: true },
  { id: "pastas", slug: "pastas", name: "Pastas", sortOrder: 4, isVisible: true },
  { id: "piqueos", slug: "piqueos", name: "Piqueos", sortOrder: 5, isVisible: true },
  { id: "ensaladas", slug: "ensaladas", name: "Ensaladas", sortOrder: 6, isVisible: true },
  { id: "palitos", slug: "palitos", name: "Palitos", sortOrder: 7, isVisible: true },
  { id: "postres", slug: "postres", name: "Postres", sortOrder: 8, isVisible: true },
  { id: "pasteleria", slug: "pasteleria", name: "Pastelería", sortOrder: 9, isVisible: true },
  { id: "cafeteria", slug: "cafeteria", name: "Cafetería", sortOrder: 10, isVisible: true },
  { id: "bebidas", slug: "bebidas", name: "Bebidas", sortOrder: 11, isVisible: true },
  { id: "barra", slug: "barra", name: "Barra", sortOrder: 12, isVisible: true },
  { id: "menu-del-dia", slug: "menu-del-dia", name: "Menú del día", sortOrder: 13, isVisible: true },
  { id: "extras", slug: "extras", name: "Extras", sortOrder: 14, isVisible: true },
]

const localProducts: readonly Product[] = [
  {
    id: "americana",
    categoryId: CHEF_CATEGORY_ID,
    name: "Americana",
    description: "Crema al parmesano, mozzarella, cebolla morada, tocino ahumado y pechuga de pollo.",
    priceClp: 16_900,
    availability: "available",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: "pollo-espinaca",
    categoryId: CHEF_CATEGORY_ID,
    name: "Pollo Espinaca",
    description: "Espinaca a la crema, parmesano, mozzarella fresca, champiñones asados y pollo desmechado.",
    priceClp: 16_900,
    availability: "available",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: "caramel-funghi",
    categoryId: CHEF_CATEGORY_ID,
    name: "Caramel Funghi",
    description: "Crema al queso azul, mozzarella fresca, cebolla caramelizada y champiñones asados.",
    priceClp: 16_900,
    availability: "available",
    isFeatured: true,
    sortOrder: 3,
  },
]

export { CHEF_CATEGORY_ID, localCategories, localProducts }
