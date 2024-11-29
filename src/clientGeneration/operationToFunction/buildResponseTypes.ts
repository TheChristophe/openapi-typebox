import { deduplicate } from '../../deduplicate.js';
import schemaToModel from '../../modelGeneration/schemaToModel.js';
import typeboxImportStatements from '../../modelGeneration/typeboxImportStatements.js';
import type Responses from '../../openapi/Responses.js';
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
      const schema =
        responseSchema.schema != null
          ? schemaToModel(responseSchema.schema, responseName)
          : undefined;

      if (schema?.code !== undefined) {
        lines.push(schema.code);
      } else {
        lines.push(`export type ${responseName} = unknown;`);
      }
      if (schema) {
        extraImports.push(...schema.imports);
      }
      types.push({ typename: schema?.typeName ?? responseName, responseCode: statusCode });
      if (schema?.imports) {
        extraImports.push(...schema.imports);
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
    template.lines(...deduplicate([typeboxImportStatements, ...extraImports]), '', ...lines),
  );

  return { types };
};

export default buildResponseTypes;
