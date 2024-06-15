import type Operation from './Operation.js';
import type Parameter from './Parameter.js';
import type Reference from './Reference.js';
import type Server from './Server.js';

export const OpenApiMethods = {
  GET: 'get',
  PUT: 'put',
  POST: 'post',
  DELETE: 'delete',
  OPTIONS: 'options',
  HEAD: 'head',
  PATH: 'patch',
  TRACE: 'trace',
} as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type OpenApiMethod = (typeof OpenApiMethods)[keyof typeof OpenApiMethods];
type PathItem = {
  // TODO: unsupported
  /**
   * Allows for a referenced definition of this path item. The referenced structure MUST be in the form of a Path Item Object. In case a Path Item Object field appears both in the defined object and the referenced object, the behavior is undefined. See the rules for resolving Relative References.
   */
  ['$ref']?: string;
  /**
   * An optional, string summary, intended to apply to all operations in this path.
   */
  summary?: string;
  /**
   * An optional, string description, intended to apply to all operations in this path. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * An alternative server array to service all operations in this path.
   */
  servers?: Server[];
  /**
   * A list of parameters that are applicable for all the operations described under this path. These parameters can be overridden at the operation level, but cannot be removed there. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. The list can use the Reference Object to link to parameters that are defined at the OpenAPI Object's components/parameters.
   */
  parameters?: Array<Parameter | Reference>;
} & /**
 * A definition of a $method operation on this path.
 */
Partial<Record<OpenApiMethod, Operation>>;

export default PathItem;
