import { z } from 'zod';

const envSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  // Se normaliza a "origen" (sin barra final) para que CORS compare igual que el navegador.
  WEB_ORIGIN: z
    .url()
    .default('http://localhost:5173')
    .transform((value) => new URL(value).origin),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
