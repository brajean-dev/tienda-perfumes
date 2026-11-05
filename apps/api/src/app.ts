import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { catalogRoutes } from './catalog/catalog.routes.ts';
import type { CatalogRepository } from './catalog/catalog.repository.ts';
import { createCatalogService } from './catalog/catalog.service.ts';
import type { Config } from './config.ts';
import {
  createFrameworkErrors,
  MAX_PARAM_LENGTH,
  registerErrorHandling,
} from './http/error-handler.ts';
import { requestForLog } from './http/request-log.ts';
import { healthRoutes } from './routes/health.ts';

export type RegisteredRoute = { method: string; url: string };

type AppOptions = {
  logger?: boolean;
  /** Si se omite, no se registran las rutas del catálogo (por ejemplo, en pruebas de /health). */
  catalog?: CatalogRepository;
  /** SOLO PARA PRUEBAS: se llama una vez por cada ruta registrada, para compararlas con el contrato. */
  onRoute?: (route: RegisteredRoute) => void;
};

export async function buildApp(
  config: Pick<Config, 'WEB_ORIGIN'>,
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ? { serializers: { req: requestForLog } } : false,
    routerOptions: { maxParamLength: MAX_PARAM_LENGTH },
    frameworkErrors: createFrameworkErrors(config.WEB_ORIGIN),
  });

  // Debe ir antes de registrar las rutas: el hook solo ve las que se añaden después.
  const { onRoute } = options;
  if (onRoute) {
    app.addHook('onRoute', (route) => {
      for (const method of [route.method].flat()) {
        onRoute({ method, url: route.url });
      }
    });
  }

  registerErrorHandling(app);

  await app.register(cors, {
    origin: [config.WEB_ORIGIN],
    methods: ['GET', 'HEAD', 'OPTIONS'],
  });
  await app.register(healthRoutes);

  if (options.catalog) {
    await app.register(catalogRoutes(createCatalogService(options.catalog)));
  }

  return app;
}
