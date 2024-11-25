import type Responses from '../../openapi/Responses.js';
import { type CodegenSlice } from '../../schema2typebox/joinBatch.js';
import refUnsupported from './helpers/refUnsupported.js';
import { collect } from '../../schema2typebox/index.js';
import template from '../../templater.js';
import { SUCCESS_CODES } from '../clientLib/HTTPStatusCode.js';

const buildResponseTypes = (
  operationName: string,
  responses: Responses,
): CodegenSlice & { successResponse: string; errorResponse: string } => {
  const lines: string[] = [];
  const extraImports: string[] = [];
  const types: { typename?: string; responseCode: string }[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    refUnsupported(response);

    const responseName = `Response${statusCode}`;
    if (!response.content) {
      //lines.push(`type ${responseName} = unknown;`);
      types.push({ typename: undefined /*responseName*/, responseCode: statusCode });
      continue;
    }

    const responseSchema = response.content['application/json'];
    if (responseSchema === undefined) {
      // TODO: different types
      lines.push(`type ${responseName} = unknown;`);
    } else {
      const schema = responseSchema.schema != null ? collect(responseSchema.schema) : undefined;

      const code = schema?.code !== undefined ? schema.code : 'unknown';
      lines.push(
        template.lines(
          `const ${responseName} = ${code};`,
          `type ${responseName} = Static<typeof ${responseName}>;`,
        ),
      );
      types.push({ typename: responseName, responseCode: statusCode });
      if (schema?.extraImports) {
        extraImports.push(...schema.extraImports);
      }
    }
  }

  const successResponse = 'ResponseOk';
  const errorResponse = 'ResponseBad';

  lines.push(
    template.lines(
      '',
      `type ${successResponse} =`,
      types
        .filter(({ responseCode }) => (SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode, typename }) =>
          template.concat(
            '| {',
            ' response: Response;',
            ` status: ${responseCode};`,
            typename && ` data: ${typename};`,
            ' }',
          ),
        ),
      ';',
      `type ${errorResponse} =`,
      types
        .filter(({ responseCode }) => !(SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode, typename }) =>
          template.concat(
            '| {',
            ' response: Response;',
            ` status: ${responseCode};`,
            typename && ` data: ${typename};`,
            ' }',
          ),
        ),
      ' | { response: Response; status: -1; }',
      ';',

      `type AllResponses = ${successResponse} | ${errorResponse};`,
      '',
    ),
  );

  return {
    code: lines.join('\n'),
    extraImports,
    successResponse,
    errorResponse,
  };
};

export default buildResponseTypes;
