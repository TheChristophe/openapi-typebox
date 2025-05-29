import { JSONSchema7Definition } from 'json-schema';
import { deduplicate } from '../../shared/deduplicate.js';
import schemaToModel from '../../shared/modelGeneration/index.js';
import template from '../../shared/templater.js';
import writeSourceFile from '../../shared/writeSourceFile.js';
import type Parameter from '../openapi/Parameter.js';
import type RequestBody from '../openapi/RequestBody.js';

const parameterSchema = (parameter: Parameter): [string, JSONSchema7Definition] => {
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

const buildParameterTypes = (
  outFile: string,
  typeName: string,
  parameters: Parameter[] = [],
  requestBody?: RequestBody,
) => {
  let contentType: string | null;
  // no body
  if (requestBody === undefined || requestBody.content === undefined) {
    contentType = null;
  }
  // json
  else if (requestBody?.content['application/json'] !== undefined) {
    contentType = 'application/json';
  }
  // url encoded
  else if (requestBody?.content['application/x-www-form-urlencoded'] !== undefined) {
    contentType = 'application/x-www-form-urlencoded';
  }
  // form data
  else if (requestBody?.content['multipart/form-data'] !== undefined) {
    contentType = 'multipart/form-data';
  }
  // binary
  else if (requestBody?.content['application/octet-stream'] !== undefined) {
    contentType = 'application/octet-stream';
  }
  // unknown
  else {
    contentType = Object.keys(requestBody.content)[0];
    console.warn('Unknown request body mime-type', contentType);
  }
  const lines = [];

  let bodyT = null;
  if (requestBody) {
    if (
      contentType === 'application/json' ||
      contentType === 'application/x-www-form-urlencoded' ||
      contentType === 'multipart/form-data'
    ) {
      const schemaModel = schemaToModel(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        requestBody.content[contentType]!.schema!,
        `${typeName}Body`,
      );
      if (schemaModel.type === 'source') {
        lines.push(...deduplicate(schemaModel.imports), '', schemaModel.code);
        bodyT = schemaModel.typeName;
      } else {
        lines.push(schemaModel.typeImport);
        lines.push(schemaModel.validatorImport);
        bodyT = schemaModel.typeName;
      }
    } else if (contentType === 'application/octet-stream') {
      bodyT = 'Blob';
    } else {
      bodyT = 'unknown';
    }
  }

  let paramsT = null;
  if (parameters.length > 0) {
    const schemaModel = schemaToModel(
      {
        type: 'object',
        properties: Object.fromEntries(parameters.map(parameterSchema)),
        required: parameters.filter((p) => p.required).map((p) => p.name),
      },
      `${typeName}Params`,
    );
    if (schemaModel.type === 'source') {
      lines.push(...deduplicate(schemaModel.imports), '', schemaModel.code);
      paramsT = schemaModel.typeName;
    } else {
      lines.push(schemaModel.typeImport);
      lines.push(schemaModel.validatorImport);
      paramsT = schemaModel.typeName;
    }
  }

  if (bodyT !== null || paramsT !== null) {
    lines.push(
      template.lines(
        `type ${typeName} = {`,
        bodyT !== null && `  body: ${bodyT};`,
        paramsT !== null &&
          `  params${parameters.length > 0 && parameters.some((p) => p.required) ? '' : '?'}: ${paramsT},`,
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
