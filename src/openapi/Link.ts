import type RuntimeExpression from './RuntimeExpression.js';
import type Server from './Server.js';

/**
 * https://swagger.io/specification/#link-object
 */
type Link = (
  | {
      /**
       * A relative or absolute URI reference to an OAS operation. This field is mutually exclusive of the operationId field, and MUST point to an [Operation Object](https://swagger.io/specification/#operation-object). Relative operationRef values MAY be used to locate an existing [Operation Object](https://swagger.io/specification/#operation-object) in the OpenAPI definition. See the rules for resolving [Relative References](https://swagger.io/specification/#relative-references-in-uris).
       */
      operationRef?: string;
    }
  | {
      /**
       * The name of an existing, resolvable OAS operation, as defined with a unique operationId. This field is mutually exclusive of the operationRef field.
       */
      operationId?: string;
    }
) & {
  /**
   * A map representing parameters to pass to an operation as specified with operationId or identified via operationRef. The key is the parameter name to be used, whereas the value can be a constant or an expression to be evaluated and passed to the linked operation. The parameter name can be qualified using the parameter location [{in}.]{name} for operations that use the same parameter name in different locations (e.g. path.id).
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  parameters?: Record<string, unknown | RuntimeExpression>;
  /**
   * A literal value or [{expression}](https://swagger.io/specification/#runtime-expressions) to use as a request body when calling the target operation.
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  requestBody?: unknown | RuntimeExpression;
  /**
   * A description of the link. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * A server object to be used by the target operation.
   */
  server?: Server;
};

export default Link;
