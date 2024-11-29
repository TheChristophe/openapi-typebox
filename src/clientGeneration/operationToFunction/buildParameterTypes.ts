import { JSONSchema7Definition } from 'json-schema';
import { deduplicate } from '../../deduplicate.js';
import schemaToModel from '../../modelGeneration/schemaToModel.js';
import type Parameter from '../../openapi/Parameter.js';
import type RequestBody from '../../openapi/RequestBody.js';
import template from '../../templater.js';
import writeSourceFile from '../../writeSourceFile.js';

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
  // for now just mock a schema
  // TODO: write own generator?
  const schema = schemaToModel(
    {
      type: 'object',
      properties: {
        ...(requestBody !== undefined && {
          body: requestBody.content['application/json']?.schema ?? { type: 'object' },
        }),
        ...(parameters.length > 0 && {
          params: {
            type: 'object',
            properties: {
              ...Object.fromEntries(parameters.map(parameterSchema)),
            },
            required: [...parameters.filter((p) => p.required).map((p) => p.name)],
          },
        }),
      },
      required: [...(requestBody ? ['body'] : []), ...(parameters.length > 0 ? ['params'] : [])],
    },
    typeName,
  );

  writeSourceFile(
    outFile,
    template.lines(
      ...deduplicate(schema.imports),
      '',
      schema.code,
      '',
      `export default ${schema.typeName};`,
    ),
  );
};

export default buildParameterTypes;
