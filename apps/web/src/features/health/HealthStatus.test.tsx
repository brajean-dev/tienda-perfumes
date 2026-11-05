import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthStatus } from './HealthStatus';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HealthStatus', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('muestra el estado de carga mientras la API no responde', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<HealthStatus />);

    expect(screen.getByRole('status').textContent).toContain('Comprobando conexión');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra "conectado" cuando /health responde { status: "ok" }', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));

    render(<HealthStatus />);

    expect((await screen.findByRole('status')).textContent).toContain('Conectado a la API');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/health$/);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra "sin conexión" con opción de reintentar si falla la red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<HealthStatus />);

    expect((await screen.findByText(/Sin conexión con la API/)).textContent).toContain(
      'No se pudo conectar',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('distingue una API que responde mal de una API caída (estado distinto de 200)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }, 503));

    render(<HealthStatus />);

    const status = await screen.findByText(/respondió de forma inesperada/);
    expect(status.textContent).not.toContain('Sin conexión');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('distingue una API que responde mal de una API caída (cuerpo inesperado)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'down' }));

    render(<HealthStatus />);

    const status = await screen.findByText(/respondió de forma inesperada/);
    expect(status.textContent).not.toContain('Sin conexión');
  });

  it('distingue una API que responde mal de una API caída (cuerpo que no es JSON)', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 200 }));

    render(<HealthStatus />);

    expect(await screen.findByText(/respondió de forma inesperada/)).toBeTruthy();
  });

  it('vuelve a consultar al pulsar "Reintentar" y se recupera', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<HealthStatus />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect((await screen.findByText('Conectado a la API')).textContent).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('conserva el foco en el estado al reintentar, aunque el botón desaparezca', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<HealthStatus />);
    const retryButton = await screen.findByRole('button', { name: 'Reintentar' });
    retryButton.focus();
    expect(document.activeElement).toBe(retryButton);

    fireEvent.click(retryButton);
    await screen.findByText('Conectado a la API');

    expect(screen.queryByRole('button')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('status'));
  });

  it('informa de un tiempo de espera agotado', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    render(<HealthStatus />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByRole('status').textContent).toContain('Tardó demasiado');
  });
});
