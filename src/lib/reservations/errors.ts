class ReservationError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ReservationError"
    this.status = status
    this.code = code
  }
}

export { ReservationError }
