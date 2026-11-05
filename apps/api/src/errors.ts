// Errores de la aplicación. Son neutrales: no dependen de HTTP. La capa HTTP (http/error-handler.ts)
// los traduce a respuestas, y el servicio puede lanzarlos sin saber cómo se presentan.

/** Lo que se pide no existe. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Una entrada del cliente no es válida. El mensaje se muestra a quien hizo la petición. */
export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}
