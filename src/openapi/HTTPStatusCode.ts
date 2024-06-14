/**
 * https://swagger.io/specification/#http-status-codes
 */
type _Inforational = 100 | 101 | 102 | 103;
type _Success = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
type _Redirection = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
type _ClientError =
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

type _ServerError = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511;
type HTTPStatusCode = _Inforational | _Success | _Redirection | _ClientError | _ServerError;

export default HTTPStatusCode;
