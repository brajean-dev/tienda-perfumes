# Guía del proyecto (documento inicial)

> **Qué es este documento.** Es la guía con la que el dueño del proyecto lo planteó al empezar, **conservada tal cual** (desde la línea "# Guía del proyecto" de abajo). Los ADR de `docs/decisions/` la citan como "la guía".
>
> **Qué NO es.** No es la descripción del estado actual: el proyecto ha avanzado por fases y algunas decisiones se concretaron después (por ejemplo, el modelo de datos, las convenciones HTTP o el uso de `pnpm env:init`). Para lo vigente, ver [`docs/spec.md`](spec.md), [`docs/decisions/`](decisions/) y los `CLAUDE.md`. Si algo de aquí contradice a esos documentos, mandan ellos.
>
> **Dónde está recogido lo que exige.** Sus reglas de arquitectura, estructura y verificación están en el [`CLAUDE.md`](../CLAUDE.md) raíz y en los de cada app; su alcance de producto, en [`docs/spec.md`](spec.md).

---

# Guía del proyecto

## Producto

Tienda web de perfumes con una landing page y un catálogo navegable. El usuario puede explorar las marcas disponibles y, dentro de cada marca, ver los perfumes que le pertenecen. La experiencia debe ayudar a descubrir productos y facilitar la compra a medida que se incorporen las funciones comerciales.

## Arquitectura y tecnologías obligatorias

Organiza el proyecto como un monorepo administrado con **pnpm workspaces**, con esta estructura base:

```text
apps/
  web/                # React + Vite + TypeScript
  api/                # Fastify + TypeScript + Zod + Prisma
packages/
  contracts/          # Contratos compartidos; fuente OpenAPI en openapi.yaml
docker-compose.yml    # PostgreSQL para desarrollo local
```

- **Gestor de paquetes y workspaces:** pnpm. Declara los paquetes en `pnpm-workspace.yaml` y usa scripts raíz para las tareas comunes cuando sea apropiado.
- **Frontend (`apps/web`):** React, Vite y TypeScript.
- **Backend (`apps/api`):** Fastify, TypeScript, Zod para validar entradas y Prisma como ORM.
- **Base de datos:** PostgreSQL. Configura un servicio local en `docker-compose.yml` y la conexión mediante variables de entorno.
- **Contratos (`packages/contracts`):** mantiene `openapi.yaml` como contrato de la API y actualízalo junto con los endpoints. Evita divergencias entre contrato y comportamiento.
- **Pruebas:** Vitest en ambas aplicaciones (`apps/web` y `apps/api`).

No sustituyas estas tecnologías ni cambies la estructura del monorepo sin una instrucción explícita. Antes de agregar dependencias, revisa si la funcionalidad puede resolverse con las herramientas ya instaladas.

## Experiencia principal

- La landing page presenta la propuesta de la tienda y ofrece una entrada clara al catálogo.
- El catálogo permite explorar y seleccionar marcas.
- Cada marca muestra sus perfumes asociados.
- Las tarjetas y páginas de producto deben presentar, cuando esos datos existan, nombre, marca, imagen, descripción, tamaño y precio.
- Facilita volver de una marca a la lista general y conserva filtros o búsquedas cuando sea razonable.
- Diseña primero la navegación y la presentación del catálogo; no inventes integraciones de pago, inventario o cuentas que aún no hayan sido definidas.

## Health check

- Implementa `GET /health` en `apps/api` para indicar que la API está disponible.
- Documenta la ruta y su respuesta en `packages/contracts/openapi.yaml`.
- La web debe consumir este endpoint y presentar el estado de conexión de forma clara, incluyendo estados de carga y error.
- Añade pruebas Vitest para el endpoint y para el consumo/estado mostrado en la web.

## Organización y cambios

- Inspecciona la estructura del repositorio y sigue sus convenciones antes de editar.
- Mantén frontend y backend claramente organizados; sigue la estructura existente (monorepo o proyectos separados) en vez de reorganizarla sin necesidad.
- Mantén límites claros entre presentación, lógica de interfaz, controladores, servicios y acceso a datos.
- Usa tipos compartidos solo si la estructura del proyecto ofrece una forma clara de mantenerlos sincronizados entre cliente y servidor.
- Reutiliza componentes y servicios; evita duplicar lógica o crear abstracciones prematuras.
- Mantén los cambios acotados a la solicitud.

## Interfaz y accesibilidad

- Crea una experiencia visual cuidada para perfumería, con imágenes de producto nítidas, jerarquía tipográfica clara y navegación sencilla.
- La interfaz debe adaptarse a móvil y escritorio.
- Usa HTML semántico, controles utilizables con teclado, etiquetas accesibles y texto alternativo útil para imágenes.
- No comuniques estados únicamente mediante color y respeta la preferencia de movimiento reducido.
- Incluye estados de carga, vacío y error en catálogo y vistas de marca.

## Datos y API

- Modela explícitamente la relación entre marcas y perfumes: cada perfume pertenece a una marca.
- Mantén contratos y validación coherentes entre los DTO del backend y el consumo del frontend.
- Valida entradas en el backend; la validación del cliente solo mejora la experiencia y no la sustituye.
- Maneja respuestas fallidas y datos ausentes sin romper la navegación.
- No expongas credenciales ni secretos en el código del cliente. Usa variables de entorno y documenta las necesarias en `.env.example` sin valores secretos.

## Comandos

Usa pnpm para instalar dependencias y ejecutar scripts del monorepo. Define scripts claros para desarrollo, pruebas y compilación en la raíz y/o en cada aplicación, y mantenlos alineados con los `package.json` reales. Docker Compose debe permitir iniciar PostgreSQL para desarrollo local.

## Verificación y entrega

- Ejecuta las pruebas Vitest pertinentes y las comprobaciones configuradas para las áreas modificadas.
- Si una comprobación no está disponible o no se ejecutó, indícalo con claridad.
- Al terminar, resume los cambios y las comprobaciones realizadas.
- No afirmes que una comprobación pasó si no la ejecutaste.
