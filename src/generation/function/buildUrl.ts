import type Parameter from '../../openapi/Parameter.js';
import template from '../utility/templater.js';
import substituteParams from './helpers/substituteParams.js';

const buildUrl = (route: string, parameters: Parameter[]) =>
  template.concat(
    // eslint-disable-next-line no-template-curly-in-string
    "const url = `${config?.basePath ?? ''}",
    parameters.length > 0
      ? substituteParams(
          route,
          parameters.filter((param) => param.in === 'path'),
        )
      : route,
    '`;',
  );

export default buildUrl;
