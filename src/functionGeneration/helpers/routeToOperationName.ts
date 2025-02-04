import { lowercaseFirst, toCamelCase, uppercaseFirst } from '../../sanitization.js';

/**
 * Convert a route and method to a camelCase operation name
 *
 * @param route raw openapi route
 * @param method http method
 */
const routeToOperationName = (route: string, method: string) => {
  const segments = route
    .split('/')
    // filter out empty parts (first and last)
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (segment.startsWith(':')) {
        // :param -> param
        return segment.slice(1);
      }
      if (segment.startsWith('{') && segment.endsWith('}')) {
        // {param} -> param
        return segment.slice(1, -1);
      }
      return segment;
    })
    .map((segment) => uppercaseFirst(toCamelCase(segment)))
    // if path is of form /entity/:entityId, try removing duplicate 'entity' in operationName
    // this prevents things like EntityEntityId
    .reduce<string[]>((acc, segment) => {
      if (acc.length > 0 && segment.startsWith(acc[acc.length - 1])) {
        acc.push(segment.slice(acc[acc.length - 1].length));
      } else {
        acc.push(segment);
      }
      return acc;
    }, []);
  segments.push(method);

  // capitalize first letters (LongOperationName)
  let operationName = segments.map(uppercaseFirst).join('');
  // lowercase first letter (longOperationName)
  operationName = lowercaseFirst(operationName);

  return operationName;
};

export default routeToOperationName;
