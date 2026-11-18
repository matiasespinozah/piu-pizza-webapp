import "server-only"

class CatalogError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "CatalogError"
    this.status = status
  }
}

export { CatalogError }
