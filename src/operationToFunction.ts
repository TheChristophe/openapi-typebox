import type Operation from './openapi/Operation.js';
import type Parameter from './openapi/Parameter.js';
import NotImplementedError from './NotImplementedError.js';
import type Reference from './openapi/Reference.js';
import { collect, createImportStatements } from './schema2typebox/schema-to-typebox.js';
import { type Entry } from './schema2typebox/helperTypes.js';
import writeSanitizedFile from './writeSanitizedFile.js';
import type RequestBody from './openapi/RequestBody.js';

const constructOperationName = (route: string, method: string) => {
  let segments = route
    // split route
    .split('/')
    // filter out empty parts (first and last)
    // filter out {params}
    .filter((segment) => segment.length > 0 && !segment.startsWith('{') && !segment.endsWith('}'));
  segments.push(method);
  // capitalize first letters (CamelCaseOperationName
  segments = segments.map((segment) => segment[0].toUpperCase() + segment.substring(1));
  // lowercase first letter (camelCase)
  segments[0] = segments[0][0].toLowerCase() + segments[0].substring(1);
  return segments.join('');
};

function refUnsupported<T>(thing: Reference | T): asserts thing is T {
  if (typeof thing === 'object' && thing != null && '$ref' in thing) {
    throw new NotImplementedError(
      `Reference to ${thing['$ref']} could not be resolved as references`,
    );
  }
  //return true;
}

const buildParameterTypes = (
  typeName: string,
  parameters?: Parameter[],
  requestBody?: RequestBody,
): Entry => {
  const buffer: string[] = [];
  const extraImports: string[] = [];
  buffer.push(
    `type ${typeName} = Static<typeof ${typeName}>;
const ${typeName} = Type.Object(
{`,
  );
  if (parameters) {
    for (const parameter of parameters) {
      const schema = parameter.schema !== undefined ? collect(parameter.schema) : undefined;

      const required = parameter.required ?? parameter.in === 'path';
      const code =
        schema?.code !== undefined
          ? required
            ? schema.code
            : `Type.Optional(${schema.code})`
          : 'unknown';

      buffer.push(`${parameter.name}: ${code},`);
      schema?.extraImports && extraImports.push(...schema.extraImports);
    }
  }
  if (requestBody) {
    // TODO: other requestbody schemas? multipart form, xml, ?
    const jsonSchema = requestBody.content['application/json']?.schema;

    const schema = jsonSchema != null ? collect(jsonSchema) : undefined;

    const required = requestBody.required ?? false;
    const code =
      schema?.code !== undefined
        ? required
          ? schema.code
          : `Type.Optional(${schema.code})`
        : 'unknown';
    buffer.push(`body: ${code},`);
    schema?.extraImports && extraImports.push(...schema.extraImports);
  }
  buffer.push('});');

  return {
    code: buffer.join('\n'),
    extraImports,
  };
};

const operationToFunction = async (
  route: string,
  method: string,
  operation: Operation,
  outDir: string,
) => {
  const operationName = operation.operationId ?? constructOperationName(route, method);

  const lines: string[] = [];
  const imports: string[] = [];

  if (operation.parameters != null || operation.requestBody != null) {
    if (operation.parameters) {
      for (const param of operation.parameters) {
        refUnsupported(param);

        switch (param.in) {
          case 'path':
          case 'query':
            break;
          case 'header':
          case 'cookie':
          default:
            throw new NotImplementedError(`Unsupported parameter location ${param.in}`);
        }
      }
    }
    if (operation.requestBody) {
      refUnsupported(operation.requestBody);
    }

    const parameters = operation.parameters as Parameter[] | undefined;
    const requestBody = operation.requestBody as RequestBody | undefined;

    const parameterSection = buildParameterTypes(
      `${operationName[0].toUpperCase() + operationName.substring(1)}Parameters`,
      parameters,
      requestBody,
    );
    lines.push(parameterSection.code);
    parameterSection.extraImports && imports.push(...parameterSection.extraImports);
  }

  await writeSanitizedFile(
    `${outDir}/functions/${operationName}.ts`,
    `${createImportStatements()}
    ${imports.join('\n')}
    ${lines.join('\n')}
    `,
  );
};

export default operationToFunction;
