import { type Components } from './Components.js';
import { type ExternalDocumentation } from './ExternalDocumentation.js';
import { type Info } from './Info.js';
import { type PathItem } from './PathItem.js';
import { type Paths } from './Paths.js';
import { type PRecord } from './PRecord.js';
import { type Reference } from './Reference.js';
import { type SecurityRequirements } from './SecurityRequirements.js';
import { type Server } from './Server.js';
import { type Tag } from './Tag.js';

export type OpenApiSpecification = {
  // TODO: explicit versions
  /**
   * REQUIRED. This string MUST be the [version number](https://swagger.io/specification/#versions) of the OpenAPI Specification that the OpenAPI document uses. The openapi field SHOULD be used by tooling to interpret the OpenAPI document. This is not related to the API [info.version](https://swagger.io/specification/#info-version) string.
   */
  openapi: string;
  /**
   * REQUIRED. Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info: Info;
  // TODO: whitelist
  /**
   * The default value for the $schema keyword within [Schema Objects](https://swagger.io/specification/#schema-object) contained within this OAS document. This MUST be in the form of a URI.
   */
  jsonSchemaDialect?: string;
  /**
   * An array of Server Objects, which provide connectivity information to a target server. If the servers property is not provided, or is an empty array, the default value would be a [Server Object](https://swagger.io/specification/#server-object) with a [url](https://swagger.io/specification/#server-url) value of /.
   */
  servers?: Array<Server>;
  /**
   * The available paths and operations for the API.
   */
  paths?: Paths;
  /**
   * The incoming webhooks that MAY be received as part of this API and that the API consumer MAY choose to implement. Closely related to the callbacks feature, this section describes requests initiated other than by an API call, for example by an out of band registration. The key name is a unique string to refer to each webhook, while the (optionally referenced) Path Item Object describes a request that may be initiated by the API provider and the expected responses. An [example](https://github.com/-o-a-i/-open-a-p-i--specification/blob/main/examples/v3.1/webhook-example.yaml) is available.
   */
  webhooks?: PRecord<string, PathItem | Reference>;
  /**
   * An element to hold various schemas for the document.
   */
  components?: Components;
  /**
   * A declaration of which security mechanisms can be used across the API. The list of values includes alternative security requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request. Individual operations can override this definition. To make security optional, an empty security requirement ({}) can be included in the array.
   */
  security?: Array<SecurityRequirements>;
  /**
   * A list of tags used by the document with additional metadata. The order of the tags can be used to reflect on their order by the parsing tools. Not all tags that are used by the [Operation Object](https://swagger.io/specification/#operation-object) must be declared. The tags that are not declared MAY be organized randomly or based on the tools' logic. Each tag name in the list MUST be unique.
   */
  tags?: Tag;
  /**
   * Additional external documentation.
   */
  externalDocs?: ExternalDocumentation;
};
