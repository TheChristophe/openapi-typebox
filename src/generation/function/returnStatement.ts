import { type Response } from '../../openapi/Response.js';
import { type Responses } from '../../openapi/Responses.js';
import { type ResponseType, type ResponseTypes } from '../response/responseTypes.js';
import context from '../utility/context.js';
import template from '../utility/templater.js';

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
    if (response == null) {
      continue;
    }

    let resolvedResponse: Response;
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
          responseType.responseEntry?.typeName &&
            `    data: await response.blob() as ${responseType.responseEntry?.typeName},`,
          responseType.responseEntry?.validatorName &&
            `    validator: ${responseType.responseEntry?.validatorName},`,
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
          responseType.responseEntry?.typeName &&
            `    data: await response.json() as ${responseType.responseEntry?.typeName},`,
          responseType.responseEntry?.validatorName &&
            `    validator: ${responseType.responseEntry?.validatorName},`,
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
        defaultResponseTypename.responseEntry?.typeName &&
          `    data: await response.json() as ${defaultResponseTypename.responseEntry?.typeName},`,
        defaultResponseTypename.responseEntry?.validatorName &&
          `    validator: ${defaultResponseTypename.responseEntry?.validatorName},`,
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
