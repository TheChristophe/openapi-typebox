import appContext from '../appContext.js';
import type Responses from '../openapi/Responses.js';
import template from '../templater.js';
import { ResponseTypes } from './buildResponseTypes.js';

const buildResponseReturn = (
  operationName: string,
  responses: Responses,
  responseTypes: ResponseTypes | null,
) => {
  const lines: string[] = [];

  lines.push('switch (response.status) {');
  let defaultResponse = null;

  const responseTypeNames: Record<string, string | undefined> =
    responseTypes?.reduce(
      (acc, next) => {
        acc[next.responseCode] = next.typename;
        return acc;
      },
      {} as Record<string, string | undefined>,
    ) ?? {};

  for (const [statusCode, response] of Object.entries(responses)) {
    // TODO: type system quirk?
    if (response === undefined) {
      continue;
    }
    let resolvedResponse;
    if ('$ref' in response) {
      const resolved = appContext.responses.lookup(response.$ref);
      if (resolved === undefined) {
        throw new Error(`Could not resolve response reference ${response.$ref}`);
      }
      resolvedResponse = resolved.raw;
    } else {
      resolvedResponse = response;
    }

    if (statusCode === 'default') {
      defaultResponse = resolvedResponse;
      continue;
    } else {
      lines.push(template.lines(`case ${statusCode}:`));
    }

    const responseTypename = responseTypeNames[statusCode];
    // TODO: how do make responseTypename or content check unnecessary
    if (resolvedResponse.content === undefined || !responseTypename) {
      lines.push(
        template.lines(
          'return {',
          `  status: ${statusCode},`,
          '  response,',
          '  request: requestMeta,',
          '};',
        ),
      );
      continue;
    }

    const responseSchema = resolvedResponse.content['application/json'];
    // json unsupported
    if (responseSchema === undefined) {
      lines.push(
        template.lines(
          'return {',
          `  status: ${statusCode},`,
          `  data: await response.blob() as ${responseTypename},`,
          '  response,',
          '  request: requestMeta,',
          '};',
        ),
      );
    } else {
      lines.push(
        template.lines(
          'return {',
          `  status: ${statusCode},`,
          `  data: await response.json() as ${responseTypename},`,
          '  response,',
          '  request: requestMeta,',
          '};',
        ),
      );
    }
  }

  const defaultResponseTypename = responseTypeNames['default'];
  // TODO: how do make defaultResponseTypename check unnecessary
  if (defaultResponse && defaultResponseTypename) {
    lines.push(
      template.lines(
        'default:',
        'if (response.status !== 0) {',
        '  return {',
        "    status: 'default',",
        `    data: await response.json() as ${defaultResponseTypename},`,
        '    response,',
        '    request: requestMeta,',
        '  };',
        '}',
        'return {',
        '  status: -1,',
        '  response,',
        '  request: requestMeta,',
        '};',
      ),
    );
  } else {
    lines.push(
      template.lines(
        'default:',
        'return {',
        '  status: -1,',
        '  response,',
        '  request: requestMeta,',
        '};',
      ),
    );
  }

  lines.push('}');

  return lines;
};

export default buildResponseReturn;
