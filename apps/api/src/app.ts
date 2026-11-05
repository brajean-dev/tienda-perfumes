import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.ts';
import { healthRoutes } from './routes/health.ts';

type AppOptions = { logger?: boolean };

export async function buildApp(
  config: Pick<Config, 'WEB_ORIGIN'>,
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: [config.WEB_ORIGIN],
    methods: ['GET', 'HEAD', 'OPTIONS'],
  });
  await app.register(healthRoutes);

  return app;
}
