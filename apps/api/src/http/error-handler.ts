import type { components } from '@tienda/contracts';
import type { FastifyInstance, FastifyReply, FastifyServerOptions } from 'fastify';
import { NotFoundError, RequestValidationError } from '../errors.ts';

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
 * encima del tope). No pasan por `setErrorHandler` ni por el plugin de CORS, y su respuesta por
 * defecto no es la del contrato y repite la ruta recibida. Se responden con un 400 fijo y, si la
 * petición viene del origen permitido, con la cabecera de CORS (si no, la web vería un fallo de red
 * en lugar del 400).
 */
export function createFrameworkErrors(
  allowedOrigin: string,
): NonNullable<FastifyServerOptions['frameworkErrors']> {
  return (_error, request, reply) => {
    // El tipo genérico de `reply` aquí es más estricto de lo necesario; se usa el estándar.
    const response = reply as FastifyReply;
    const origin = request.headers.origin;
    if (origin !== undefined && origin === allowedOrigin) {
      response.header('access-control-allow-origin', origin).header('vary', 'Origin');
    }
    return response.code(400).send(body('VALIDATION_ERROR', 'La solicitud no es válida.'));
  };
}

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
    if (error instanceof RequestValidationError) {
      return reply.code(400).send(body('VALIDATION_ERROR', error.message));
    }

    if (error instanceof NotFoundError) {
      return reply.code(404).send(body('NOT_FOUND', error.message));
    }

    // Errores del cliente que Fastify detecta por su cuenta (cabeceras demasiado grandes...): el
    // contrato solo documenta el 400 para ellos. Un ZodError que llegue aquí NO es del cliente
    // (la entrada se valida con parseRequest): es un fallo interno y cae en el 500 de abajo.
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.code(400).send(body('VALIDATION_ERROR', 'La solicitud no es válida.'));
    }

    request.log.error({ err: error }, 'error no controlado');
    return reply.code(500).send(body('INTERNAL_ERROR', 'Error interno del servidor.'));
  });
}
