import type Parameter from '../openapi/Parameter.js';
import type RequestBody from '../openapi/RequestBody.js';
import { needsSanitization, sanitizeVariableName } from '../sanitization.js';
import template from '../templater.js';

const destructureParameters = (parameters: Parameter[], requestBody?: RequestBody) => {
  if (parameters.length === 0 && requestBody == null) {
    return 'const { config } = parameters;';
  }

  return template.lines(
    'const {',
    requestBody != null && '  body,',
    parameters.length > 0 &&
      template.lines(
        '  params: {',

        parameters.map((parameter) =>
          needsSanitization(parameter.name)
            ? `['${parameter.name}']: ${sanitizeVariableName(parameter.name)},`
            : `${parameter.name},`,
        ),
        !parameters.some((p) => p.required) ? '  } = {},' : '  },',
      ),

    '  config',
    '} = parameters;',
  );
};

export default destructureParameters;
