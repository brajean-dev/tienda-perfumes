import type { FastifyPluginAsync } from 'fastify';

// Contrato: packages/contracts/openapi.yaml (operationId: getHealth)
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok' as const }));
};
