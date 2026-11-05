import { z } from 'zod';
import './zod-es.ts';

const envSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  // Solo http(s): otros esquemas (file:, data:) dan el origen "null" y abrirían una brecha en CORS.
  // Se normaliza a "origen" (sin barra final) para que CORS compare igual que el navegador.
  WEB_ORIGIN: z
    .url({ protocol: /^https?$/ })
    .default('http://localhost:5173')
    .transform((value) => new URL(value).origin),
  // Obligatoria: sin ella la API no puede servir el catálogo, así que se falla al arrancar.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Configuración inválida (revisa tu .env, ver .env.example):\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
