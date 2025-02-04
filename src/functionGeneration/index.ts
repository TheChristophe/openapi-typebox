import type Operation from '../openapi/Operation.js';
import type Parameter from '../openapi/Parameter.js';
import type Reference from '../openapi/Reference.js';
import type RequestBody from '../openapi/RequestBody.js';
import writeSourceFile from '../writeSourceFile.js';

import { deduplicate } from '../deduplicate.js';
import GenerationError from '../GenerationError.js';
import typeboxImportStatements from '../modelGeneration/typeboxImportStatements.js';
import { sanitizeVariableName, uppercaseFirst } from '../sanitization.js';
import template from '../templater.js';
import buildParameterTypes from './buildParameterTypes.js';
import buildResponseReturn from './buildResponseReturn.js';
import buildResponseTypes, { ResponseTypes } from './buildResponseTypes.js';
import buildUrl from './buildUrl.js';
import destructureParameters from './destructureParameters.js';
import commentSanitize from './helpers/commentSanitize.js';
import refUnsupported from './helpers/refUnsupported.js';
import routeToOperationName from './helpers/routeToOperationName.js';

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

const buildJsDoc = (operation: Operation) =>
  template.lines(
    '/**',
    operation.summary != null &&
      operation.summary.length > 0 &&
      template.lines(` * ${operation.summary}`, ' * '),
    operation.description != null &&
      operation.description.length > 0 &&
      template.lines(commentSanitize(operation.description, { firstLine: true }), ' * '),
    operation.externalDocs != null &&
      template.lines(
        ` * [${operation.externalDocs.description ?? 'External docs'}](${operation.externalDocs.url})`,
        ' * ',
      ),
    ' * autogenerated',
    ' * ',
    operation.deprecated != null && ' * @deprecated',
    ' * @async',
    ' **/',
  );

export type FunctionMetadata = {
  operationName: string;
  hasParams: boolean;
  importPath: string;
  systemPath: string;
};
/**
 * Generate a function from an openapi operation
 * @param route api route
 * @param method api method
 * @param operation openapi operation metadata
 * @param outDir target file
 *
 * @throws GenerationError if the operation contains illegal specification
 */
const operationToFunction = (
  route: string,
  method: string,
  operation: Operation,
  outDir: string,
): FunctionMetadata => {
  const operationName = operation.operationId ?? routeToOperationName(route, method);

  const lines: string[] = [];
  const imports: string[] = [];

  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody;
  // TODO
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

    const m = method.toUpperCase();
    if (m === 'GET' || m === 'HEAD') {
      throw new GenerationError(
        `${method} ${route}: GET and HEAD requests may not have request bodies`,
      );
    }
  }

  lines.push(
    template.lines(
      "import { type ConfigOverrides } from '../clientConfig.js';",
      //"import { type ResponseBrand } from '../typeBranding.js';",
      "import { type ApiFunction } from '../apiFunction.js';",
      "import { HTTPInformational, HTTPSuccess, HTTPRedirection, HTTPClientError, HTTPServerError } from '../HTTPStatusCode.js';",
      '',
    ),
  );

  const parameterTypeName = `${uppercaseFirst(operationName)}Params`;
  const takesParameters = requestBody != null || parameters.length > 0;
  const requiredParameters = requestBody != null || parameters.some((param) => param.required);
  let parameterTypeImport = null;

  let bodyContentType: string | null = null;
  if (takesParameters) {
    const { contentType } = buildParameterTypes(
      `${outDir}/functions/${operationName}.parameters.ts`,
      parameterTypeName,
      parameters,
      requestBody,
    );
    bodyContentType = contentType;
    parameterTypeImport = {
      typename: parameterTypeName,
      import: `import type ${parameterTypeName} from './${operationName}.parameters.js';`,
    };
    lines.push(parameterTypeImport.import, '');
  }

  const responseTypeName = `${uppercaseFirst(operationName)}Response`;
  let responseTypes: ResponseTypes | null = null;
  if (operation.responses && Object.keys(operation.responses).length > 0) {
    const { types } = buildResponseTypes(
      `${outDir}/functions/${operationName}.responses.ts`,
      responseTypeName,
      operation.responses,
      parameterTypeImport,
    );
    responseTypes = types;
    lines.push(
      `import type ${responseTypeName} from './${operationName}.responses.js';`,
      `import { ${types.flatMap(({ import: import_, typename }) => (typename && import_ === undefined ? `type ${typename}` : [])).join(', ')} } from './${operationName}.responses.js';`,
      ...types.flatMap(({ import: import_ }) => import_ ?? []),
      '',
    );
  }

  const queryParams = parameters.filter((param) => param.in === 'query');

  lines.push(
    template.lines(
      buildJsDoc(operation),
      template.concat(
        `const ${operationName}: ApiFunction<`,
        takesParameters ? parameterTypeName : 'undefined',
        requiredParameters
          ? `, ${responseTypeName}> = async (parameters) => {`
          : `, ${responseTypeName}> = async (parameters = {}) => {`,
      ),

      template.lines(
        destructureParameters(parameters, requestBody),

        buildUrl(route, parameters),

        'const localFetch = config?.fetch ?? fetch;',
        'const headers = new Headers(config?.defaultParams?.headers);',
        '',
        'if (config?.auth?.bearer != null) {',
        // eslint-disable-next-line no-template-curly-in-string
        "  headers.set('authorization', `Bearer ${config.auth.bearer}`);",
        '}',

        (bodyContentType === 'application/json' ||
          bodyContentType === 'application/x-www-form-urlencoded' ||
          bodyContentType === 'multipart/form-data' ||
          bodyContentType === 'application/octet-stream') &&
          `headers.set("Content-Type", "${bodyContentType}");`,
        '',

        bodyContentType === 'multipart/form-data' &&
          template.lines(
            'const multipart = new FormData();',
            'for (const [key, value] of Object.entries(parameters.body) {',
            '  body.append(key, value);',
            '}',
          ),

        '',
        `const method = '${method.toUpperCase()}';`,
        'const requestMeta = {',
        '  url,',
        '  method,',
        operation.operationId != null && `  operationId: '${operation.operationId}',`,
        (requestBody != null || parameters.length > 0) && '  parameters,',
        '};',
        '',

        'const response = await localFetch(',

        template.concat(
          // eslint-disable-next-line no-template-curly-in-string
          queryParams.length > 0 ? '`${url}' : 'url',

          queryParams.length > 0 && [
            '?${new URLSearchParams({',

            queryParams.map(
              (param) =>
                `...(${sanitizeVariableName(param.name)} != null && {["${param.name}"]: ${sanitizeVariableName(param.name)}.toString()}),`,
            ),
            '}).toString()}',
          ],

          queryParams.length > 0 && '`',
          ',',
        ),

        '{',
        '...config?.defaultParams,',
        'method,',
        'headers,',

        bodyContentType === 'application/json' && 'body: JSON.stringify(body),',
        bodyContentType === 'application/x-www-form-urlencoded' &&
          'body: new URLSearchParams(body).toString(),',
        bodyContentType === 'multipart/form-data' && 'body: multipart,',
        bodyContentType === 'application/octet-stream' && 'body: body,',

        // TODO: headers

        '});',
        '',

        operation.responses == null &&
          template.lines(
            'return ({',
            'status: response.status,',
            'request: requestMeta,',
            `} as ${responseTypeName});`,
          ),

        operation.responses != null &&
          buildResponseReturn(operationName, operation.responses, responseTypes),
      ),
      '};',
      ' ',
      `export default ${operationName};`,
    ),
  );

  writeSourceFile(
    `${outDir}/functions/${operationName}.ts`,
    template.lines(typeboxImportStatements, '', ...deduplicate(imports), '', ...lines),
  );

  return {
    operationName,
    hasParams: takesParameters,
    importPath: `./functions/${operationName}.js`,
    systemPath: `${outDir}/functions/${operationName}.ts`,
  };
};

export default operationToFunction;
