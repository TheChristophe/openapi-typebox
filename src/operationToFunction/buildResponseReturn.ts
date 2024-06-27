import template from '../templater.js';
import type Responses from '../openapi/Responses.js';
import refUnsupported from './helpers/refUnsupported.js';
import { uppercaseFirst } from './helpers/stringManipulation.js';

const buildResponseReturn = (operationName: string, responses: Responses): string => {
  const lines: string[] = [];

  lines.push('switch (response.status) {');

  for (const [statusCode, response] of Object.entries(responses)) {
    refUnsupported(response);

    lines.push(template.lines(`case ${statusCode}:`));

    if (!response.content) {
      lines.push(template.lines('return ({', `  status: ${statusCode},`, '  response,', '});'));
      continue;
    }

    const responseName = `${uppercaseFirst(operationName)}${statusCode}`;

    lines.push('{');
    const responseSchema = response.content['application/json'];
    // json unsupported
    if (responseSchema === undefined) {
      lines.push(
        template.lines(
          'return ({',
          `  status: ${statusCode},`,
          `  data: await response.blob() as ${responseName},`,
          '  response,',
          '});',
        ),
      );
    } else {
      lines.push(
        template.lines(
          'return ({',
          `  status: ${statusCode},`,
          `  data: await response.json() as ${responseName},`,
          '  response,',
          '});',
        ),
      );
    }
    lines.push('};');
  }

  lines.push(template.lines('default:', 'return ({', 'status: undefined,', 'response,', '});'));

  lines.push('};');

  return lines.join('\n');
};

export default buildResponseReturn;
