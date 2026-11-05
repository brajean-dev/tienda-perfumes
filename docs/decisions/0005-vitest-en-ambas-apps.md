# 0005. Vitest en `apps/web` y `apps/api`

- **Estado:** Aceptado (definido por la guía del proyecto)
- **Fecha:** 2026-11-04

## Contexto

La guía pide pruebas con Vitest en ambas aplicaciones, incluyendo el endpoint `/health` y el consumo y estado que muestra la web.

## Decisión

Vitest como único ejecutor de pruebas. En `apps/api`, las rutas se prueban con `app.inject()` de Fastify, sin levantar un puerto real. En `apps/web`, se prueban los componentes y el estado de conexión.

## Alternativas consideradas

- **Jest:** más extendido, pero Vitest comparte configuración con Vite y la guía lo fija.
- **Playwright o Cypress:** útiles para pruebas de extremo a extremo; quedan fuera de esta versión.

## Consecuencias

- Probar componentes React requiere un entorno de DOM (`jsdom`) y `@testing-library/react` (con su peer `@testing-library/dom`). La guía no los menciona; fueron **aprobadas el 2026-11-05** al iniciar la Fase 4. No se añadieron `jest-dom` ni `user-event`: bastan las aserciones simples y `fireEvent`.
- Sin los "globals" de Vitest, Testing Library no limpia el DOM sola; `apps/web/src/test/setup.ts` registra la limpieza.
- Si una comprobación no se ejecuta, se dice explícitamente; no se da por pasada.
