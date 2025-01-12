import appContext from '../appContext.js';
import { SUCCESS_CODES } from '../clientLib/HTTPStatusCode.js';
import { deduplicate } from '../deduplicate.js';
import GenerationError from '../GenerationError.js';
import schemaToModel from '../modelGeneration/index.js';
import typeboxImportStatements from '../modelGeneration/typeboxImportStatements.js';
import type Response from '../openapi/Response.js';
import type Responses from '../openapi/Responses.js';
import template from '../templater.js';
import writeSourceFile from '../writeSourceFile.js';

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
      lines.push(schema.code, '');
      typeName = schema.typeName;
    } else {
      lines.push(`export type ${responseName} = unknown;`, '');
      typeName = responseName;
    }
    if (schema) {
      imports.push(...schema.imports);
    }
  }

  return { typeName, code: lines.join('\n'), imports };
};

export type ResponseTypes = { responseCode: string; typename?: string; import?: string }[];

const buildResponseTypes = (
  outFile: string,
  responseTypeName: string,
  responses: Responses,
  parametersT: { typename: string; import: string } | null,
): { types: ResponseTypes } => {
  const lines: string[] = [];
  const imports: string[] = ["import { type RequestMeta } from '../request.js';"];
  if (parametersT !== null) {
    imports.push(parametersT.import);
  }
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

  if (parametersT) {
    lines.push(`type Request = RequestMeta & { parameters: ${parametersT.typename} };`);
  } else {
    lines.push('type Request = RequestMeta;');
  }

  lines.push(`type ${responseTypeName} =`);

  lines.push(
    template.lines(
      types
        .filter(({ responseCode }) => (SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode, typename }) =>
          template.concat(
            '| {',
            ' response: Response;',
            ' request: Request;',
            ` status: ${responseCode};`,
            typename && ` data: ${typename};`,
            ' }',
          ),
        ),
      types
        .filter(({ responseCode }) => !(SUCCESS_CODES as number[]).includes(+responseCode))
        .map(({ responseCode, typename }) =>
          template.concat(
            '| {',
            ' response: Response;',
            ' request: Request;',
            // "default" is a special openapi case that is not a number
            ` status: ${responseCode === 'default' ? "'default'" : responseCode};`,
            typename && ` data: ${typename};`,
            ' }',
          ),
        ),
      ' | { response: Response; request: Request; status: -1; }',
      ';',
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
