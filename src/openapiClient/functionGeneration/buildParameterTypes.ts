import { JSONSchema7Definition } from 'json-schema';
import { deduplicate } from '../../shared/deduplicate.js';
import { default as rootLogger } from '../../shared/logger.js';
import schemaToModel from '../../shared/modelGeneration/index.js';
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
};
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

const buildBodyType = (
  typeName: string,
  contentType: string,
  requestBody?: RequestBody,
): { typeName: string; code?: string } | null => {
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
        code: template.lines(...deduplicate(schemaModel.imports), '', schemaModel.code),
      };
    }
    return {
      typeName: schemaModel.typeName,
      code: template.lines(schemaModel.typeImport, schemaModel.validatorImport),
    };
  } else if (contentType === MimeTypes.Binary) {
    return { typeName: 'Blob' };
  }

  return { typeName: 'unknown' };
};

const buildParameterType = (
  typeName: string,
  parameters: Parameter[],
): { typeName: string; code?: string } | null => {
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
      code: template.lines(...deduplicate(schemaModel.imports), '', schemaModel.code),
    };
  }

  return {
    typeName: schemaModel.typeName,
    code: template.lines(schemaModel.typeImport, schemaModel.validatorImport),
  };
};

const buildParameterTypes = (
  outFile: string,
  typeName: string,
  parameters: Parameter[] = [],
  requestBody?: RequestBody,
) => {
  const contentType: string | null = getMimeType(requestBody);
  const lines: string[] = [];

  const bodyType = contentType ? buildBodyType(typeName, contentType, requestBody) : null;
  if (bodyType?.code != null) {
    lines.push(bodyType.code);
  }

  const parameterType = buildParameterType(typeName, parameters);
  if (parameterType?.code != null) {
    lines.push(parameterType.code);
  }

  if (bodyType !== null || parameterType !== null) {
    lines.push(
      template.lines(
        `type ${typeName} = {`,
        bodyType !== null && `  body: ${bodyType.typeName};`,
        parameterType !== null &&
          `  params${parameters.length > 0 && parameters.some((p) => p.required) ? '' : '?'}: ${parameterType.typeName},`,
        '};',
      ),
    );
  } else {
    lines.push(`type ${typeName} = unknown;`);
  }

  writeSourceFile(
    outFile,
    template.lines(...deduplicate(lines), '', `export default ${typeName};`),
  );

  return {
    contentType,
  };
};

export default buildParameterTypes;
