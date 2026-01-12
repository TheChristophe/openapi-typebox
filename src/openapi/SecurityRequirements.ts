/**
 * https://swagger.io/specification/#security-requirement-object
 */
export type SecurityRequirements = {
  /**
   * Each name MUST correspond to a security scheme which is declared in the [Security Schemes](https://swagger.io/specification/#components-security-schemes) under the [Components Object](https://swagger.io/specification/#components-object). If the security scheme is of type "oauth2" or "openIdConnect", then the value is a list of scope names required for the execution, and the list MAY be empty if authorization does not require a specified scope. For other security scheme types, the array MAY contain a list of role names which are required for the execution, but are not otherwise defined or exchanged in-band.
   */
  [name in string]: Array<string>;
};
