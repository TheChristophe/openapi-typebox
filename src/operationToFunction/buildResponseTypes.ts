import type Responses from '../openapi/Responses.js';
import { type CodegenSlice } from '../schema2typebox/joinBatch.js';
import refUnsupported from './helpers/refUnsupported.js';
import { collect } from '../schema2typebox/index.js';

const buildResponseTypes = (
  operationName: string,
  responses: Responses,
): CodegenSlice & { responseTypename: string } => {
  const lines: string[] = [];
  const extraImports: string[] = [];
  const types: { typename: string; responseCode: string }[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    refUnsupported(response);

    const responseName = operationName[0].toUpperCase() + operationName.substring(1) + statusCode;
    if (!response.content) {
      lines.push(`type ${responseName} = unknown;`);
      types.push({ typename: responseName, responseCode: statusCode });
      continue;
    }

    const responseSchema = response.content['application/json'];
    if (responseSchema === undefined) {
      // TODO: different types
      lines.push(`type ${responseName} = unknown;`);
    } else {
      const schema = responseSchema.schema != null ? collect(responseSchema.schema) : undefined;

      const code = schema?.code !== undefined ? schema.code : 'unknown';
      lines.push(
        `type ${responseName} = Static<typeof ${responseName}>;
const ${responseName} = ${code};
`,
      );
      types.push({ typename: responseName, responseCode: statusCode });
      schema?.extraImports && extraImports.push(...schema.extraImports);
    }
  }

  const responseTypename = `${operationName[0].toUpperCase() + operationName.substring(1)}Response`;
  lines.push('');
  lines.push(`type ${responseTypename} =`);

  for (const { typename, responseCode } of types) {
    lines.push(`| { status: ${responseCode}; data: ${typename} }`);
  }
  lines.push(';');

  return {
    code: lines.join('\n'),
    extraImports,
    responseTypename,
  };
};

export default buildResponseTypes;
