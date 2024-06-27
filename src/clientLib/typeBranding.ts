declare const SuccessBrand: unique symbol;
declare const ErrorBrand: unique symbol;

export type ResponseBrand<T, SuccessT, ErrorT = never> = T & {
  [SuccessBrand]: SuccessT;
  [ErrorBrand]: ErrorT;
};

export type GetSuccess<T extends { [SuccessBrand]: unknown }> = T[typeof SuccessBrand];
export type GetError<T extends { [ErrorBrand]: unknown }> = T[typeof ErrorBrand];
