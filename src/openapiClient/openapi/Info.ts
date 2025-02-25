/**
 * https://swagger.io/specification/#info-object
 */
type Info = {
  /**
   * The title of the API.
   */
  title: string;
  /**
   * A short summary of the API.
   */
  summary?: string;
  /**
   * A description of the API. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * A URL to the Terms of Service for the API. This MUST be in the form of a URL.
   */
  termsOfService?: string;
  contact?: {
    /**
     * The identifying name of the contact person/organization.
     */
    name?: string;
    /**
     * The URL pointing to the contact information. This MUST be in the form of a URL.
     */
    url?: string;
    /**
     * The email address of the contact person/organization. This MUST be in the form of an email address.
     */
    email?: string;
  };
  license?: {
    /**
     * The license name used for the API.
     */
    name?: string;
  } & (
    | {
        /**
         * An SPDX license expression for the API. The identifier field is mutually exclusive of the url field.
         */
        identifier?: string;
      }
    | {
        /**
         * A URL to the license used for the API. This MUST be in the form of a URL.
         */
        url?: string;
      }
  );
  /**
   * The version of the OpenAPI document (which is distinct from the [OpenAPI Specification version](https://swagger.io/specification/#oas-version) or the API implementation version).
   */
  version: string;
};

export default Info;
