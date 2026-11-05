// Lee packages/contracts/openapi.yaml y valida respuestas contra sus esquemas. Lo usan las pruebas
// que impiden que el contrato y la API se separen (ADR 0003).
//
// Convención que este ayudante exige al contrato: el esquema de cada respuesta es una referencia a
// `#/components/schemas/...`. Así se compila con Ajv sin perder el contexto de las demás referencias.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const CONTRACT_PATH = fileURLToPath(
  new URL('../../../../packages/contracts/openapi.yaml', import.meta.url),
);
const HTTP_METHODS = ['get', 'put', 'post', 'patch', 'delete'] as const;
// Campos de un path item que no son operaciones.
const PATH_ITEM_FIELDS = new Set(['parameters', 'summary', 'description', 'servers', '$ref']);

type JsonObject = Record<string, unknown>;

export type Operation = {
  operationId: string;
  method: string;
  /** Ruta en el yaml: /brands/{brandSlug} */
  path: string;
  /** Ruta en Fastify: /brands/:brandSlug */
  fastifyPath: string;
  /** Códigos de estado documentados: "200", "404"... */
  statuses: string[];
};

export type OpenApiDocument = {
  paths: Record<string, Record<string, JsonObject>>;
  components: {
    schemas: Record<string, JsonObject>;
    parameters: Record<string, JsonObject>;
    responses: Record<string, JsonObject>;
  };
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolvePointer(document: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) throw new Error(`Solo se admiten referencias internas (${ref})`);
  return ref
    .slice(2)
    .split('/')
    .reduce<unknown>((node, key) => (isObject(node) ? node[key] : undefined), document);
}

export function loadContract() {
  const document = parse(readFileSync(CONTRACT_PATH, 'utf8')) as OpenApiDocument;

  const operations: Operation[] = [];
  for (const [path, pathItem] of Object.entries(document.paths)) {
    // Si el yaml usa un método que este ayudante no conoce (HEAD, OPTIONS, TRACE...), se falla en
    // lugar de ignorarlo en silencio: una operación sin comprobar sería una brecha en las pruebas.
    for (const key of Object.keys(pathItem)) {
      if (!(HTTP_METHODS as readonly string[]).includes(key) && !PATH_ITEM_FIELDS.has(key)) {
        throw new Error(
          `El contrato usa "${key}" en ${path}, que el ayudante de pruebas no sabe comprobar`,
        );
      }
    }
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      operations.push({
        operationId: String(operation.operationId),
        method: method.toUpperCase(),
        path,
        fastifyPath: path.replace(/\{(\w+)\}/g, ':$1'),
        statuses: Object.keys(operation.responses as JsonObject),
      });
    }
  }

  // Strict a propósito: una errata en un esquema (palabra clave desconocida) debe fallar, no ignorarse.
  // `components` se declara como palabra clave solo para poder apuntar a #/components/schemas/....
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addKeyword('components');
  ajv.addSchema({ $id: 'contract', components: document.components });

  const validators = new Map<string, ValidateFunction>();

  function schemaRefFor(operationId: string, status: string): string {
    const operation = operations.find((candidate) => candidate.operationId === operationId);
    if (!operation) throw new Error(`El contrato no define la operación "${operationId}"`);

    const operationObject = document.paths[operation.path]?.[operation.method.toLowerCase()];
    let response = (operationObject?.responses as JsonObject | undefined)?.[status];
    if (isObject(response) && typeof response.$ref === 'string') {
      response = resolvePointer(document, response.$ref);
    }
    if (!isObject(response)) {
      throw new Error(`El contrato no documenta la respuesta ${status} de "${operationId}"`);
    }

    const content = response.content as JsonObject | undefined;
    const schema = (content?.['application/json'] as JsonObject | undefined)?.schema;
    if (!isObject(schema) || typeof schema.$ref !== 'string') {
      throw new Error(
        `La respuesta ${status} de "${operationId}" debe tener un esquema $ref a components/schemas`,
      );
    }
    return schema.$ref.replace(/^#/, 'contract#');
  }

  return {
    document,
    operations,

    /** Parámetros documentados de una operación (resueltos si son referencias). */
    parametersOf(operationId: string): Array<{ name: string; in: string; required: boolean }> {
      const operation = operations.find((candidate) => candidate.operationId === operationId);
      if (!operation) throw new Error(`El contrato no define la operación "${operationId}"`);

      const operationObject = document.paths[operation.path]?.[operation.method.toLowerCase()];
      const declared = (operationObject?.parameters as JsonObject[] | undefined) ?? [];
      return declared.map((parameter) => {
        const resolved =
          typeof parameter.$ref === 'string' ? resolvePointer(document, parameter.$ref) : parameter;
        if (!isObject(resolved)) throw new Error(`Parámetro no resoluble en "${operationId}"`);
        return {
          name: String(resolved.name),
          in: String(resolved.in),
          required: resolved.required === true,
        };
      });
    },

    /**
     * Compila TODOS los esquemas de components.schemas, no solo los alcanzables desde una respuesta.
     * Con `strict`, un esquema mal escrito (palabra clave desconocida, patrón inválido) lanza un
     * error. Devuelve los nombres compilados.
     */
    compileAllSchemas(): string[] {
      const names = Object.keys(document.components.schemas);
      for (const name of names) {
        ajv.compile({ $ref: `contract#/components/schemas/${name}` });
      }
      return names;
    },

    /** Valida un cuerpo de respuesta contra el esquema que el contrato documenta para ese estado. */
    validateResponse(operationId: string, status: number | string, body: unknown) {
      const ref = schemaRefFor(operationId, String(status));
      let validate = validators.get(ref);
      if (!validate) {
        validate = ajv.compile({ $ref: ref });
        validators.set(ref, validate);
      }
      const ok = validate(body) as boolean;
      return { ok, errors: ok ? '' : ajv.errorsText(validate.errors, { dataVar: 'cuerpo' }) };
    },
  };
}
