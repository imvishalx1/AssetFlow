export class AppError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, unknown>;
  meta?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, unknown>,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.meta = meta;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
