/**
 * https://swagger.io/specification/#http-status-codes
 */
export type HTTPInformational = 100 | 101 | 102 | 103;
export type HTTPSuccess = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
export type HTTPRedirection = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
export type HTTPClientError =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 427
  | 428
  | 429
  | 430
  | 431
  | 451;
export type HTTPServerError = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511;
export type HTTPStatusCode =
  | HTTPInformational
  | HTTPSuccess
  | HTTPRedirection
  | HTTPClientError
  | HTTPServerError;

export const INFO_CODES: HTTPInformational[] = [100, 101, 102, 103] as const;
export const SUCCESS_CODES: HTTPSuccess[] = [
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
] as const;
export const REDIRECT_CODES: HTTPRedirection[] = [300, 301, 302, 303, 304, 307, 308] as const;
export const CLIENT_ERROR_CODES: HTTPClientError[] = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418,
  421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 451,
] as const;
export const SERVER_ERROR_CODES: HTTPServerError[] = [
  500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511,
] as const;
export type HTTPCodeGood = HTTPSuccess | HTTPRedirection;
export type HTTPCodeBad = HTTPClientError | HTTPServerError;
export type HTTPCode = HTTPInformational | HTTPCodeGood | HTTPCodeBad;
