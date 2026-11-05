# Glosario del dominio

Términos usados en la spec, el código y los contratos. Un término listado aquí **no implica** por sí solo que exista un campo equivalente en el modelo de datos; el modelo se define en la Fase 5.

| Término                 | Significado                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marca** (`Brand`)     | Casa que fabrica o comercializa perfumes. Agrupa varios perfumes.                                                                                                                         |
| **Perfume** (`Perfume`) | Producto del catálogo. Pertenece a exactamente una marca.                                                                                                                                 |
| **Catálogo**            | Conjunto navegable de marcas y perfumes. En v1 es de solo lectura.                                                                                                                        |
| **Concentración**       | Proporción de esencia del perfume, que determina intensidad y duración. Nombres habituales: _parfum_ (extracto), _eau de parfum_ (EDP), _eau de toilette_ (EDT) y _eau de cologne_ (EDC). |
| **Nota olfativa**       | Componente aromático que se describe en capas: notas de salida, de corazón y de fondo. Forma parte de la propuesta de valor: se mostrará en cada perfume.                                 |
| **Ocasión de uso**      | Situación para la que se recomienda un perfume (por ejemplo, oficina, noche, evento). Parte de la propuesta de valor; la lista de ocasiones está por definir.                             |
| **Perfumería de nicho** | Perfumes de casas independientes o de producción limitada, distintos de la perfumería comercial masiva. Es el foco inicial del catálogo.                                                  |
| **Sol (PEN)**           | Moneda en la que se muestran los precios. Los define el dueño de la tienda.                                                                                                               |
| **Tamaño**              | Volumen del frasco, expresado en mililitros (ml).                                                                                                                                         |
| **Slug**                | Identificador legible para URLs (por ejemplo `casa-aurora`). Se usa para marcas y perfumes.                                                                                               |
| **Seed**                | Datos de demostración cargados en la base de datos para desarrollo.                                                                                                                       |
| **Health check**        | Endpoint `GET /health` con el que la web comprueba que la API está disponible.                                                                                                            |
| **Contrato**            | Descripción de la API en `packages/contracts/openapi.yaml`.                                                                                                                               |
| **ADR**                 | _Architecture Decision Record_: registro corto de una decisión técnica en `docs/decisions/`.                                                                                              |
