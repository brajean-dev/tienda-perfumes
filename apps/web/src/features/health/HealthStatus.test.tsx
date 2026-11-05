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

  it('muestra un error con opción de reintentar si falla la red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<HealthStatus />);

    expect((await screen.findByText(/Sin conexión con la API/)).textContent).toContain(
      'No se pudo conectar',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('trata una respuesta distinta de 200 como error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }, 503));

    render(<HealthStatus />);

    expect(await screen.findByText(/Sin conexión con la API/)).toBeTruthy();
  });

  it('trata un cuerpo inesperado como error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'down' }));

    render(<HealthStatus />);

    expect(await screen.findByText(/Sin conexión con la API/)).toBeTruthy();
  });

  it('vuelve a consultar al pulsar "Reintentar" y se recupera', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<HealthStatus />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect((await screen.findByRole('status')).textContent).toContain('Conectado a la API');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

    expect(screen.getByRole('status').textContent).toContain('tardó demasiado');
  });
});
