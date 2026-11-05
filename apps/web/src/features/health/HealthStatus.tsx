import { useRef } from 'react';
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
      return state.message;
  }
}

export function HealthStatus() {
  const { state, retry } = useHealth();
  const statusRef = useRef<HTMLParagraphElement>(null);

  // El botón desaparece al reintentar (y al conectar). Se mueve el foco al estado antes de
  // que ocurra, para que quien navega con teclado o lector de pantalla no pierda su posición.
  function handleRetry() {
    statusRef.current?.focus();
    retry();
  }

  return (
    <section aria-labelledby="health-heading" className="health">
      <h2 id="health-heading">Estado de la API</h2>
      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className={`health__status health__status--${state.status}`}
      >
        <span aria-hidden="true" className="health__icon">
          {ICONS[state.status]}
        </span>
        <span>{describe(state)}</span>
      </p>
      {state.status === 'error' && (
        <button type="button" onClick={handleRetry}>
          Reintentar
        </button>
      )}
    </section>
  );
}
