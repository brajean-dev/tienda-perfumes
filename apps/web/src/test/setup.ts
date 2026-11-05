import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin "globals" de Vitest, Testing Library no limpia el DOM por sí sola.
afterEach(() => {
  cleanup();
});
