import { uppercaseFirst, lowercaseFirst } from './stringManipulation.js';

const routeToOperationName = (route: string, method: string) => {
  const segments = route
    .split('/')
    // filter out empty parts (first and last), exclude {params} from name
    .filter((segment) => segment.length > 0 && !segment.startsWith('{') && !segment.endsWith('}'));
  segments.push(method);

  // capitalize first letters (LongOperationName)
  let operationName = segments.map(uppercaseFirst).join('');
  // lowercase first letter (longOperationName)
  operationName = lowercaseFirst(operationName);

  return operationName;
};

export default routeToOperationName;
