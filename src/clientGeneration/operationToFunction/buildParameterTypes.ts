import type Parameter from '../../openapi/Parameter.js';
import type RequestBody from '../../openapi/RequestBody.js';
import { collect } from '../../schema2typebox/index.js';
import { type CodegenSlice } from '../../schema2typebox/joinBatch.js';
import typeboxImportStatements from '../../schema2typebox/typeboxImportStatements.js';
import template from '../../templater.js';
import writeSourceFile from '../../writeSourceFile.js';

const generateParameter = (parameter: Parameter): CodegenSlice => {
  const schema = parameter.schema !== undefined ? collect(parameter.schema) : undefined;

  const required = parameter.required ?? parameter.in === 'path';
  const code =
    schema?.code !== undefined
      ? required
        ? schema.code
        : `Type.Optional(${schema.code})`
      : 'unknown';

  return {
    code: `${parameter.name}: ${code}`,
    extraImports: schema?.extraImports,
  };
};

const generateBody = (requestBody: RequestBody): CodegenSlice => {
  const jsonSchema = requestBody.content['application/json']?.schema;

  const schema = jsonSchema != null ? collect(jsonSchema) : undefined;

  const required = requestBody.required ?? false;
  const code =
    schema?.code !== undefined
      ? required
        ? schema.code
        : `Type.Optional(${schema.code})`
      : 'unknown';

  return {
    code: `body: ${code},`,
    extraImports: schema?.extraImports,
  };
};

const buildParameterTypes = (
  outFile: string,
  typeName: string,
  parameters: Parameter[] = [],
  requestBody?: RequestBody,
) => {
  const parameterSlices = parameters.map(generateParameter);
  const bodyParameter = requestBody ? generateBody(requestBody) : undefined;

  writeSourceFile(
    outFile,
    template.lines(
      typeboxImportStatements(true),
      ...parameterSlices.flatMap(({ extraImports }) => extraImports ?? []),
      ...(bodyParameter?.extraImports ?? []),
      '',
      `const ${typeName} = Type.Object({`,
      bodyParameter !== undefined && bodyParameter.code,
      parameterSlices.length > 0 &&
        template.concat(
          'params: Type.Object({',
          parameterSlices.map(({ code }) => `${code},`),
          '}),',
        ),
      '});',
      `type ${typeName} = Static<typeof ${typeName}>;`,
      '',
      `export default ${typeName};`,
    ),
  );
};

export default buildParameterTypes;
