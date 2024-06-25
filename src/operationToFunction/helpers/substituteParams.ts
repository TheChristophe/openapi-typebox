import type Parameter from '../../openapi/Parameter.js';
import { InvalidParamError } from '../index.js';

const substituteParams = (route: string, parameters: Parameter[]) => {
  // TODO: this is "overly careful", but it may allow to highlight unspecified parameters ahead of time?
  for (const param of parameters) {
    if (!route.includes(param.name)) {
      throw new InvalidParamError(`Parameter ${param.name} specified but wasn't found in route`);
    }
    route = route.replace(`{${param.name}}`, `\${${param.name}}`);
  }
  return route;
};

export default substituteParams;
