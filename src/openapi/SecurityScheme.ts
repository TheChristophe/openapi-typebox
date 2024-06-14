import type OAuthFlows from './OAuthFlows.js';

type SecurityScheme = {
  /**
   * A description for security scheme. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.
   */
  description?: string;
} & (
  | {
      /**
       * The type of the security scheme.
       */
      type: 'apiKey';
      /**
       * The name of the header, query or cookie parameter to be used.
       */
      name: string;
      /**
       * The location of the API key. Valid values are "query", "header" or "cookie".
       */
      in: string;
    }
  | {
      /**
       * The type of the security scheme.
       */
      type: 'http';
      /**
       * The name of the HTTP Authorization scheme to be used in the [Authorization header as defined in RFC7235](https://tools.ietf.org/html/rfc7235#section-5.1). The values used SHOULD be registered in the [IANA Authentication Scheme registry](https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml).
       */
      scheme: string;
      /**
       * A hint to the client to identify how the bearer token is formatted. Bearer tokens are usually generated by an authorization server, so this information is primarily for documentation purposes.
       */
      bearerFormat?: string;
    }
  | {
      /**
       * The type of the security scheme.
       */
      type: 'oauth2';
      /**
       * An object containing configuration information for the flow types supported.
       */
      flows: OAuthFlows;
    }
  | {
      /**
       * The type of the security scheme.
       */
      type: 'openIdConnect';
      /**
       * OpenId Connect URL to discover OAuth2 configuration values. This MUST be in the form of a URL. The OpenID Connect standard requires the use of TLS.
       */
      openIdConnectUrl: string;
    }
  | {
      /**
       * The type of the security scheme.
       */
      type: 'mutualTLS';
    }
);

export default SecurityScheme;
