import context from '../../shared/context.js';
import template from '../../shared/templater.js';
import type Responses from '../openapi/Responses.js';
import { ResponseType, ResponseTypes } from './buildResponseTypes.js';

const buildResponseReturn = (
  operationName: string,
  responses: Responses,
  responseTypes: ResponseTypes | null,
) => {
  const lines: string[] = [];

  lines.push('switch (response.status) {');
  let defaultResponse = null;

  const responseTypeNames: Record<string, ResponseType | undefined> = responseTypes
    ? Object.fromEntries(responseTypes.map((response) => [response.responseCode, response]))
    : {};

  for (const [statusCode, response] of Object.entries(responses)) {
    // TODO: type system quirk?
    if (response === undefined) {
      continue;
    }
    let resolvedResponse;
    if ('$ref' in response) {
      const resolved = context.responses.lookup(response.$ref);
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

    const responseType = responseTypeNames[statusCode];
    // TODO: how do make responseTypename or content check unnecessary
    if (resolvedResponse.content === undefined || !responseType) {
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
          responseType.typeName && `    data: await response.blob() as ${responseType.typeName},`,
          responseType.validatorName && `    validator: ${responseType.validatorName},`,
          '  validator: ',
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
          responseType.typeName && `    data: await response.json() as ${responseType.typeName},`,
          responseType.validatorName && `    validator: ${responseType.validatorName},`,
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
        defaultResponseTypename.typeName &&
          `    data: await response.json() as ${defaultResponseTypename.typeName},`,
        defaultResponseTypename.validatorName &&
          `    validator: ${defaultResponseTypename.validatorName},`,
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
