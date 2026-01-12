import { type PathItem } from './PathItem.js';

/**
 * https://swagger.io/specification/#operation-object
 */
export type Paths = {
  /**
   * A relative path to an individual endpoint. The field name MUST begin with a forward slash (/). The path is appended (no relative URL resolution) to the expanded URL from the [Server Object](https://swagger.io/specification/#server-object)'s url field in order to construct the full URL. [Path templating](https://swagger.io/specification/#path-templating) is allowed. When matching URLs, concrete (non-templated) paths would be matched before their templated counterparts. Templated paths with the same hierarchy but different templated names MUST NOT exist as they are identical. In case of ambiguous matching, it's up to the tooling to decide which one to use.
   */
  [key in `/${string}`]: PathItem;
};
