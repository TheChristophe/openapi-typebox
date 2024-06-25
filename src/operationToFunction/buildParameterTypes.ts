import type Parameter from '../openapi/Parameter.js';
import type RequestBody from '../openapi/RequestBody.js';
import { type CodegenSlice } from '../schema2typebox/joinBatch.js';
import { collect } from '../schema2typebox/index.js';

const buildParameterTypes = (
  typeName: string,
  parameters?: Parameter[],
  requestBody?: RequestBody,
): CodegenSlice => {
  const lines: string[] = [];
  const extraImports: string[] = [];
  lines.push(
    `type ${typeName} = Static<typeof ${typeName}>;
const ${typeName} = Type.Object(
{`,
  );
  if (parameters) {
    for (const parameter of parameters) {
      const schema = parameter.schema !== undefined ? collect(parameter.schema) : undefined;

      const required = parameter.required ?? parameter.in === 'path';
      const code =
        schema?.code !== undefined
          ? required
            ? schema.code
            : `Type.Optional(${schema.code})`
          : 'unknown';

      lines.push(`${parameter.name}: ${code},`);
      schema?.extraImports && extraImports.push(...schema.extraImports);
    }
  }
  if (requestBody) {
    // TODO: other requestbody schemas? multipart form, xml, ?
    const jsonSchema = requestBody.content['application/json']?.schema;

    const schema = jsonSchema != null ? collect(jsonSchema) : undefined;

    const required = requestBody.required ?? false;
    const code =
      schema?.code !== undefined
        ? required
          ? schema.code
          : `Type.Optional(${schema.code})`
        : 'unknown';
    lines.push(`body: ${code},`);
    schema?.extraImports && extraImports.push(...schema.extraImports);
  }
  lines.push('});');

  return {
    code: lines.join('\n'),
    extraImports,
  };
};

export default buildParameterTypes;
