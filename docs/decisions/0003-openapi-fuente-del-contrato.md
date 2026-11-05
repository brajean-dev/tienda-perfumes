# 0003. `openapi.yaml` como contrato y cómo mantenerlo sincronizado

- **Estado:** Aceptado (2026-11-05; se implementa en la Fase 5b)
- **Fecha:** 2026-11-04

## Contexto

La guía exige que `packages/contracts/openapi.yaml` sea el contrato de la API y que se actualice junto con los endpoints, evitando divergencias. Pero el yaml se escribe a mano y las rutas validan con Zod: son dos descripciones de lo mismo y pueden separarse sin que nadie lo note.

## Decisión

`openapi.yaml` es el contrato y se actualiza en el mismo cambio que el endpoint (definido por la guía). Para mantenerlo sincronizado se adoptan **ambas** medidas, decididas por el dueño del proyecto el 2026-11-05:

1. **Pruebas Vitest en `apps/api` contra el yaml:** las rutas registradas en Fastify y las del contrato deben coincidir, y las respuestas reales (incluidos los errores 400 y 404) deben cumplir los esquemas del contrato. Dependencias: `yaml` y `ajv` (solo desarrollo).
2. **Tipos generados con `openapi-typescript`** desde el yaml, en `packages/contracts`, para que la web los importe en lugar de mantenerlos a mano. Se versiona el archivo generado y un script comprueba que no esté desactualizado.

## Alternativas consideradas

- **Generar el yaml desde Zod (code-first):** el contrato nunca diverge, pero deja de ser la fuente que pide la guía.
- **Tipos TypeScript compartidos entre web y api:** simples, pero la guía los admite solo si hay una forma clara de mantenerlos sincronizados.
- **Solo disciplina de revisión:** sin coste de dependencias, pero depende de que alguien se acuerde.

## Consecuencias

- Cambiar un endpoint sin actualizar el yaml (o al revés) rompe una prueba en lugar de pasar desapercibido.
- Hay dos dependencias de desarrollo en la API y una en `packages/contracts`, que la guía no menciona.
- **Riesgo por comprobar en la 5b:** `openapi-typescript` declara compatibilidad con TypeScript 5 y el proyecto usa la 7. Si no funciona, se usará TypeScript 5.x acotado al paquete de contratos.
- Sigue sin haber un validador completo de OpenAPI: las pruebas validan los esquemas de respuesta, no todo el documento.
