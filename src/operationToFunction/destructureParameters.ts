import type Parameter from '../openapi/Parameter.js';
import type RequestBody from '../openapi/RequestBody.js';
import needsSanitization from './helpers/needsSanitization.js';
import sanitizeVariableName from './helpers/sanitizeVariableName.js';

const destructureParameters = (parameters: Parameter[], requestBody?: RequestBody): string[] => {
  const lines: string[] = [];
  if (parameters.length > 0 || requestBody) {
    lines.push('const {');
    for (const parameter of parameters) {
      if (needsSanitization(parameter.name)) {
        lines.push(`['${parameter.name}']: ${sanitizeVariableName(parameter.name)},`);
      } else {
        lines.push(`${parameter.name},`);
      }
    }
    if (requestBody) {
      lines.push('body,');
    }
    lines.push('} = parameters;');
  }
  return lines;
};

export default destructureParameters;
