declare const SuccessBrand: unique symbol;
declare const ErrorBrand: unique symbol;

/**
 * This brands the types of the API success and error responses into the return type from the api function.
 *
 * Use with GetError<>.
 */
export type ResponseBrand<T, SuccessT, ErrorT = never> = T & {
  [SuccessBrand]: SuccessT;
  [ErrorBrand]: ErrorT;
};

export type GetSuccess<T extends { [SuccessBrand]: unknown }> = T[typeof SuccessBrand];
/**
 * This allows extracting the error type from the function to use in a catch after checking if it is an ApiError.
 * It is not ideal, but typescript doesn't let you label error types otherwise.
 */
export type GetError<T extends { [ErrorBrand]: unknown }> = T[typeof ErrorBrand];
