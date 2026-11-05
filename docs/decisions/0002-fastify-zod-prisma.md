# 0002. Backend con Fastify, Zod y Prisma

- **Estado:** Aceptado (definido por la guía del proyecto)
- **Fecha:** 2026-11-04

## Contexto

La API expone un catálogo de marcas y perfumes y un health check. Necesita validar entradas en el servidor y acceder a PostgreSQL con tipos.

## Decisión

`apps/api` usa Fastify con TypeScript. Zod valida entradas y configuración. Prisma es el ORM. Se separan rutas, controladores, servicios y acceso a datos, sin abstracciones prematuras.

## Alternativas consideradas

- **Express:** más conocido, pero sin validación ni tipado integrados al estilo de Fastify.
- **NestJS:** estructura completa, pero más peso y convenciones para el tamaño actual del proyecto.
- **Drizzle o TypeORM:** alternativas a Prisma; la guía fija Prisma.

## Consecuencias

- La validación del servidor es la que cuenta; la del cliente solo mejora la experiencia.
- Los esquemas Zod y `openapi.yaml` describen lo mismo en dos sitios: el riesgo de divergencia se trata en el ADR 0003.
- Las versiones concretas se fijan al instalar y se comprueban entonces; no se asumen aquí.
