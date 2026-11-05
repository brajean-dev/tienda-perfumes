import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { catalogRoutes } from './catalog/catalog.routes.ts';
import type { CatalogRepository } from './catalog/catalog.repository.ts';
import { createCatalogService } from './catalog/catalog.service.ts';
import type { Config } from './config.ts';
import { frameworkErrors, MAX_PARAM_LENGTH, registerErrorHandling } from './http/error-handler.ts';
import { healthRoutes } from './routes/health.ts';

export type RegisteredRoute = { method: string; url: string };

type AppOptions = {
  logger?: boolean;
  /** Si se omite, no se registran las rutas del catálogo (por ejemplo, en pruebas de /health). */
  catalog?: CatalogRepository;
  /** Se llama una vez por cada ruta registrada. Lo usan las pruebas para compararlas con el contrato. */
  onRoute?: (route: RegisteredRoute) => void;
};

export async function buildApp(
  config: Pick<Config, 'WEB_ORIGIN'>,
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    routerOptions: { maxParamLength: MAX_PARAM_LENGTH },
    frameworkErrors,
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
