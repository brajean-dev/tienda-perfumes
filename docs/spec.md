# Especificación: tienda web de perfumes

**Estado:** borrador v0.3 · 2026-11-05 · fuentes: guía del proyecto y decisiones de Brajean

## Problema

Descubrir perfumes en línea cuesta: hay mucha oferta y poca guía para explorarla, sobre todo en perfumería de nicho y en español. La tienda quiere ayudar a descubrir productos mediante un catálogo navegable por marca, y facilitar la compra a medida que se incorporen las funciones comerciales.

## Propuesta de valor

Que la persona **conozca el perfume antes de elegirlo**: qué notas tiene y **para qué ocasión usarlo**. La información del perfume es el diferenciador, no el precio ni el volumen de catálogo.

## Usuarios

- **Público objetivo:** personas aficionadas a los perfumes, hispanohablantes, interesadas en perfumería **de nicho**. Los precios se muestran en **soles (PEN)**.
- **Visitante que explora el catálogo.** Navega sin cuenta, desde móvil o escritorio, para encontrar marcas y perfumes.
- No hay otros roles en esta versión. Tampoco hay administración: el catálogo se carga mediante datos semilla (`seed`) y **los precios los define Brajean**.

## Alcance (v1)

1. **Landing page** que presenta la propuesta de la tienda y da una entrada clara al catálogo.
2. **Catálogo de marcas**: explorar y seleccionar marcas.
3. **Página de marca** con los perfumes que le pertenecen.
4. **Tarjetas y páginas de producto** con, cuando existan los datos: nombre, marca, imagen, descripción, tamaño y precio (en soles), y, por la propuesta de valor, **notas olfativas y ocasiones de uso**. Contenido en español.
5. **Navegación**: volver de una marca a la lista general; conservar filtros o búsquedas cuando sea razonable (en la URL).
6. **Estados** de carga, vacío y error en catálogo y vistas de marca.
7. **Interfaz** adaptada a móvil y escritorio, con HTML semántico, teclado, etiquetas accesibles, texto alternativo útil y respeto a la preferencia de movimiento reducido. Los estados no se comunican solo con color.
8. **Health check**: `GET /health` en la API, documentado en `openapi.yaml`, consumido por la web con estados de carga y error.

## Fuera de alcance

- Pagos y cualquier integración de pasarela.
- Inventario o stock.
- Cuentas de usuario y autenticación.
- Carrito y checkout _(decisión de planificación: la guía no los define, así que no se inventan)_.
- Panel de administración del catálogo.
- Fotografía propia de producto: la v1 usa placeholders; las fotos originales se conectan después.

## Restricciones técnicas

Monorepo pnpm con `apps/web` (React + Vite + TypeScript), `apps/api` (Fastify + TypeScript + Zod + Prisma), `packages/contracts` (`openapi.yaml`), PostgreSQL en Docker y Vitest en ambas apps. Ver `docs/decisions/`.

## Criterios de aceptación

- Desde la landing se llega al catálogo con una acción clara.
- Cada perfume pertenece a exactamente una marca; la página de una marca lista solo sus perfumes.
- `GET /health` responde y está documentado en `openapi.yaml`; la web muestra los estados cargando, conectado y error con texto, no solo con color.
- Un error o dato ausente no rompe la navegación.
- La interfaz se puede usar con teclado y las imágenes tienen texto alternativo útil.
- Las pruebas Vitest de `apps/api` y `apps/web` pasan.

## Decisiones tomadas

- **Marcas reales**, por ahora de perfumería de nicho.
- **Imágenes:** placeholders en v1, con `imageUrl` listo para sustituirlas por fotos propias.
- **Precios:** los asigna Brajean; no se inventan ni se copian de otras tiendas.
- **Notas olfativas** en tres listas (salida, corazón y fondo) y **ocasiones de uso** como texto libre por ahora; precio en céntimos de sol, opcional (ver ADR 0006).
- **Sincronización contrato–código:** pruebas contra `openapi.yaml` y tipos generados (ver ADR 0003).
- **Datos de ejemplo:** el catálogo inicial lleva cuatro marcas reales de nicho (Byredo, Le Labo, Maison Francis Kurkdjian y Xerjoff), solo con su nombre, y perfumes `[EJEMPLO]` sin precio ni datos reales.

## Preguntas abiertas

- **Lista definitiva de marcas y perfumes** de nicho que se publicarán.
- **Origen y verificación de las notas olfativas** de cada perfume real: deben salir de una fuente fiable, no de memoria ni de un modelo de lenguaje.
- **Lista cerrada de ocasiones de uso**, cuando haya suficientes perfumes reales para definirla.
- Cómo carga Brajean los precios sin panel de administración (por ahora: editando los datos del `seed`, `apps/api/prisma/seed-data.ts`).
