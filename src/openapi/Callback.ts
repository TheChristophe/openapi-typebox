import type PathItem from './PathItem.js';
import type Reference from './Reference.js';
import type RuntimeExpression from './RuntimeExpression.js';
import type PRecord from './PRecord.js';

/**
 * https://swagger.io/specification/#callback-object
 */
type Callback = PRecord<RuntimeExpression, PathItem | Reference>;

export default Callback;
