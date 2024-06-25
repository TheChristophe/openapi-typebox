import type Reference from '../../openapi/Reference.js';
import NotImplementedError from '../../NotImplementedError.js';

function refUnsupported<T>(thing: Reference | T): asserts thing is T {
  if (typeof thing === 'object' && thing != null && '$ref' in thing) {
    throw new NotImplementedError(
      `Reference to ${thing['$ref']} could not be resolved as references`,
    );
  }
  //return true;
}

export default refUnsupported;
