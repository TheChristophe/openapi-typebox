import type JsonSchema from './JsonSchema.js';
import type Response from './Response.js';
import type Reference from './Reference.js';
import type Parameter from './Parameter.js';
import type Example from './Example.js';
import type RequestBody from './RequestBody.js';
import type Header from './Header.js';
import type SecurityScheme from './SecurityScheme.js';
import type Link from './Link.js';
import type Callback from './Callback.js';
import type PathItem from './PathItem.js';
import type PRecord from './PRecord.js';

/**
 * https://swagger.io/specification/#operation-object
 */
type Components = {
  /**
   * An object to hold reusable [Schema Objects](https://swagger.io/specification/#schema-object).
   */
  schemas?: PRecord<string, JsonSchema>;
  /**
   * An object to hold reusable [Response Objects](https://swagger.io/specification/#response-object).
   */
  responses?: PRecord<string, Response | Reference>;
  /**
   * An object to hold reusable [Parameter Objects](https://swagger.io/specification/#parameter-object).
   */
  parameters?: PRecord<string, Parameter | Reference>;
  /**
   * An object to hold reusable [Example Objects](https://swagger.io/specification/#example-object).
   */
  examples?: PRecord<string, Example | Reference>;
  /**
   * An object to hold reusable [Request Body Objects](https://swagger.io/specification/#request-body-object).
   */
  requestBodies?: PRecord<string, RequestBody | Reference>;
  /**
   * An object to hold reusable [Header Objects](https://swagger.io/specification/#header-object).
   */
  headers?: PRecord<string, Header | Reference>;
  /**
   * An object to hold reusable [Security Scheme Objects](https://swagger.io/specification/#security-scheme-object).
   */
  securitySchemes?: PRecord<string, SecurityScheme>;
  /**
   * An object to hold reusable [Link Objects](https://swagger.io/specification/#link-object).
   */
  links?: PRecord<string, Link | Reference>;
  /**
   * An object to hold reusable [Callback Objects](https://swagger.io/specification/#callback-object).
   */
  callbacks?: PRecord<string, Callback | Reference>;
  /**
   * An object to hold reusable Path Item Object.
   */
  pathItems?: PRecord<string, PathItem>;
};

export default Components;
