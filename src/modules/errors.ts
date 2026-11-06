export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = 'APP_ERROR',
    /**
     * Seconds the caller should wait before retrying. Set on 429 responses so
     * the error handler can emit a standard `Retry-After` header; the client
     * reads it to show an accurate countdown instead of guessing.
     */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
