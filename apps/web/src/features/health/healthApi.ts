// Contrato: packages/contracts/openapi.yaml (operationId: getHealth).
// Tipo escrito a mano; la sincronización automática se decide en el ADR 0003.
export type HealthResponse = { status: 'ok' };

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' && value !== null && (value as { status?: unknown }).status === 'ok'
  );
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`La API respondió con el estado ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isHealthResponse(body)) {
    throw new Error('Respuesta inesperada de /health');
  }
  return body;
}
