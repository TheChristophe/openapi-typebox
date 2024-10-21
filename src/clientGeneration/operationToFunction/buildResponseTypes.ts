import type Responses from '../../openapi/Responses.js';
import { type CodegenSlice } from '../../schema2typebox/joinBatch.js';
import refUnsupported from './helpers/refUnsupported.js';
import { collect } from '../../schema2typebox/index.js';
import template from '../../templater.js';
import { uppercaseFirst } from './helpers/stringManipulation.js';
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

    const responseName = `${uppercaseFirst(operationName)}${statusCode}`;
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
      schema?.extraImports && extraImports.push(...schema.extraImports);
    }
  }

  const successResponse = `${uppercaseFirst(operationName)}ResponseOk`;
  const errorResponse = `${uppercaseFirst(operationName)}ResponseBad`;

  lines.push(
    '',
    // TODO: make status not -1, but undefined and null break Extract<>
    'type ResponseUnknown = { response: Response; status: -1; };',

    template.lines(
      types.map(({ typename, responseCode }) =>
        template.lines(
          `type Response${responseCode} = {`,
          '  response: Response;',
          `  status: ${responseCode};`,
          typename && `  data: ${typename};`,
          '};',
          ' ',
        ),
      ),

      `type ${successResponse} =`,
      types
        .filter(({ responseCode }) => (SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode }) => `| Response${responseCode}`),
      ';',
      `type ${errorResponse} =`,
      types
        .filter(({ responseCode }) => !(SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode }) => `| Response${responseCode}`),
      ' | ResponseUnknown',
      ';',

      `type AllResponses = ${successResponse} | ${errorResponse} | ResponseUnknown;`,
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
