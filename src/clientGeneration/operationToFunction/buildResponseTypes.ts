import type Responses from '../../openapi/Responses.js';
import { collect } from '../../schema2typebox/index.js';
import typeboxImportStatements from '../../schema2typebox/typeboxImportStatements.js';
import template from '../../templater.js';
import writeSourceFile from '../../writeSourceFile.js';
import { SUCCESS_CODES } from '../clientLib/HTTPStatusCode.js';
import refUnsupported from './helpers/refUnsupported.js';

const buildResponseTypes = (
  outFile: string,
  responseTypeName: string,
  errorResponseTypeName: string,
  responses: Responses,
) => {
  const lines: string[] = [];
  const extraImports: string[] = [];
  const types: { typename?: string; responseCode: string }[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    refUnsupported(response);

    const responseName = `Response${statusCode}`;
    if (!response.content) {
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
          `export type ${responseName} = Static<typeof ${responseName}>;`,
          '',
        ),
      );
      types.push({ typename: responseName, responseCode: statusCode });
      if (schema?.extraImports) {
        extraImports.push(...schema.extraImports);
      }
    }
  }

  const successResponse = 'ResponseOk';
  const errorResponse = errorResponseTypeName;

  lines.push(
    template.lines(
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
      '',

      `type ${responseTypeName} = ${successResponse} | ${errorResponse};`,
      '',
      `export default ${responseTypeName};`,
    ),
  );

  writeSourceFile(
    outFile,
    template.lines(typeboxImportStatements(true), ...extraImports, '', ...lines),
  );

  return { types };
};

export default buildResponseTypes;
