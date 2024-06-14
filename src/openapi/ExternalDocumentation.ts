/**
 * https://swagger.io/specification/#external-documentation-object
 */
type ExternalDocumentation = {
  /**
   * A description of the target documentation. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * The URL for the target documentation. This MUST be in the form of a URL.
   */
  url: string;
};

export default ExternalDocumentation;
