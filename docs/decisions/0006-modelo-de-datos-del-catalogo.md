# 0006. Modelo de datos del catálogo

- **Estado:** Aceptado
- **Fecha:** 2026-11-05

## Contexto

La guía pide modelar explícitamente que cada perfume pertenece a una marca, y mostrar nombre, marca, imagen, descripción, tamaño y precio cuando existan. La spec añade como propuesta de valor las notas olfativas y la ocasión de uso. Los precios los define el dueño de la tienda y la lista de ocasiones no está decidida.

## Decisión

Dos tablas en PostgreSQL, gestionadas con Prisma (`apps/api/prisma/schema.prisma`):

- **`Brand`**: `id` (texto con un UUID generado por Prisma), `slug` único, `name`, `description?` y marcas de tiempo.
- **`Perfume`**: `id` (igual), `slug`, `name`, `description?`, `sizeMl?`, `priceCents?`, `imageUrl?`, `notesTop[]`, `notesHeart[]`, `notesBase[]`, `occasions[]`, `brandId` obligatorio y marcas de tiempo.

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
- **Tipo `uuid` nativo de PostgreSQL (`@db.Uuid`) para los identificadores:** más compacto y valida el formato en la base. Se dejaron como texto, que es el valor por defecto de Prisma para `String @id @default(uuid())`; el catálogo es pequeño y las URLs usan slugs, no ids. Cambiarlo después requiere una migración.
- **Restricciones `CHECK` (`priceCents >= 0`, `sizeMl > 0`):** Prisma no las expresa en el esquema y habría que editar la migración a mano. Sin panel de administración y con la semilla como única fuente de datos, no se añaden por ahora; la validación vive en la API (Fase 5b).
- **Slug único global:** más simple, pero obliga a inventar sufijos cuando dos marcas comparten nombre de perfume.

## Consecuencias

- Las columnas de tipo arreglo son anulables en PostgreSQL aunque Prisma las trate como listas no nulas; escribir `NULL` con SQL directo es posible y no debe hacerse.
- Filtrar por ocasión es sencillo con arreglos, pero sin vocabulario controlado las variantes de escritura ("oficina", "Oficina") no se unifican.
- Prisma pasa `contains` a `LIKE` sin escapar `%`, `_` ni `\`; el repositorio los escapa para que la búsqueda sea literal (hay pruebas que lo verifican).
- El cliente de Prisma se genera en `apps/api/src/generated/` (ignorado por git) y se regenera con `pnpm install` en un clon nuevo o con `pnpm db:generate`.
- Versión fijada: Prisma 7.10.1. La etiqueta `latest` de `prisma` apunta a una candidata (8.0.0-rc); no se usa.
