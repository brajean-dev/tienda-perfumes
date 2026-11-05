// Contrato: packages/contracts/openapi.yaml (operationId: getHealth).
// Tipo escrito a mano; la sincronización automática se decide en el ADR 0003.
export type HealthResponse = { status: 'ok' };

// 'network': no hubo respuesta (API caída, CORS, DNS). 'bad-response': la API respondió, pero mal.
export type HealthErrorKind = 'network' | 'bad-response';

export class HealthError extends Error {
  readonly kind: HealthErrorKind;

  constructor(kind: HealthErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HealthError';
    this.kind = kind;
  }
}

const DEFAULT_API_URL = 'http://localhost:3000';

// Un valor vacío cuenta como "no definido" y la barra final se ignora (evita pedir //health).
export function resolveApiUrl(raw: string | undefined): string {
  const value = raw?.trim();
  return (value ? value : DEFAULT_API_URL).replace(/\/+$/, '');
}

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' && value !== null && (value as { status?: unknown }).status === 'ok'
  );
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/health`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    throw new HealthError('network', 'No se pudo conectar con la API', { cause: error });
  }

  if (!response.ok) {
    throw new HealthError('bad-response', `La API respondió con el estado ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new HealthError('bad-response', 'La API devolvió un cuerpo que no es JSON', {
      cause: error,
    });
  }

  if (!isHealthResponse(body)) {
    throw new HealthError('bad-response', 'Respuesta inesperada de /health');
  }
  return body;
}
