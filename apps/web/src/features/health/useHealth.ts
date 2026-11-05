import { useCallback, useEffect, useState } from 'react';
import { fetchHealth } from './healthApi';

export type HealthState =
  { status: 'loading' } | { status: 'connected' } | { status: 'error'; message: string };

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
      .catch(() => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: controller.signal.aborted
            ? 'La API tardó demasiado en responder.'
            : 'No se pudo conectar con la API.',
        });
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
