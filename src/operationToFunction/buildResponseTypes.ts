import type Responses from '../openapi/Responses.js';
import { type CodegenSlice } from '../schema2typebox/joinBatch.js';
import refUnsupported from './helpers/refUnsupported.js';
import { collect } from '../schema2typebox/index.js';
import template from '../templater.js';
import { uppercaseFirst } from './helpers/stringManipulation.js';

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

  const successResponse = `${uppercaseFirst(operationName)}ResponseGood`;
  lines.push(
    '',
    template.lines(
      `type ${successResponse} =`,
      '{ response: Response; } & (',
      types
        .filter(({ responseCode }) => {
          const numeric = +responseCode;
          return !Number.isNaN(numeric) && numeric >= 200 && numeric < 400;
        })
        .map(({ typename, responseCode }) =>
          template.concat(`| { status: ${responseCode};`, typename && `data: ${typename};`, '}'),
        ),
      ');',
    ),
  );
  const errorResponse = `${uppercaseFirst(operationName)}ResponseBad`;
  lines.push(
    '',
    template.lines(
      `type ${errorResponse} =`,
      '{ response: Response; } & (',
      types
        .filter(({ responseCode }) => {
          const numeric = +responseCode;
          return !Number.isNaN(numeric) && numeric >= 400;
        })
        .map(({ typename, responseCode }) =>
          template.concat(
            `| { status: ${responseCode}; response: Response;`,
            typename && `data: ${typename};`,
            '}',
          ),
        ),
      '| { status: undefined; }',
      ');',
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
