/** Lo que se pide no existe (404). Lo lanza el servicio; el manejador de errores lo traduce. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
