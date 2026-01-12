import { type PathItem } from './PathItem.js';
import { type PRecord } from './PRecord.js';
import { type Reference } from './Reference.js';
import { type RuntimeExpression } from './RuntimeExpression.js';

/**
 * https://swagger.io/specification/#callback-object
 */
export type Callback = PRecord<RuntimeExpression, PathItem | Reference>;
