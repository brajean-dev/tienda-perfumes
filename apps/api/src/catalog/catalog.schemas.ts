import { z } from 'zod';
import '../zod-es.ts';

// Estas constantes también están en openapi.yaml (esquema Slug y parámetro q). Una prueba del
// contrato comprueba que coinciden, para que el yaml y la validación no se separen.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;
export const SEARCH_MAX_LENGTH = 100;

const slug = z
  .string()
  .min(1)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, 'debe usar solo minúsculas, números y guiones (por ejemplo "casa-aurora")');

export const brandParamsSchema = z.object({ brandSlug: slug });

export const perfumeParamsSchema = z.object({ brandSlug: slug, perfumeSlug: slug });

export const listPerfumesQuerySchema = z.object({
  // Un texto en blanco equivale a no buscar. Un q repetido (?q=a&q=b) llega como arreglo y falla.
  q: z.string().trim().max(SEARCH_MAX_LENGTH).optional(),
});
