import context from '../../shared/context.js';
import GenerationError from '../../shared/GenerationError.js';
import { ImportCollection, ImportSource, resolveImports } from '../../shared/importSource.js';
import schemaToModel from '../../shared/modelGeneration/index.js';
import typeboxImportStatements from '../../shared/modelGeneration/typeboxImportStatements.js';
import PathInfo from '../../shared/PathInfo.js';
import template from '../../shared/templater.js';
import writeSourceFile from '../../shared/writeSourceFile.js';
import Response from '../openapi/Response.js';
import type Responses from '../openapi/Responses.js';

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
      validatorName: schema.validatorName,
      imports: new ImportCollection(schema.typeImport, schema.validatorImport),
    };
  }

  return {
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
  typeName?: string;
  validatorName?: string;
  schema?: string;
  imports?: ImportCollection;
};
export type ResponseTypes = Array<ResponseType>;

const buildResponses = (
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
    if ('$ref' in response) {
      const r = context.responses.lookup(response.$ref);
      if (r === undefined) {
        throw new GenerationError(`Unresolved response reference ${response.$ref}`);
      }
      types.push({
        responseCode: statusCode,
        typeName: r.typeName,
        validatorName: r.validatorName,
        imports: new ImportCollection(r.import),
      });
      imports.append(r.import);
      continue;
    }

    const r = buildResponseType(statusCode === 'default' ? 'Default' : statusCode, response);
    if (r == null) {
      types.push({ responseCode: statusCode });
      continue;
    }

    if (r.code != null) {
      code.push(r.code);
      types.push({
        responseCode: statusCode,
        typeName: r.typeName,
        validatorName: r.validatorName,
      });
    } else {
      types.push({
        responseCode: statusCode,
        typeName: r.typeName,
        validatorName: r.validatorName,
        imports: r.imports,
      });
    }
    if (r.imports) {
      imports.append(r.imports);
    }
  }
  return { types, code, imports };
};

const buildResponseTypes = (
  outFile: PathInfo,
  responseTypeName: string,
  responsesRaw: Responses,
  parameterType: { typename: string; imports: ImportSource } | null,
): { types: ResponseTypes } => {
  const lines: string[] = [];
  const imports: ImportCollection = new ImportCollection();
  imports.append(typeboxImportStatements);
  imports.push('RequestMeta', 'request.js', true);

  if (parameterType !== null) {
    imports.append(parameterType.imports);
  }
  const responses = buildResponses(responsesRaw);
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
      ...responses.types.map(({ responseCode, typeName, validatorName }) =>
        template.concat(
          '| {',
          ' response: Response;',
          ' request: Request;',
          // "default" is a special openapi case that is not a number
          ` status: ${responseCode === 'default' ? "'default'" : responseCode};`,
          typeName && ` data: ${typeName};`,
          validatorName && `validator: typeof ${validatorName};`,
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
