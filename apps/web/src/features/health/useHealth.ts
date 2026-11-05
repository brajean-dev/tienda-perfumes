import { useCallback, useEffect, useState } from 'react';
import { fetchHealth, HealthError } from './healthApi';

export type HealthState =
  { status: 'loading' } | { status: 'connected' } | { status: 'error'; message: string };

function errorMessage(error: unknown, timedOut: boolean): string {
  if (timedOut) return 'Sin conexión con la API. Tardó demasiado en responder.';
  if (error instanceof HealthError && error.kind === 'bad-response') {
    return 'La API respondió de forma inesperada.';
  }
  return 'Sin conexión con la API. No se pudo conectar.';
}

export function useHealth(timeoutMs = 5000) {
  const [state, setState] = useState<HealthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    setState({ status: 'loading' });

    fetchHealth(controller.signal)
      .then(() => {
        if (!cancelled) setState({ status: 'connected' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Si no se canceló por desmontaje y la señal está abortada, fue el tiempo límite.
        setState({ status: 'error', message: errorMessage(error, controller.signal.aborted) });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, timeoutMs]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
