import { JSONSchema7Definition } from 'json-schema';
import { ImportCollection, ImportSource, resolveImports } from '../../shared/importSource.js';
import { default as rootLogger } from '../../shared/logger.js';
import schemaToModel from '../../shared/modelGeneration/index.js';
import PathInfo from '../../shared/PathInfo.js';
import template from '../../shared/templater.js';
import writeSourceFile from '../../shared/writeSourceFile.js';
import Parameter from '../openapi/Parameter.js';
import type RequestBody from '../openapi/RequestBody.js';

const logger = rootLogger.child({ context: 'parameter' });

const makeParameterSchema = (parameter: Parameter): [string, JSONSchema7Definition] => {
  const schema = parameter.schema ?? {
    type: 'object',
  };
  if (parameter.description) {
    schema['description'] = parameter.description;
  }
  if (parameter.deprecated) {
    schema['deprecated'] = true;
  }
  if (parameter.example) {
    schema['example'] = parameter.example;
  } else if (parameter.examples) {
    schema['example'] = parameter.examples;
  }
  if (parameter.required) {
    schema['required'] = true;
  }

  return [parameter.name, schema];
};

const MimeTypes = {
  Json: 'application/json',
  Query: 'application/x-www-form-urlencoded',
  FormData: 'multipart/form-data',
  Binary: 'application/octet-stream',
} as const;
const getMimeType = (requestBody?: RequestBody): string | null => {
  // no body
  if (requestBody === undefined || requestBody.content === undefined) {
    return null;
  }

  for (const mime of Object.values(MimeTypes)) {
    if (requestBody.content[mime] !== undefined) {
      return mime;
    }
  }

  const fallbackMime = Object.keys(requestBody.content)[0];
  logger.warn('Unknown request body mime-type', fallbackMime);
  return fallbackMime;
};

type TypeInfo = { typeName: string; code?: string; imports?: ImportCollection };

const buildBodyType = (
  typeName: string,
  contentType: string,
  requestBody?: RequestBody,
): TypeInfo | null => {
  if (requestBody == null) {
    return null;
  }

  if (
    contentType === MimeTypes.Json ||
    contentType === MimeTypes.Query ||
    contentType === MimeTypes.FormData
  ) {
    const schemaModel = schemaToModel(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      requestBody.content[contentType]!.schema!,
      `${typeName}Body`,
    );
    if (schemaModel.type === 'source') {
      return {
        typeName: schemaModel.typeName,
        code: schemaModel.code,
        imports: schemaModel.imports,
      };
    }
    return {
      typeName: schemaModel.typeName,
      imports: new ImportCollection(schemaModel.typeImport, schemaModel.validatorImport),
    };
  } else if (contentType === MimeTypes.Binary) {
    return { typeName: 'Blob' };
  }

  return { typeName: 'unknown' };
};

const buildParameterType = (typeName: string, parameters: Parameter[]): TypeInfo | null => {
  if (parameters.length === 0) {
    return null;
  }

  const schemaModel = schemaToModel(
    {
      type: 'object',
      properties: Object.fromEntries(parameters.map(makeParameterSchema)),
      required: parameters.filter((p) => p.required).map((p) => p.name),
    },
    `${typeName}Params`,
  );

  if (schemaModel.type === 'source') {
    return {
      typeName: schemaModel.typeName,
      imports: schemaModel.imports,
      code: schemaModel.code,
    };
  }

  return {
    typeName: schemaModel.typeName,
    imports: new ImportCollection(schemaModel.typeImport, schemaModel.validatorImport),
  };
};

const generateFunctionParameterType = (
  outFile: PathInfo,
  typeName: string,
  parameters: Parameter[] = [],
  requestBody?: RequestBody,
): {
  contentType: string | null;
  import: ImportSource;
} => {
  const contentType: string | null = getMimeType(requestBody);
  const implementation: string[] = [];
  const imports = new ImportCollection();

  const bodyType = contentType ? buildBodyType(typeName, contentType, requestBody) : null;
  if (bodyType?.imports != null) {
    imports.append(bodyType.imports);
  }
  if (bodyType?.code != null) {
    implementation.push(bodyType.code);
  }

  const parameterType = buildParameterType(typeName, parameters);
  if (parameterType?.imports != null) {
    imports.append(parameterType.imports);
  }
  if (parameterType?.code != null) {
    implementation.push(parameterType.code);
  }

  if (bodyType !== null || parameterType !== null) {
    implementation.push(
      template.lines(
        `type ${typeName} = {`,
        bodyType !== null && `  body: ${bodyType.typeName};`,
        parameterType !== null &&
          `  params${parameters.length > 0 && parameters.some((p) => p.required) ? '' : '?'}: ${parameterType.typeName},`,
        '};',
      ),
    );
  } else {
    implementation.push(`type ${typeName} = unknown;`);
  }

  implementation.push(`export default ${typeName};`);

  writeSourceFile(outFile, template.lines(resolveImports(outFile, imports), '', ...implementation));

  return {
    contentType,
    import: {
      file: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        path: `${outFile.path}/${outFile.filename!.replace('.ts', '.js')}`,
        internal: true,
      },
      entries: [
        {
          item: typeName,
          default: true,
        },
      ],
    },
  };
};

export default generateFunctionParameterType;
