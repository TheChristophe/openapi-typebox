import type Parameter from '../openapi/Parameter.js';
import substituteParams from './helpers/substituteParams.js';

const buildUrl = (route: string, parameters: Parameter[]) => {
  const lines: string[] = [];
  if (parameters.length > 0) {
    lines.push(
      `const url = \`${substituteParams(
        route,
        parameters.filter((param) => param.in === 'path'),
      )}\`;`,
    );
  } else {
    // eslint-disable-next-line no-template-curly-in-string
    lines.push(`const url = \`\${config?.basePath ?? ''}${route}\`;`);
  }
  return lines;
};

export default buildUrl;
