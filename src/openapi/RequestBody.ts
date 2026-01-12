import { type MediaType } from './MediaType.js';
import { type PRecord } from './PRecord.js';

/**
 * https://swagger.io/specification/#request-body-object
 */
export type RequestBody = {
  /**
   * A brief description of the request body. This could contain examples of use. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;

  /**
   * The content of the request body. The key is a media type or [media type range](https://tools.ietf.org/html/rfc7231#appendix--d) and the value describes it. For requests that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content: PRecord<string, MediaType>;

  /**
   * Determines if the request body is required in the request. Defaults to false.
   */
  required?: boolean;
};
