# 0007. Convenciones HTTP de la API del catálogo

- **Estado:** Aceptado
- **Fecha:** 2026-11-05

## Contexto

La Fase 5b añade los primeros endpoints del catálogo, y la interfaz de la Fase 6 se construirá sobre ellos. Conviene fijar las convenciones antes de que haya clientes que dependan de ellas. La fuente de verdad es `packages/contracts/openapi.yaml` (ADR 0003).

## Decisión

1. **Solo lectura:** el catálogo se expone únicamente con `GET`.
2. **URLs anidadas por slug:** `/brands`, `/brands/{brandSlug}`, `/brands/{brandSlug}/perfumes` (con `?q=` para buscar por nombre) y `/brands/{brandSlug}/perfumes/{perfumeSlug}`. El slug del perfume es único por marca (ADR 0006).
3. **Listas como `{ "items": [...] }`**, no como un arreglo suelto, para poder añadir paginación u otros campos sin romper a los clientes.
4. **Un solo DTO de perfume** para la lista y el detalle: `slug`, `name`, `brand { slug, name }`, `description`, `sizeMl`, `price`, `imageUrl`, `notes { top, heart, base }` y `occasions`. El catálogo es pequeño y así la interfaz no depende de qué endpoint use.
5. **Precio:** `{ "amountCents": 25000, "currency": "PEN" }`, o `null` si aún no está definido. Nunca `0` ni un valor inventado.
6. **Datos ausentes:** campos opcionales como `null` y listas vacías; las claves siempre están presentes.
7. **Los DTO no exponen identificadores internos ni marcas de tiempo.** Los esquemas usan `additionalProperties: false`, de modo que un campo extra rompe las pruebas del contrato.
8. **Errores con una forma única:** `{ "error": { "code", "message" } }`, con tres códigos:
   - `VALIDATION_ERROR` (400): un slug mal formado, un `q` demasiado largo, repetido o con caracteres de control. **Un slug bien formado que no existe es un 404, no un 400.**
   - `NOT_FOUND` (404): la marca, el perfume o la ruta no existen.
   - `INTERNAL_ERROR` (500): un mensaje fijo; el detalle se escribe en el registro y nunca se devuelve.
     Solo la entrada del cliente validada en el controlador (`parseRequest`) produce un 400. Un `ZodError` que salga de otro sitio (por ejemplo, al validar datos internos) es un fallo interno: da un 500 y se registra.
9. **Los errores que Fastify resuelve antes de llegar a las rutas** (URL mal codificada, parámetro por encima de 300 caracteres) responden el mismo 400 con un mensaje fijo, que no repite lo que envió el cliente. Fastify los respondería por defecto con otra forma (y un 414) y repitiendo la ruta. Como estos errores no pasan por el plugin de CORS, la respuesta lleva `Access-Control-Allow-Origin` a mano cuando la petición viene del origen de la web; si no, la web vería un fallo de red en lugar del 400. Estos dos errores y el 404 de ruta pueden salir en cualquier ruta (se indica en la descripción del contrato).
10. **Los mensajes están en español.** Solo se repiten en un mensaje valores ya validados (slugs).
11. **Búsqueda `q`:** máximo 100 caracteres **tal como se envían** (los espacios cuentan); no admite caracteres de control, salvo el tabulador y los saltos de línea (el byte NUL no cabe en un texto de PostgreSQL y daría un 500 por una entrada del cliente). Los espacios del principio y del final se ignoran al buscar, y un texto en blanco equivale a no buscar: esa regla vive **solo en el repositorio**, no se repite en el controlador ni en el servicio. No distingue mayúsculas pero sí tildes (limitación conocida, ADR 0006).
12. **Capas:** ruta → controlador (valida con Zod mediante `parseRequest` y traduce HTTP) → servicio (reglas y presentación, no sabe de HTTP; los errores que lanza, como `NotFoundError`, viven en `src/errors.ts`, un módulo neutral) → repositorio (acceso a datos). Los DTO se tipan con los tipos generados desde el contrato.
13. **El registro de peticiones no guarda la consulta** (`?q=...`): las búsquedas de personas anónimas no tienen por qué quedar en un archivo de log (`src/http/request-log.ts`). Los errores de la base de datos se registran con su detalle y pueden incluir los argumentos de la consulta, que como mucho son esos 100 caracteres.
14. **Apagado ordenado** (`SIGINT`/`SIGTERM`): primero se cierra el servidor y terminan las peticiones en curso, después se desconecta Prisma; si algo falla o tarda más de 10 segundos, se registra y se sale con error.
15. **Contrato primero:** cambiar un endpoint es editar `openapi.yaml`, ejecutar `pnpm contracts:generate` y adaptar el código. Las pruebas de `apps/api/src/contract/` y `pnpm contracts:check` fallan si algo no cuadra.

## Alternativas consideradas

- **Arreglos sueltos en las listas:** más simples, pero cualquier cambio posterior (paginación, totales) rompería a los clientes.
- **`application/problem+json` (RFC 9457):** estándar, pero más campos de los que hoy necesita una interfaz pequeña. Se puede adoptar después manteniendo `code`.
- **Slug mal formado como 404:** unifica los casos, pero oculta al cliente que su petición estaba mal construida.
- **Dos DTO (resumen y detalle):** ahorra bytes en las listas, pero el catálogo es pequeño y obliga a mantener dos formas.
- **Paginación desde el inicio:** innecesaria con el tamaño actual; la envoltura `{ items }` deja la puerta abierta.

## Consecuencias

- Sin paginación: si el catálogo crece mucho, habrá que añadirla y revisar el orden, que hoy se hace en el repositorio y no en la base (ADR 0006).
- Un 500 no dice nada de la causa: para depurar hay que mirar el registro de la API.
- No hay autenticación ni escritura; si se añaden, se decidirán por separado.
- El tope de 300 caracteres por parámetro es un detalle de implementación; un parámetro mayor recibe el mismo 400 fijo.
