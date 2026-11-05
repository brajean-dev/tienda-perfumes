# 0006. Modelo de datos del catálogo

- **Estado:** Aceptado
- **Fecha:** 2026-11-05

## Contexto

La guía pide modelar explícitamente que cada perfume pertenece a una marca, y mostrar nombre, marca, imagen, descripción, tamaño y precio cuando existan. La spec añade como propuesta de valor las notas olfativas y la ocasión de uso. Los precios los define el dueño de la tienda y la lista de ocasiones no está decidida.

## Decisión

Dos tablas en PostgreSQL, gestionadas con Prisma (`apps/api/prisma/schema.prisma`):

- **`Brand`**: `id` (UUID nativo de PostgreSQL, generado por Prisma), `slug` único, `name`, `description?` y marcas de tiempo.
- **`Perfume`**: `id` (UUID nativo), `slug`, `name`, `description?`, `sizeMl?`, `priceCents?`, `imageUrl?`, `notesTop[]`, `notesHeart[]`, `notesBase[]`, `occasions[]`, `brandId` obligatorio y marcas de tiempo.

Reglas:

1. **Relación 1—N obligatoria:** `Perfume.brandId` es clave foránea con `ON DELETE RESTRICT`; no se puede borrar una marca que tiene perfumes ni crear un perfume sin marca.
2. **Slug único por marca:** restricción `(brandId, slug)`. Dos marcas pueden tener un perfume con el mismo slug, y las URLs son anidadas (`/brands/{marca}/perfumes/{perfume}`).
3. **Precio en céntimos de sol (PEN), entero y opcional:** `priceCents`. `null` significa "precio por definir"; nunca se inventa un precio. Evita decimales y errores de redondeo.
4. **Notas en tres listas** (salida, corazón y fondo) como arreglos de texto de PostgreSQL.
5. **Ocasiones como texto libre** en un arreglo, mientras no exista una lista cerrada.
6. **Datos ausentes:** tamaño, precio, imagen y descripción son opcionales; las listas vacías significan "sin dato".

## Alternativas consideradas

- **Tabla `Note` y tabla `Occasion` normalizadas:** permiten filtrar y reutilizar, pero añaden tablas, relaciones y migraciones para un catálogo pequeño y con taxonomía aún indefinida. Se reevalúa cuando se decida la lista de ocasiones.
- **`Decimal` para el precio:** Prisma lo devuelve como objeto que hay que serializar; un entero en céntimos es más simple.
- **Una sola lista de notas:** más simple, pero pierde la estructura por capas que describe el perfume.
- **Identificadores como texto (el valor por defecto de Prisma para `String @id @default(uuid())`):** más simple, pero ocupa más y la base no valida el formato. Se empezó así y se cambió a `@db.Uuid` el mismo día con la migración `native_uuid`, que convierte las columnas conservando los datos. Prisma no la genera sola (no hay conversión automática de texto a `uuid`), por eso el SQL está escrito a mano y Prisma comprueba que coincide con el esquema.
- **Restricciones `CHECK` (`priceCents >= 0`, `sizeMl > 0`):** decisión del dueño del proyecto: no se añaden. Prisma no las expresa en el esquema y habría que editar la migración a mano. Sin panel de administración y con la semilla como única fuente de datos, la validación vive en la API (Fase 5b) y en `seed-data.test.ts`, que comprueba que el precio sea un entero ≥ 0 y el tamaño un entero > 0.
- **Quitar `@@index([brandId])`:** es redundante, porque el índice único `(brandId, slug)` ya cubre las búsquedas por `brandId` como prefijo. Se conserva a propósito: cuesta un índice más en un catálogo pequeño, y no compensa añadir otra migración (`DROP INDEX`) solo para quitarlo. Si más adelante molesta, se elimina con una migración nueva.
- **Slug único global:** más simple, pero obliga a inventar sufijos cuando dos marcas comparten nombre de perfume.

## Consecuencias

- Las columnas de tipo arreglo son anulables en PostgreSQL aunque Prisma las trate como listas no nulas; escribir `NULL` con SQL directo es posible y no debe hacerse.
- Filtrar por ocasión es sencillo con arreglos, pero sin vocabulario controlado las variantes de escritura ("oficina", "Oficina") no se unifican.
- Prisma pasa `contains` a `LIKE` sin escapar `%`, `_` ni `\`; el repositorio los escapa para que la búsqueda sea literal (hay pruebas que lo verifican).
- **Orden alfabético:** la base de datos (`postgres:17-alpine`) ordena por bytes: "Zeta" antes que "alfa" y "Édition" al final. El repositorio ordena con `Intl.Collator('es')` y desempata por `slug` (`src/catalog/sorting.ts`). Es suficiente mientras el catálogo sea pequeño; si se pagina, habrá que llevar el orden a la base con una colación explícita.
- **Búsqueda sin tildes (limitación conocida):** `mode: 'insensitive'` ignora mayúsculas pero no tildes, así que "dia" no encuentra "Día Claro". Para un público hispanohablante conviene resolverlo más adelante con la extensión `unaccent` de PostgreSQL (disponible en la imagen), lo que exige una migración y consultas SQL directas porque Prisma no la expresa. Una prueba documenta el comportamiento actual.
- El cliente de Prisma se genera en `apps/api/src/generated/` (ignorado por git) y se regenera con `pnpm install` en un clon nuevo o con `pnpm db:generate`.
- Versión fijada: Prisma 7.10.1. La etiqueta `latest` de `prisma` apunta a una candidata (8.0.0-rc); no se usa.
