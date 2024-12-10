import type JsonSchema from './openapi/JsonSchema.js';
import type Response from './openapi/Response.js';

/**
 * Singleton
 * TODO: refactor
 */
type SchemaEntry = {
  /**
   * Name of typescript type
   */
  typeName: string;
  /**
   * Name of typebox validator / schema
   */
  validatorName: string;
  /**
   * Source file path
   */
  sourceFile: string;
  /**
   * Pre-made import code
   */
  import: string;
  /**
   * Raw OpenAPI schema object
   *
   * TODO: carry elsewhere?
   */
  raw: JsonSchema;
};
type ResponseEntry = {
  /**
   * Name of typescript type
   */
  typeName: string;
  /**
   * Source file path
   */
  sourceFile: string;
  /**
   * Pre-made import code
   */
  import: string;
  /**
   * Raw OpenAPI response object
   *
   * TODO: carry elsewhere?
   */
  raw: Response;
};

const referenceIndex = <ReferenceT>() => {
  const index: Record<string, ReferenceT> = {};
  const insert = (ref: string, entry: ReferenceT) => {
    index[ref] = entry;
  };
  const lookup = (ref: string): ReferenceT | undefined => index[ref];
  return { index, add: insert, lookup };
};

export const appContext = {
  schemas: referenceIndex<SchemaEntry>(),
  responses: referenceIndex<ResponseEntry>(),
};
export default appContext;
