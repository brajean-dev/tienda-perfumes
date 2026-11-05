import type { components } from '@tienda/contracts';
import type { FastifyInstance, FastifyReply, FastifyServerOptions } from 'fastify';
import { ZodError } from 'zod';
import { NotFoundError } from './errors.ts';

type ErrorResponse = components['schemas']['ErrorResponse'];
type ErrorCode = ErrorResponse['error']['code'];

function body(code: ErrorCode, message: string): ErrorResponse {
  return { error: { code, message } };
}

/**
 * Tope de longitud de un parámetro de ruta. Fastify responde 414 por su cuenta por encima de 100;
 * se sube para que un slug demasiado largo (máx. 100) llegue a la validación y dé un 400 con la
 * forma del contrato.
 */
export const MAX_PARAM_LENGTH = 300;

/**
 * Errores que Fastify resuelve ANTES de llegar a las rutas (URL mal codificada, parámetro por
 * encima del tope). No pasan por `setErrorHandler`, y su respuesta por defecto no es la del
 * contrato y repite la ruta recibida. Se responden con un 400 fijo.
 */
export const frameworkErrors: NonNullable<FastifyServerOptions['frameworkErrors']> = (
  _error,
  _request,
  reply,
) => {
  // El tipo genérico de `reply` aquí es más estricto de lo necesario; se usa el estándar.
  return (reply as FastifyReply)
    .code(400)
    .send(body('VALIDATION_ERROR', 'La solicitud no es válida.'));
};

/**
 * Forma única de los errores (contrato: ErrorResponse). Nunca se devuelven detalles internos en un
 * 500: se registran en el log y la persona recibe un mensaje genérico.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    // Mensaje fijo: no se repite en la respuesta lo que envió el cliente.
    return reply.code(404).send(body('NOT_FOUND', 'No existe la ruta pedida.'));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join('.') || 'solicitud'}: ${issue.message}`)
        .join('; ');
      return reply.code(400).send(body('VALIDATION_ERROR', detail));
    }

    if (error instanceof NotFoundError) {
      return reply.code(404).send(body('NOT_FOUND', error.message));
    }

    // Errores del cliente que Fastify detecta por su cuenta (URL demasiado larga, cabeceras...):
    // el contrato solo documenta el 400 para ellos.
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.code(400).send(body('VALIDATION_ERROR', 'La solicitud no es válida.'));
    }

    request.log.error({ err: error }, 'error no controlado');
    return reply.code(500).send(body('INTERNAL_ERROR', 'Error interno del servidor.'));
  });
}
