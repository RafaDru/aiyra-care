/** Erro HTTP da API com código de negócio opcional (ex. CPF_ALREADY_LINKED). */
export class ApiResponseError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
    this.code = code
  }
}

export function isApiResponseError(err: unknown): err is ApiResponseError {
  return err instanceof ApiResponseError
}
