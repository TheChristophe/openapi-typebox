type FetchParameters = Exclude<Parameters<typeof fetch>[1], 'method' | 'body'>;

export type GlobalConfig = {
  /**
   * Host + base path for the API
   */
  basePath?: string;
  /**
   * Authentication methods
   */
  auth?: {
    /**
     * Bearer token (for example OAuth2)
     */
    bearer?: string;
  };
  /**
   * Fetch function override
   */
  fetch?: typeof fetch;
  /**
   * Default fetch parameters
   */
  defaultParams?: FetchParameters;
};
export type ConfigOverrides = GlobalConfig;

export const mergeConfigs = (first?: GlobalConfig, second?: ConfigOverrides): ConfigOverrides => {
  const { headers: h1, ...rest } = first?.defaultParams ?? {};
  const { headers: h2, ...rest2 } = second?.defaultParams ?? {};

  const headers = new Headers(h1);
  const headers2 = new Headers(h2);

  for (const [key, value] of headers2) {
    headers.set(key, value);
  }

  const target: ConfigOverrides = {
    basePath: second?.basePath ?? first?.basePath,
    auth: second?.auth ?? first?.auth,
    fetch: second?.fetch ?? first?.fetch,
  };

  Object.assign(rest, rest2);
  target.defaultParams = rest;
  target.defaultParams.headers = headers;

  return target;
};
