import type Parameter from '../../openapi/Parameter.js';
import type RequestBody from '../../openapi/RequestBody.js';
import needsSanitization from './helpers/needsSanitization.js';
import sanitizeVariableName from './helpers/sanitizeVariableName.js';
import template from '../../templater.js';

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
        '  },',
      ),

    '  config',
    '} = parameters;',
  );
};

export default destructureParameters;
