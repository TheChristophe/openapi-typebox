import { type Callback } from './Callback.js';
import { type ExternalDocumentation } from './ExternalDocumentation.js';
import { type Parameter } from './Parameter.js';
import { type PRecord } from './PRecord.js';
import { type Reference } from './Reference.js';
import { type RequestBody } from './RequestBody.js';
import { type Responses } from './Responses.js';
import { type SecurityRequirements } from './SecurityRequirements.js';
import { type Server } from './Server.js';

/**
 * https://swagger.io/specification/#operation-object
 */
export type Operation = {
  /**
   * A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.
   */
  tags?: Array<string>;
  /**
   * A short summary of what the operation does.
   */
  summary?: string;
  /**
   * A verbose explanation of the operation behavior. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * Additional external documentation for this operation.
   */
  externalDocs?: ExternalDocumentation;
  /**
   * Unique string used to identify the operation. The id MUST be unique among all operations described in the API. The operationId value is case-sensitive. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.
   */
  operationId?: string;
  /**
   * A list of parameters that are applicable for this operation. If a parameter is already defined at the [Path Item](https://swagger.io/specification/#path-item-parameters), the new definition will override it but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a [name](https://swagger.io/specification/#parameter-name) and [location](https://swagger.io/specification/#parameter-in). The list can use the [Reference Object](https://swagger.io/specification/#reference-object) to link to parameters that are defined at the OpenAPI Object's components/parameters.
   */
  parameters?: Array<Parameter | Reference>;
  /**
   * The request body applicable for this operation. The requestBody is fully supported in HTTP methods where the HTTP 1.1 specification [RFC7231](https://tools.ietf.org/html/rfc7231#section-4.3.1) has explicitly defined semantics for request bodies. In other cases where the HTTP spec is vague (such as [GET](https://tools.ietf.org/html/rfc7231#section-4.3.1), [HEAD](https://tools.ietf.org/html/rfc7231#section-4.3.2) and [DELETE](https://tools.ietf.org/html/rfc7231#section-4.3.5)), requestBody is permitted but does not have well-defined semantics and SHOULD be avoided if possible.
   */
  requestBody?: RequestBody | Reference;
  /**
   * The list of possible responses as they are returned from executing this operation.
   */
  responses?: Responses;
  /**
   * A map of possible out-of band callbacks related to the parent operation. The key is a unique identifier for the Callback Object. Each value in the map is a Callback Object that describes a request that may be initiated by the API provider and the expected responses.
   */
  callbacks?: PRecord<string, Callback>;
  /**
   * Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation. Default value is false.
   */
  deprecated?: boolean;
  /**
   * A declaration of which security mechanisms can be used for this operation. The list of values includes alternative security requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request. To make security optional, an empty security requirement ({}) can be included in the array. This definition overrides any declared top-level [security](https://swagger.io/specification/#oas-security). To remove a top-level security declaration, an empty array can be used.
   */
  security?: Array<SecurityRequirements>;
  /**
   * An alternative server array to service this operation. If an alternative server object is specified at the Path Item Object or Root level, it will be overridden by this value.
   */
  servers?: Array<Server>;
};
