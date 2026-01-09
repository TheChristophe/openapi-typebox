import type HTTPStatusCode from '../output/HTTPStatusCode.js';
import type Reference from './Reference.js';
import type Response from './Response.js';

/**
 * https://swagger.io/specification/#responses-object
 */
type Responses = {
  [key in HTTPStatusCode | 'default']?: Response | Reference;
};

export default Responses;
