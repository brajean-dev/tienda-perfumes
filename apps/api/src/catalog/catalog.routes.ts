import type { FastifyPluginAsync } from 'fastify';
import { createCatalogController } from './catalog.controller.ts';
import type { CatalogService } from './catalog.service.ts';

// Contrato: packages/contracts/openapi.yaml (listBrands, getBrand, listBrandPerfumes, getPerfume).
// Una prueba comprueba que estas rutas y las del yaml coinciden en ambos sentidos.
export function catalogRoutes(service: CatalogService): FastifyPluginAsync {
  const controller = createCatalogController(service);

  return async (app) => {
    app.get('/brands', controller.listBrands);
    app.get('/brands/:brandSlug', controller.getBrand);
    app.get('/brands/:brandSlug/perfumes', controller.listPerfumes);
    app.get('/brands/:brandSlug/perfumes/:perfumeSlug', controller.getPerfume);
  };
}
