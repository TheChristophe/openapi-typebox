type FetchParameters = Exclude<Parameters<typeof fetch>[1], 'method' | 'body'>;

type ClientConfig = {
  basePath?: string;
  auth?: {
    bearer?: string;
  };
  defaultParams?: FetchParameters;
};

export const mergeConfigs = (first?: ClientConfig, second?: ClientConfig): ClientConfig => {
  const { headers: h1, ...rest } = first?.defaultParams ?? {};
  const { headers: h2, ...rest2 } = second?.defaultParams ?? {};

  const headers = new Headers(h1);
  const headers2 = new Headers(h2);

  for (const [key, value] of headers2) {
    headers.set(key, value);
  }

  const target: ClientConfig = {
    basePath: second?.basePath ?? first?.basePath,
    auth: second?.auth ?? first?.auth,
  };

  Object.assign(rest, rest2);
  target.defaultParams = rest;
  target.defaultParams.headers = headers;

  return target;
};

export default ClientConfig;
