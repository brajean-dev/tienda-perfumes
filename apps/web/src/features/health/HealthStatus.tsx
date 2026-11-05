import { useHealth, type HealthState } from './useHealth';

const ICONS: Record<HealthState['status'], string> = {
  loading: '…',
  connected: '✓',
  error: '!',
};

function describe(state: HealthState): string {
  switch (state.status) {
    case 'loading':
      return 'Comprobando conexión con la API…';
    case 'connected':
      return 'Conectado a la API';
    case 'error':
      return `Sin conexión con la API. ${state.message}`;
  }
}

export function HealthStatus() {
  const { state, retry } = useHealth();

  return (
    <section aria-labelledby="health-heading" className="health">
      <h2 id="health-heading">Estado de la API</h2>
      <p role="status" className={`health__status health__status--${state.status}`}>
        <span aria-hidden="true" className="health__icon">
          {ICONS[state.status]}
        </span>
        <span>{describe(state)}</span>
      </p>
      {state.status === 'error' && (
        <button type="button" onClick={retry}>
          Reintentar
        </button>
      )}
    </section>
  );
}
