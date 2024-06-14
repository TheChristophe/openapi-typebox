import type Encoding from './Encoding.js';
import type Example from './Example.js';
import type JsonSchema from './JsonSchema.js';
import type Reference from './Reference.js';

/**
 * https://swagger.io/specification/#media-type-object
 */
type MediaType = {
  /**
   * The schema defining the content of the request, response, or parameter.
   */
  schema?: JsonSchema;
  /**
   * Example of the media type. The example object SHOULD be in the correct format as specified by the media type. The example field is mutually exclusive of the examples field. Furthermore, if referencing a schema which contains an example, the example value SHALL override the example provided by the schema.
   */
  example?: unknown;
  /**
   * Examples of the media type. Each example object SHOULD match the media type and specified schema if present. The examples field is mutually exclusive of the example field. Furthermore, if referencing a schema which contains an example, the examples value SHALL override the example provided by the schema.
   */
  examples?: Record<string, Example | Reference>;
  /**
   * A map between a property name and its encoding information. The key, being the property name, MUST exist in the schema as a property. The encoding object SHALL only apply to requestBody objects when the media type is multipart or application/x-www-form-urlencoded.
   */
  encoding?: Record<string, Encoding>;
};

export default MediaType;
