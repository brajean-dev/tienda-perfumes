import type { FastifyRequest } from 'fastify';
import {
  brandParamsSchema,
  listPerfumesQuerySchema,
  perfumeParamsSchema,
} from './catalog.schemas.ts';
import type { CatalogService } from './catalog.service.ts';

/**
 * Traduce HTTP a llamadas al servicio: valida los parámetros con Zod (un ZodError lo convierte en
 * 400 el manejador de errores) y devuelve el resultado. No contiene reglas del catálogo.
 */
export function createCatalogController(service: CatalogService) {
  return {
    listBrands: () => service.listBrands(),

    getBrand: (request: FastifyRequest) => {
      const { brandSlug } = brandParamsSchema.parse(request.params);
      return service.getBrand(brandSlug);
    },

    listPerfumes: (request: FastifyRequest) => {
      const { brandSlug } = brandParamsSchema.parse(request.params);
      const { q } = listPerfumesQuerySchema.parse(request.query);
      return service.listPerfumes(brandSlug, q === undefined ? {} : { query: q });
    },

    getPerfume: (request: FastifyRequest) => {
      const { brandSlug, perfumeSlug } = perfumeParamsSchema.parse(request.params);
      return service.getPerfume(brandSlug, perfumeSlug);
    },
  };
}
