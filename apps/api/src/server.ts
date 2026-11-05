import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = await buildApp(config, { logger: true });

try {
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
