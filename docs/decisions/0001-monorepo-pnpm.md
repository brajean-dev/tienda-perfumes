# 0001. Monorepo con pnpm workspaces

- **Estado:** Aceptado (definido por la guía del proyecto)
- **Fecha:** 2026-11-04

## Contexto

El proyecto tiene frontend, backend y un paquete de contratos que deben evolucionar juntos. La guía exige un monorepo administrado con pnpm workspaces.

## Decisión

Un solo repositorio con `pnpm-workspace.yaml` que declara `apps/*` y `packages/*`. Las tareas comunes (desarrollo, pruebas, compilación) se exponen como scripts en el `package.json` raíz.

## Alternativas consideradas

- **Repositorios separados:** más aislamiento, pero cambios de contrato en varios repos a la vez.
- **npm o yarn workspaces:** funcionan, pero la guía fija pnpm.
- **Turborepo o Nx:** aportan caché y orquestación de tareas. Con dos apps y un paquete no compensan la dependencia extra; se reevalúa si los tiempos de build crecen.

## Consecuencias

- Un solo lockfile y un solo `pnpm install`.
- La versión de pnpm se fija con el campo `packageManager` y corepack. Instalado hoy: pnpm 12.16.1.
- No se cambia esta estructura sin instrucción explícita.
