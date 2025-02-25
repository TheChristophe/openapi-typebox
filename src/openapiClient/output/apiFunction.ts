import { ConfigOverrides } from './clientConfig.js';

/**
 * Typing for api functions where function parameters are optional if there are no api params
 */
export type ApiFunction<Parameters = undefined, Response = unknown> = Parameters extends undefined
  ? (params?: { config?: ConfigOverrides }) => Promise<Response>
  : (params: Parameters & { config?: ConfigOverrides }) => Promise<Response>;
