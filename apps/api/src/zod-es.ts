import { z } from 'zod';

// Mensajes de validación de Zod en español para toda la API (configuración y parámetros HTTP).
// Se importa por su efecto: `import './zod-es.ts'`.
z.config(z.locales.es());
