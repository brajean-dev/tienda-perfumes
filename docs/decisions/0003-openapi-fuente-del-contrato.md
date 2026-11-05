# 0003. `openapi.yaml` como contrato y cómo mantenerlo sincronizado

- **Estado:** Propuesto
- **Fecha:** 2026-11-04

## Contexto

La guía exige que `packages/contracts/openapi.yaml` sea el contrato de la API y que se actualice junto con los endpoints, evitando divergencias. Pero el yaml se escribe a mano y las rutas validan con Zod: son dos descripciones de lo mismo y pueden separarse sin que nadie lo note.

## Decisión

**Ya definido por la guía:** `openapi.yaml` es el contrato y se actualiza en el mismo cambio que el endpoint.

**Propuesto, pendiente de aprobación** (ambos añaden dependencias o código):

1. Una prueba Vitest en `apps/api` que valide las respuestas reales contra el yaml.
2. Generar los tipos de `apps/web` desde el yaml con `openapi-typescript`, en lugar de mantenerlos a mano.

## Alternativas consideradas

- **Generar el yaml desde Zod (code-first):** el contrato nunca diverge, pero deja de ser la fuente que pide la guía.
- **Tipos TypeScript compartidos entre web y api:** simples, pero la guía los admite solo si hay una forma clara de mantenerlos sincronizados.
- **Solo disciplina de revisión:** sin coste de dependencias, pero depende de que alguien se acuerde.

## Consecuencias

- Sin las dos medidas propuestas, la sincronización depende de la revisión (por ejemplo, del agente `contract-checker`, si se crea).
- Decidir antes de la Fase 5, cuando aparecen los endpoints del catálogo.
