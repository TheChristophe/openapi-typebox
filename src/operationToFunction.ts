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

export class InvalidParamError extends Error {}

const substituteParams = (route: string, parameters: Parameter[]) => {
  // TODO: this is "overly careful", but it may allow to highlight unspecified parameters ahead of time?
  for (const param of parameters) {
    if (!route.includes(param.name)) {
      throw new InvalidParamError(`Parameter ${param.name} specified but wasn't found in route`);
    }
    route = route.replace(`{${param.name}}`, `\${${param.name}}`);
  }
  return route;
};

const needsSanitization = (varName: string) => {
  switch (varName) {
    // TODO: put the js keywords here
    case 'private':
      return true;

    default:
      return false;
  }
};

const sanitize = (varName: string) => (needsSanitization(varName) ? `${varName}_` : varName);

const destructureParameters = (parameters: Parameter[], requestBody?: RequestBody): string[] => {
  const lines: string[] = [];
  if (parameters.length > 0 || requestBody) {
    lines.push('const {');
    for (const parameter of parameters) {
      if (needsSanitization(parameter.name)) {
        lines.push(`['${parameter.name}']: ${sanitize(parameter.name)},`);
      } else {
        lines.push(`${parameter.name},`);
      }
    }
    if (requestBody) {
      lines.push('body,');
    }
    lines.push('} = parameters;');
  }
  return lines;
};

const buildUrl = (route: string, parameters: Parameter[]) => {
  const lines: string[] = [];
  if (parameters.length > 0) {
    lines.push(
      `const url = \`${substituteParams(
        route,
        parameters.filter((param) => param.in === 'path'),
      )}\`;`,
    );
  } else {
    lines.push(`const url = '${route}';`);
  }
  return lines;
};

function forbidReferencesInParameters(
  parameters: (Parameter | Reference)[],
): asserts parameters is Parameter[] {
  parameters.forEach(refUnsupported);
}
function forbidReferencesInRequestBody(
  requestBody?: RequestBody | Reference,
): asserts requestBody is RequestBody | undefined {
  refUnsupported(requestBody);
}

const operationToFunction = async (
  route: string,
  method: string,
  operation: Operation,
  outDir: string,
) => {
  const operationName = operation.operationId ?? constructOperationName(route, method);

  const lines: string[] = [];
  const imports: string[] = [];

  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody;
  forbidReferencesInParameters(parameters);
  forbidReferencesInRequestBody(requestBody);

  if (operation.parameters) {
    for (const param of operation.parameters) {
      refUnsupported(param);
      if (!['path', 'query'].includes(param.in)) {
        throw new NotImplementedError(`Unsupported parameter location ${param.in}`);
      }
    }
  }
  if (operation.requestBody) {
    refUnsupported(operation.requestBody);
  }

  const parameterTypeName = `${operationName[0].toUpperCase() + operationName.substring(1)}Parameters`;
  const anyParams = requestBody != null || parameters.length > 0;

  if (anyParams) {
    const parameterSection = buildParameterTypes(parameterTypeName, parameters, requestBody);
    lines.push(parameterSection.code);
    parameterSection.extraImports && imports.push(...parameterSection.extraImports);
  }

  lines.push(
    `const ${operationName} = async (${anyParams ? `parameters: ${parameterTypeName}` : ''}) => {`,
  );

  lines.push(...destructureParameters(parameters, requestBody));

  lines.push(...buildUrl(route, parameters));

  const queryParams = parameters.filter((param) => param.in === 'query');

  lines.push('const response = fetch(');
  if (queryParams.length > 0) {
    // webstorm does not like escaped backticks in format strings
    // eslint-disable-next-line no-template-curly-in-string
    lines.push('`' + '${url}?${new URLSearchParams({');
    for (const param of queryParams) {
      if (needsSanitization(param.name)) {
        lines.push(
          `...(${sanitize(param.name)} != null && {["${param.name}"]: ${sanitize(param.name)}.toString()}),`,
        );
      } else {
        lines.push(`...(${param.name} != null && {${param.name}: ${param.name}.toString()}),`);
      }
    }
    lines.push('}).toString()}`,');
  } else {
    lines.push('url,');
  }
  lines.push(`{
      method: '${method.toUpperCase()}',`);

  if (requestBody) {
    // TODO: non-json
    // TODO: how to handle multiple different request types?
    lines.push(`
    body: JSON.stringify(body),
      `);
  }

  // TODO: headers

  lines.push(`
    });
    `);

  lines.push('return (await (await response).json());');

  lines.push('};');

  lines.push(`export default ${operationName};`);

  await writeSanitizedFile(
    `${outDir}/functions/${operationName}.ts`,
    `${createImportStatements()}
    ${imports.join('\n')}
    ${lines.join('\n')}
    `,
  );
};

export default operationToFunction;
