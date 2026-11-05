import type { FastifyRequest } from 'fastify';

/**
 * Cómo se registra una petición entrante. Es lo mismo que registra Fastify por defecto, sin la
 * consulta (?q=...): las búsquedas de personas anónimas no tienen por qué quedar en un archivo de log.
 */
export function requestForLog(request: FastifyRequest) {
  return {
    method: request.method,
    url: request.url.split('?')[0],
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  };
}
