class ApiError<ResponseT> extends Error {
  constructor(private _response: ResponseT) {
    super();
  }

  get response() {
    return this._response;
  }
}

export default ApiError;
