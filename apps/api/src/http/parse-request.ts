import type { z } from 'zod';
import { RequestValidationError } from '../errors.ts';

/**
 * Valida una entrada del cliente (parámetros de ruta o de consulta) con un esquema de Zod.
 * Si no es válida lanza RequestValidationError (400). Un ZodError que salga de cualquier otro sitio
 * NO se trata como un error del cliente: sería un fallo interno y acaba en un 500 registrado.
 */
export function parseRequest<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'solicitud'}: ${issue.message}`)
      .join('; ');
    throw new RequestValidationError(detail);
  }
  return result.data;
}
