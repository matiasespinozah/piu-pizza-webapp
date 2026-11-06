/**
 * Catálogo local temporal, listo para pasar a Firestore
 * (`src/server/dal/menu.ts`) sin cambiar la forma de los datos.
 * Solo incluye productos y categorías confirmados.
 */

type MenuCategoryId = "pizza" | "dolce"

type MenuCategory = {
  id: MenuCategoryId
  name: string
  kicker: string
  description: string
}

type MenuProduct = {
  id: string
  name: string
  description: string
  price: number
  category: MenuCategoryId
  chefPick: boolean
  /** Ruta local de la foto. Sin foto, la tarjeta usa la ilustración `not_image`. */
  image?: string | null
}

const menuCategories: readonly MenuCategory[] = [
  {
    id: "pizza",
    name: "Pizza",
    kicker: "01",
    description: "Pizzas artesanales, con ingredientes reales.",
  },
  {
    id: "dolce",
    name: "Dolce",
    kicker: "02",
    description: "El cierre dulce de la mesa.",
  },
]

const menuProducts: readonly MenuProduct[] = [
  {
    id: "americana",
    name: "Americana",
    description: "Crema al parmesano, mozzarella, cebolla morada, tocino ahumado y pechuga de pollo.",
    price: 16_900,
    category: "pizza",
    chefPick: true,
  },
  {
    id: "pollo-espinaca",
    name: "Pollo Espinaca",
    description: "Espinaca a la crema, parmesano, mozzarella fresca, champiñones asados y pollo desmechado.",
    price: 16_900,
    category: "pizza",
    chefPick: true,
  },
  {
    id: "caramel-funghi",
    name: "Caramel Funghi",
    description: "Crema al queso azul, mozzarella fresca, cebolla caramelizada y champiñones asados.",
    price: 16_900,
    category: "pizza",
    chefPick: true,
  },
]

function getChefSuggestions() {
  return menuProducts.filter((product) => product.chefPick)
}

function getCatalogPizzas() {
  return menuProducts.filter((product) => product.category === "pizza" && !product.chefPick)
}

export { getCatalogPizzas, getChefSuggestions, menuCategories, menuProducts }
export type { MenuCategory, MenuCategoryId, MenuProduct }
