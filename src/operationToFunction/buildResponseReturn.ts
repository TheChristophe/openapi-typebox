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

    const numericStatus = +statusCode;
    const isGood = !Number.isNaN(numericStatus) && numericStatus >= 200 && numericStatus < 300;

    if (!response.content) {
      lines.push(
        template.lines(
          'ret = ({',
          `  good: ${isGood.toString()},`,
          '  value: {',
          `    status: ${statusCode},`,
          '    response,',
          '  },',
          '});',
          'break;',
        ),
      );
      continue;
    }

    const responseName = `${uppercaseFirst(operationName)}${statusCode}`;

    const responseSchema = response.content['application/json'];
    // json unsupported
    if (responseSchema === undefined) {
      lines.push(
        template.lines(
          'ret = ({',
          `  good: ${isGood.toString()},`,
          '  value: {',
          `    status: ${statusCode},`,
          `    data: await response.blob() as ${responseName},`,
          '    response,',
          '  }' + '});',
          'break;',
        ),
      );
    } else {
      lines.push(
        template.lines(
          'ret = ({',
          `  good: ${isGood.toString()},`,
          '  value: {',
          `   status: ${statusCode},`,
          `   data: await response.json() as ${responseName},`,
          '   response,',
          '  }',
          '});',
          'break;',
        ),
      );
    }
  }

  lines.push(
    template.lines(
      'default:',
      'ret = ({',
      '  good: false,',
      '  value: {',
      '    status: undefined,',
      '    response,',
      '  }',
      '});',
    ),
  );

  lines.push('};');

  return lines.join('\n');
};

export default buildResponseReturn;
