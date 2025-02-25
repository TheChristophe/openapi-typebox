import type ExternalDocumentation from './ExternalDocumentation.js';

/**
 * https://swagger.io/specification/#tag-object
 */
type Tag = {
  /**
   * The name of the tag.
   */
  name: string;
  /**
   * A description for the tag. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
  /**
   * Additional external documentation for this tag.
   */
  externalDocs?: ExternalDocumentation;
};

export default Tag;
