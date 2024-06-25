import type Operation from '../openapi/Operation.js';
import type Parameter from '../openapi/Parameter.js';
import type Reference from '../openapi/Reference.js';
import writeSanitizedFile from '../writeSanitizedFile.js';
import type RequestBody from '../openapi/RequestBody.js';

import constructOperationName from './helpers/constructOperationName.js';
import buildParameterTypes from './buildParameterTypes.js';
import refUnsupported from './helpers/refUnsupported.js';
import needsSanitization from './helpers/needsSanitization.js';
import sanitizeVariableName from './helpers/sanitizeVariableName.js';
import buildUrl from './buildUrl.js';
import destructureParameters from './destructureParameters.js';
import createTypeboxImportStatements from '../schema2typebox/createTypeboxImportStatements.js';
import buildResponseTypes from './buildResponseTypes.js';

export class InvalidParamError extends Error {}

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

  if (parameters.length > 0) {
    for (const param of parameters) {
      refUnsupported(param);
      if (!['path', 'query'].includes(param.in)) {
        console.error(`Unsupported parameter location ${param.in}`);
        //throw new NotImplementedError(`Unsupported parameter location ${param.in}`);
      }
    }
  }
  if (requestBody) {
    refUnsupported(requestBody);
  }

  const parameterTypeName = `${operationName[0].toUpperCase() + operationName.substring(1)}Parameters`;
  const anyParams = requestBody != null || parameters.length > 0;

  if (anyParams) {
    const parameterSection = buildParameterTypes(parameterTypeName, parameters, requestBody);
    lines.push(parameterSection.code);
    lines.push('\n');
    parameterSection.extraImports && imports.push(...parameterSection.extraImports);
  }

  let returnType: string = '';

  if (operation.responses && Object.keys(operation.responses).length > 0) {
    const { responseTypename, ...responseSection } = buildResponseTypes(
      operationName,
      operation.responses,
    );
    lines.push(responseSection.code);
    lines.push('\n');
    responseSection.extraImports && imports.push(...responseSection.extraImports);
    returnType = responseTypename;
  }

  lines.push(
    `const ${operationName} = async (${anyParams ? `parameters: ${parameterTypeName}` : ''})${returnType ? `: Promise<${returnType}>` : ''} => {`,
  );

  lines.push(...destructureParameters(parameters, requestBody));

  lines.push(...buildUrl(route, parameters));

  const queryParams = parameters.filter((param) => param.in === 'query');

  lines.push('const response = await fetch(');
  if (queryParams.length > 0) {
    // webstorm does not like escaped backticks in format strings
    // eslint-disable-next-line no-template-curly-in-string
    lines.push('`' + '${url}?${new URLSearchParams({');
    for (const param of queryParams) {
      if (needsSanitization(param.name)) {
        lines.push(
          `...(${sanitizeVariableName(param.name)} != null && {["${param.name}"]: ${sanitizeVariableName(param.name)}.toString()}),`,
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
    lines.push('body: JSON.stringify(body),');
  }

  // TODO: headers

  lines.push(`
    });
    `);

  // TODO: better error handling
  lines.push('  const json = await response.json();');
  lines.push('  return ({');
  lines.push('    status: response.status,');
  lines.push('    data: json,');
  lines.push(`  } as ${returnType});`);
  lines.push('};');

  lines.push(`export default ${operationName};`);

  await writeSanitizedFile(
    `${outDir}/functions/${operationName}.ts`,
    `${createTypeboxImportStatements()}
    ${imports.join('\n')}
    ${lines.join('\n')}
    `,
  );
};

export default operationToFunction;
