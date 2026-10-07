export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ConflictError'
    this.code = code
  }
}
