import context from '../../shared/context.js';
import { deduplicate } from '../../shared/deduplicate.js';
import GenerationError from '../../shared/GenerationError.js';
import schemaToModel from '../../shared/modelGeneration/index.js';
import typeboxImportStatements from '../../shared/modelGeneration/typeboxImportStatements.js';
import template from '../../shared/templater.js';
import writeSourceFile from '../../shared/writeSourceFile.js';
import type Response from '../openapi/Response.js';
import type Responses from '../openapi/Responses.js';
import { SUCCESS_CODES } from '../output/HTTPStatusCode.js';

export const buildResponseType = (name: string, response: Response) => {
  if (!response.content) {
    return null;
  }

  const responseName = `Response${name}`;

  const responseSchema = response.content['application/json'];
  if (responseSchema === undefined || responseSchema.schema == null) {
    return {
      typeName: responseName,
      code: `type ${responseName} = unknown;`,
    };
  }

  const schema = schemaToModel(responseSchema.schema, responseName);

  if (schema.type === 'import') {
    return {
      typeName: schema.typeName,
      imports: template.lines(schema.typeImport, schema.validatorImport),
    };
  }

  return {
    typeName: schema.typeName,
    code: template.lines(
      schema.code,
      '',
      `export const ${schema.typeName} = ${schema.validatorName};`,
    ),
    imports: template.lines(schema.imports),
  };
};

export type ResponseTypes = { responseCode: string; typename?: string; imports?: string }[];

const buildResponseTypes = (
  outFile: string,
  responseTypeName: string,
  responses: Responses,
  parametersT: { typename: string; imports: string } | null,
): { types: ResponseTypes } => {
  const lines: string[] = [];
  const imports: string[] = ["import { type RequestMeta } from '../request.js';"];
  if (parametersT !== null) {
    imports.push(parametersT.imports);
  }
  const types: ResponseTypes = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    if ('$ref' in response) {
      const r = context.responses.lookup(response.$ref);
      if (r === undefined) {
        throw new GenerationError(`Unresolved response reference ${response.$ref}`);
      }
      types.push({ responseCode: statusCode, typename: r.typeName, imports: r.import });
      imports.push(r.import);
    } else {
      const r = buildResponseType(statusCode === 'default' ? 'Default' : statusCode, response);
      if (r == null) {
        types.push({ responseCode: statusCode });
      } else {
        if (r.code != null) {
          lines.push(r.code);
          types.push({ responseCode: statusCode, typename: r.typeName });
        } else {
          types.push({
            responseCode: statusCode,
            typename: r.typeName,
            imports: r.imports,
          });
        }
        if (r.imports) {
          imports.push(r.imports);
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
