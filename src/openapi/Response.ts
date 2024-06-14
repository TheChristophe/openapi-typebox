import type Header from './Header.js';
import type Link from './Link.js';
import type MediaType from './MediaType.js';
import type Reference from './Reference.js';

/**
 * https://swagger.io/specification/#response-object
 */
type Response = {
  /**
   * A description of the response. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description: string;
  /**
   * Maps a header name to its definition. [RFC7230](https://tools.ietf.org/html/rfc7230#page-22) states header names are case insensitive. If a response header is defined with the name "Content-Type", it SHALL be ignored.
   */
  headers?: Record<string, Header | Reference>;
  /**
   * A map containing descriptions of potential response payloads. The key is a media type or [media type range](https://tools.ietf.org/html/rfc7231#appendix--d) and the value describes it. For responses that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content?: Record<string, MediaType>;
  /**
   * A map of operations links that can be followed from the response. The key of the map is a short name for the link, following the naming constraints of the names for [Component Objects](https://swagger.io/specification/#components-object).
   */
  links?: Record<string, Link | Reference>;
};

export default Response;
