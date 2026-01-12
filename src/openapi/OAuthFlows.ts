import { type OAuthFlow } from './OAuthFlow.js';

export type OAuthFlows = {
  /**
   * Configuration for the OAuth Implicit flow
   */
  implicit?: Pick<OAuthFlow, 'authorizationUrl' | 'refreshUrl' | 'scopes'>;
  /**
   * Configuration for the OAuth Resource Owner Password flow
   */
  password?: Pick<OAuthFlow, 'tokenUrl' | 'refreshUrl' | 'scopes'>;
  /**
   * Configuration for the OAuth Client Credentials flow. Previously called application in OpenAPI 2.0.
   */
  clientCredentials?: Pick<OAuthFlow, 'tokenUrl' | 'refreshUrl' | 'scopes'>;
  /**
   * Configuration for the OAuth Authorization Code flow. Previously called accessCode in OpenAPI 2.0.
   */
  authorizationCode?: Pick<OAuthFlow, 'authorizationUrl' | 'tokenUrl' | 'refreshUrl' | 'scopes'>;
};
