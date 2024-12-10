import appContext from '../../appContext.js';
import { deduplicate } from '../../deduplicate.js';
import GenerationError from '../../GenerationError.js';
import schemaToModel from '../../modelGeneration/schemaToModel.js';
import typeboxImportStatements from '../../modelGeneration/typeboxImportStatements.js';
import type Response from '../../openapi/Response.js';
import type Responses from '../../openapi/Responses.js';
import template from '../../templater.js';
import writeSourceFile from '../../writeSourceFile.js';
import { SUCCESS_CODES } from '../clientLib/HTTPStatusCode.js';

export const buildResponseType = (name: string, response: Response) => {
  const lines = [];
  const imports = [];
  let typeName = null;

  const responseName = `Response${name}`;
  if (!response.content) {
    return null;
  }

  const responseSchema = response.content['application/json'];
  if (responseSchema === undefined) {
    // TODO: different types
    lines.push(`type ${responseName} = unknown;`);
    typeName = responseName;
  } else {
    const schema =
      responseSchema.schema != null
        ? schemaToModel(responseSchema.schema, responseName)
        : undefined;

    if (schema?.code !== undefined) {
      lines.push(schema.code);
      typeName = schema.typeName;
    } else {
      lines.push(`export type ${responseName} = unknown;`);
      typeName = responseName;
    }
    if (schema?.imports) {
      imports.push(...schema.imports);
    }
  }

  return { typeName, code: lines.join('\n'), imports };
};

export type ResponseTypes = { responseCode: string; typename?: string; import?: string }[];

const buildResponseTypes = (
  outFile: string,
  responseTypeName: string,
  errorResponseTypeName: string,
  responses: Responses,
): { types: ResponseTypes } => {
  const lines: string[] = [];
  const imports: string[] = [];
  const types: ResponseTypes = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    if ('$ref' in response) {
      const r = appContext.responses.lookup(response.$ref);
      if (r === undefined) {
        throw new GenerationError(`Unresolved response reference ${response.$ref}`);
      }
      types.push({ responseCode: statusCode, typename: r.typeName, import: r.import });
      imports.push(r.import);
    } else {
      const r = buildResponseType(statusCode === 'default' ? 'Default' : statusCode, response);
      if (r == null) {
        types.push({ responseCode: statusCode });
      } else {
        lines.push(r.code);
        types.push({ responseCode: statusCode, typename: r.typeName });
        if (r.imports) {
          imports.push(...r.imports);
        }
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
            // "default" is a special openapi case that is not a number
            ` status: ${responseCode === 'default' ? "'default'" : responseCode};`,
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
    template.lines(...deduplicate([typeboxImportStatements, ...imports]), '', ...lines),
  );

  return { types };
};

export default buildResponseTypes;
