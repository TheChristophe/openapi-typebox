import type PathItem from './PathItem.js';
import type Reference from './Reference.js';
import type RuntimeExpression from './RuntimeExpression.js';

/**
 * https://swagger.io/specification/#callback-object
 */
type Callback = {
  [key in RuntimeExpression]: PathItem | Reference;
};

export default Callback;
