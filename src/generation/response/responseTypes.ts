import Response from '../../openapi/Response.js';
import type Responses from '../../openapi/Responses.js';
import schemaToModel from '../model.js';
import typeboxImports from '../model/typeboxImports.js';
import context, { ResponseEntry } from '../utility/context.js';
import { GenerationError } from '../utility/errors.js';
import {
  ImportCollection,
  ImportMetadata,
  ImportSource,
  resolveImports,
  toImportPath,
} from '../utility/importSource.js';
import { FileInfo } from '../utility/PathInfo.js';
import template from '../utility/templater.js';
import writeSourceFile from '../utility/writeSourceFile.js';

type ResponseSource = {
  type: 'source';
  typeName: string;
  validatorName?: string;
  code: string;
  imports?: ImportCollection;
};
type ResponseImport = {
  type: 'import';
  typeName: string;
  validatorName?: string;
  importMeta: ImportMetadata;
};

export const buildResponseType = (
  name: string,
  response: Response,
): ResponseSource | ResponseImport | null => {
  if (!response.content) {
    return null;
  }

  const responseName = `Response${name}`;

  const responseSchema = response.content['application/json'];
  if (responseSchema === undefined || responseSchema.schema == null) {
    return {
      type: 'source',
      typeName: responseName,
      code: `type ${responseName} = unknown;`,
    };
  }

  const schema = schemaToModel(responseSchema.schema, responseName);

  if (schema.type === 'import') {
    return {
      type: 'import',
      typeName: schema.typeName,
      validatorName: schema.validatorName,
      importMeta: schema.importMeta,
    };
  }

  return {
    type: 'source',
    typeName: schema.typeName,
    validatorName: schema.validatorName,
    code: template.lines(
      schema.code,
      '',
      `export const ${schema.typeName} = ${schema.validatorName};`,
    ),
    imports: schema.imports,
  };
};

export type ResponseType = {
  responseCode: string;
  schema?: string;
  responseEntry?: ResponseEntry;
};
export type ResponseTypes = Array<ResponseType>;

const buildResponses = (
  outFile: FileInfo,
  responses: Responses,
): {
  types: ResponseTypes;
  code: string[];
  imports: ImportCollection;
} => {
  const types: ResponseTypes = [];
  const code: string[] = [];
  const imports = new ImportCollection();

  for (const [statusCode, response] of Object.entries(responses)) {
    if (response == null) {
      continue;
    }

    if ('$ref' in response) {
      const r = context.responses.lookup(response.$ref);
      if (r === undefined) {
        throw new GenerationError(`Unresolved response reference ${response.$ref}`);
      }
      types.push({
        responseCode: statusCode,
        responseEntry: r,
      });
      continue;
    }

    const r = buildResponseType(statusCode === 'default' ? 'Default' : statusCode, response);
    if (r == null) {
      types.push({ responseCode: statusCode });
      continue;
    }

    if (r.type === 'source') {
      code.push(r.code);
      types.push({
        responseCode: statusCode,
        responseEntry: {
          typeName: r.typeName,
          validatorName: r.validatorName,
          importMeta: {
            type: {
              file: {
                path: toImportPath(outFile),
                internal: true,
              },
              entries: [{ item: r.typeName, typeOnly: true }],
            },
            ...(r.validatorName != null && {
              validator: {
                file: {
                  path: toImportPath(outFile),
                  internal: true,
                },
                entries: [{ item: r.validatorName }],
              },
            }),
          },
          raw: response,
        },
      });
      if (r.imports) {
        imports.append(r.imports);
      }
    } else {
      types.push({
        responseCode: statusCode,
        responseEntry: {
          ...r,
          raw: response,
        },
      });
      imports.append(r.importMeta.type);
    }
  }
  return { types, code, imports };
};

const buildResponseTypes = (
  outFile: FileInfo,
  responseTypeName: string,
  responsesRaw: Responses,
  parameterType: { typename: string; imports: ImportSource } | null,
): { types: ResponseTypes } => {
  const lines: string[] = [];
  const imports: ImportCollection = new ImportCollection();
  imports.append(typeboxImports);
  imports.push('RequestMeta', 'request.js', true);

  if (parameterType !== null) {
    imports.append(parameterType.imports);
  }
  const responses = buildResponses(outFile, responsesRaw);
  lines.push(...responses.code);
  imports.append(responses.imports);

  if (parameterType) {
    lines.push(`type Request = RequestMeta & { parameters: ${parameterType.typename} };`);
  } else {
    lines.push('type Request = RequestMeta;');
  }

  lines.push(`type ${responseTypeName} =`);

  lines.push(
    template.lines(
      ...responses.types.map(({ responseCode, responseEntry }) =>
        template.concat(
          '| {',
          ' response: Response;',
          ' request: Request;',
          // "default" is a special openapi case that is not a number
          ` status: ${responseCode === 'default' ? "'default'" : responseCode};`,
          responseEntry?.typeName && ` data: ${responseEntry?.typeName};`,
          responseEntry?.validatorName && `validator: typeof ${responseEntry?.validatorName};`,
          ' }',
        ),
      ),
      ' | { response: Response; request: Request; status: -1; };',
      '',
      `export default ${responseTypeName};`,
    ),
  );

  writeSourceFile(outFile, template.lines(resolveImports(outFile, imports), '', ...lines));

  return { types: responses.types };
};

export default buildResponseTypes;
