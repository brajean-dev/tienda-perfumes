import { z } from 'zod';
import '../zod-es.ts';

// Estas constantes también están en openapi.yaml (esquema Slug y parámetro q). Una prueba del
// contrato comprueba que coinciden, para que el yaml y la validación no se separen.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;
export const SEARCH_MAX_LENGTH = 100;
// Sin caracteres de control (incluido el byte NUL, que PostgreSQL no admite en un texto y daría un
// 500 por una entrada del cliente). Se permiten el tabulador y los saltos de línea.
export const SEARCH_PATTERN = /^[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/;

const slug = z
  .string()
  .min(1)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, 'debe usar solo minúsculas, números y guiones (por ejemplo "casa-aurora")');

export const brandParamsSchema = z.object({ brandSlug: slug });

export const perfumeParamsSchema = z.object({ brandSlug: slug, perfumeSlug: slug });

export const listPerfumesQuerySchema = z.object({
  // El máximo se mide sobre lo que envía el cliente, tal cual (antes de recortar espacios). Recortar
  // un texto en blanco y tratarlo como "sin búsqueda" lo hace el repositorio, en un solo sitio.
  // Un q repetido (?q=a&q=b) llega como arreglo y falla.
  q: z
    .string()
    .max(SEARCH_MAX_LENGTH)
    .regex(SEARCH_PATTERN, 'no puede contener caracteres de control')
    .optional(),
});
