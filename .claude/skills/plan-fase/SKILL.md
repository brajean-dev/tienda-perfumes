---
name: plan-fase
description: Antes de ejecutar una fase del plan de la tienda de perfumes, genera un resumen y un miniplan y espera aprobación. Úsala al iniciar cada fase (1 a 7), cuando el usuario escriba /plan-fase, o cuando mencione plan-fase o pida el resumen y miniplan de una fase.
argument-hint: '[número de fase, p. ej. 3]'
---

# plan-fase

Prepara el arranque de una fase del plan **sin ejecutar nada**. Primero resumen y miniplan; solo se aplica después de que el usuario apruebe.

Fase solicitada: `$ARGUMENTS` (si viene vacío, deduce la siguiente fase pendiente y confírmala con el usuario).

## Fases del plan

1. Documentación base: `docs/spec.md`, ADRs en `docs/decisions/`, `docs/glossary.md`.
2. Entorno: pnpm, Docker, gh, jq.
3. Esqueleto del monorepo: git, pnpm workspaces, scripts raíz, `docker-compose.yml`, `.env.example`, `packages/contracts`, `CLAUDE.md` raíz.
4. Health check de punta a punta: `GET /health` en la API, contrato, consumo en la web, tests Vitest. Checkpoint.
5. Modelo de datos y API del catálogo: Prisma (Brand 1—N Perfume), migración, seed, capas, endpoints, `openapi.yaml`, README y `CLAUDE.md` por app.
6. Interfaz del catálogo: landing, marcas, perfumes por marca, estados de carga/vacío/error, accesibilidad, responsive.
7. Verificación y entrega: tests, typecheck, build, prueba manual, documentación final.

Si existe `docs/plan.md`, ese archivo manda sobre esta lista.

## Paso 1: inspeccionar (solo lectura)

Lee el estado real del repositorio antes de escribir nada: estructura de carpetas, `package.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `openapi.yaml`, migraciones y tests existentes. No des por hecho que una fase anterior está completa: compruébalo y dilo.

## Paso 2: entregar el resumen y el miniplan

Responde en español con exactamente estas secciones:

### Resumen

- Qué cubre la fase y por qué va en este punto del orden.
- Estado actual: qué ya existe, qué falta, qué cambió respecto al plan.
- Lo que queda **fuera de alcance** en esta fase.

### Miniplan

Lista numerada y ordenada. Cada paso indica los archivos que se crean o modifican y los comandos que se ejecutarán. Después:

- **Dependencias nuevas:** nombre y motivo. Marca las que no están en la guía del proyecto y justifica por qué la funcionalidad no se resuelve con lo ya instalado.
- **Verificación:** qué pruebas o comprobaciones se correrán y cuáles no se pueden correr.
- **Riesgos y decisiones abiertas:** lo que el usuario debería cuestionar o decidir.

## Paso 3: detenerse

Termina con una pregunta de aprobación. **No** crees ni edites archivos, **no** instales nada y **no** ejecutes comandos que modifiquen el sistema hasta que el usuario confirme. Si pide cambios, ajusta el miniplan y vuelve a preguntar.

## Paso 4: ejecutar (solo tras aprobación)

- Ejecuta lo aprobado, sin añadir alcance. Si surge algo no previsto, detente y consúltalo.
- Al terminar, informa qué cambió, qué comprobaciones corriste y con qué resultado, y cuáles **no** se ejecutaron. No afirmes que algo pasó si no lo ejecutaste.
- Cierra indicando el estado del plan: fases completadas, la actual y la siguiente.
