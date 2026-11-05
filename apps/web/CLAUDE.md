# CLAUDE.md — apps/web

Guía para trabajar en la web (`@tienda/web`). Las reglas transversales (flujo de trabajo, contrato primero, datos del dominio) están en el [`CLAUDE.md` raíz](../../CLAUDE.md).

## Qué es

Aplicación React 19 + Vite 8 + TypeScript. **Hoy solo muestra el estado de la API** (`GET /health`): cargando, conectado o error. La landing, el catálogo de marcas y la página de cada marca y perfume son la Fase 6 y aún no existen. Alcance y criterios de aceptación: `docs/spec.md`.

## Estructura

```text
index.html                         Documento base (lang="es")
src/main.tsx                       Monta <App /> en #root
src/App.tsx                        Cabecera y <main> con el estado de la API
src/features/health/               Una carpeta por funcionalidad
  healthApi.ts                     fetchHealth, resolveApiUrl y HealthError
  useHealth.ts                     Estado (loading/connected/error), tiempo límite y reintento
  HealthStatus.tsx                 Componente accesible
  *.test.ts(x)                     Pruebas junto al código
src/styles.css                     Estilos
src/test/setup.ts                  Limpieza del DOM entre pruebas
vite.config.ts                     Vite y Vitest (jsdom)
```

## Cómo se ejecuta

- `pnpm --filter @tienda/web dev` (o `pnpm dev` en la raíz). El puerto **5173 es fijo** (`strictPort`): la API solo acepta CORS desde `WEB_ORIGIN`, así que si el puerto cambiara en silencio, fallaría.
- La web lee el `.env` **raíz** (`envDir: '../..'`). Vite solo expone al navegador lo que empieza por `VITE_`: **todo `VITE_*` es público, no pongas secretos ahí.** La única es `VITE_API_URL` (por defecto `http://localhost:3000`); un valor vacío cuenta como no definido y la barra final se ignora (`resolveApiUrl`).
- `pnpm build` ejecuta `tsc --noEmit` y después `vite build`.

## Contrato y tipos

- Los tipos de la API **no se escriben a mano**: se importan de `@tienda/contracts` con `import type { components } from '@tienda/contracts'` (solo tipos; no entra en el build). Si falta un campo, se añade al contrato y se ejecuta `pnpm contracts:generate`.
- La web **no valida** las respuestas con el esquema completo: `fetchHealth` comprueba lo mínimo (`status === 'ok'`). Un cuerpo inesperado es `HealthError` de tipo `bad-response`; un fallo de red, `network`.

## Cómo consumir la API (patrón actual)

- Una función por llamada en `*Api.ts`, que lanza `HealthError` con un `kind` que distingue "sin conexión" de "la API respondió mal".
- Un hook con el estado, el tiempo límite (5 s, con `AbortController`) y el reintento; un componente que solo presenta.
- Cada vista tiene estados **de carga, vacío y error**, con texto claro y un reintento cuando tenga sentido. Un dato ausente o un error no debe romper la navegación.

## Interfaz y accesibilidad (reglas del proyecto)

- HTML semántico, controles utilizables con teclado y etiquetas accesibles; texto alternativo útil en las imágenes.
- **No comuniques un estado solo con color:** `HealthStatus` usa icono, texto y estilo de borde.
- Respeta `prefers-reduced-motion`: las animaciones van dentro de `@media (prefers-reduced-motion: no-preference)`.
- Zona con `role="status"` para los cambios de estado. Al reintentar, **el foco pasa al estado antes de que el botón desaparezca** (si no, se pierde la posición de quien navega con teclado o lector de pantalla).
- Diseño adaptable a móvil y escritorio.

## Pruebas

| Comando                                        | Qué hace                                                    |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `pnpm --filter @tienda/web test`               | Vitest con jsdom y Testing Library                          |
| `pnpm --filter @tienda/web test -t "<nombre>"` | Una prueba por nombre. **Sin `--`**: con `--` ejecuta todas |

- Dependencias de prueba aprobadas: `jsdom`, `@testing-library/react` y su peer `@testing-library/dom`. **No hay `jest-dom` ni `user-event`**: se usan aserciones simples y `fireEvent`.
- Sin los "globals" de Vitest, Testing Library no limpia el DOM sola: lo hace `src/test/setup.ts`.
- `fetch` se sustituye con `vi.stubGlobal` y `vi.fn<typeof fetch>()`. Para el tiempo límite se usan temporizadores falsos dentro de `act`.

## Para la Fase 6 (todavía no hecho)

- **`react-router` no está instalado.** La guía no lo lista: consulta antes de añadirlo. La búsqueda y los filtros deberían conservarse en la URL (parámetros de consulta).
- Los precios llegan como `{ amountCents, currency: "PEN" }` o `null`: nunca muestres `0` ni inventes un precio; si es `null`, indica que está por definir.
- Las imágenes son placeholders por ahora (`imageUrl` es `null`); el diseño debe permitir sustituirlas por fotos propias.
- Las notas llegan por capas (`top`, `heart`, `base`) y las ocasiones como texto libre; una lista vacía significa "sin dato".
- Los datos del catálogo actual son de ejemplo (`[EJEMPLO]`): no los muestres como reales.

## No hagas esto

- No añadas dependencias sin consultarlas (la guía pide revisar antes si lo resuelve lo ya instalado).
- No escribas a mano los tipos de la API ni pongas secretos en `VITE_*`.
- No cambies el puerto 5173 sin cambiar también `WEB_ORIGIN`.
