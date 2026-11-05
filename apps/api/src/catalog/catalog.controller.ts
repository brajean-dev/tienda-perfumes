import type { FastifyRequest } from 'fastify';
import { parseRequest } from '../http/parse-request.ts';
import {
  brandParamsSchema,
  listPerfumesQuerySchema,
  perfumeParamsSchema,
} from './catalog.schemas.ts';
import type { CatalogService } from './catalog.service.ts';

/**
 * Traduce HTTP a llamadas al servicio: valida los parámetros con Zod (si no son válidos,
 * RequestValidationError, que el manejador de errores convierte en 400) y devuelve el resultado.
 * No contiene reglas del catálogo.
 */
export function createCatalogController(service: CatalogService) {
  return {
    listBrands: () => service.listBrands(),

    getBrand: (request: FastifyRequest) => {
      const { brandSlug } = parseRequest(brandParamsSchema, request.params);
      return service.getBrand(brandSlug);
    },

    listPerfumes: (request: FastifyRequest) => {
      const { brandSlug } = parseRequest(brandParamsSchema, request.params);
      const { q } = parseRequest(listPerfumesQuerySchema, request.query);
      return service.listPerfumes(brandSlug, q === undefined ? {} : { query: q });
    },

    getPerfume: (request: FastifyRequest) => {
      const { brandSlug, perfumeSlug } = parseRequest(perfumeParamsSchema, request.params);
      return service.getPerfume(brandSlug, perfumeSlug);
    },
  };
}
