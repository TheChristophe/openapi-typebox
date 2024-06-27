import type Operation from '../openapi/Operation.js';
import type Parameter from '../openapi/Parameter.js';
import type Reference from '../openapi/Reference.js';
import writeSanitizedFile from '../writeSanitizedFile.js';
import type RequestBody from '../openapi/RequestBody.js';

import routeToOperationName from './helpers/routeToOperationName.js';
import buildParameterTypes from './buildParameterTypes.js';
import refUnsupported from './helpers/refUnsupported.js';
import sanitizeVariableName from './helpers/sanitizeVariableName.js';
import buildUrl from './buildUrl.js';
import destructureParameters from './destructureParameters.js';
import buildResponseTypes from './buildResponseTypes.js';
import typeboxImportStatements from '../schema2typebox/typeboxImportStatements.js';
import { uppercaseFirst } from './helpers/stringManipulation.js';
import template from '../templater.js';
import buildResponseReturn from './buildResponseReturn.js';

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
): Promise<{
  operationName: string;
  hasParams: boolean;
  importPath: string;
}> => {
  const operationName = operation.operationId ?? routeToOperationName(route, method);

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

  lines.push("import type ClientConfig from '../ClientConfig.js';");

  const parameterTypeName = `${uppercaseFirst(operationName)}Parameters`;
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

  const queryParams = parameters.filter((param) => param.in === 'query');

  lines.push(
    template.lines(
      template.concat(
        `const ${operationName} = async (`,
        anyParams && `parameters: ${parameterTypeName},`,
        'config?: ClientConfig)',
        returnType && `: Promise<${returnType}>`,
        ' => {',
      ),

      destructureParameters(parameters, requestBody),

      buildUrl(route, parameters),

      'const localFetch = config?.fetch ?? fetch;',
      'const headers = new Headers(config?.defaultParams?.headers);',
      '',
      'if (config?.auth?.bearer != null) {',
      // eslint-disable-next-line no-template-curly-in-string
      "  headers.set('Authentication', `Bearer ${config.auth.bearer}`);",
      '}',
      '',

      'const response = await localFetch(',

      template.concat(
        // eslint-disable-next-line no-template-curly-in-string
        '`${url}',

        queryParams.length > 0 && [
          '?${new URLSearchParams({',

          queryParams.map(
            (param) =>
              `...(${sanitizeVariableName(param.name)} != null && {["${param.name}"]: ${sanitizeVariableName(param.name)}.toString()}),`,
          ),
          '}).toString()}',
        ],

        '`,',
      ),

      '{',
      '...config?.defaultParams,',
      `method: '${method.toUpperCase()}',`,
      'headers,',

      // TODO: non-json
      // TODO: how to handle multiple different request types?
      requestBody && 'body: JSON.stringify(body),',

      // TODO: headers

      '});',
      '',

      operation.responses == null &&
        template.lines('return ({', 'status: response.status,', `} as ${returnType});`),

      operation.responses != null && buildResponseReturn(operationName, operation.responses),

      '};',
      `export default ${operationName};`,
    ),
  );

  await writeSanitizedFile(
    `${outDir}/functions/${operationName}.ts`,
    `${typeboxImportStatements}
    ${imports.join('\n')}
    ${lines.join('\n')}
    `,
  );

  return {
    operationName,
    hasParams: anyParams,
    importPath: `./functions/${operationName}.js`,
  };
};

export default operationToFunction;
