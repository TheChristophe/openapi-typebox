import { type JSONSchema7 } from 'json-schema';
import type Response from '../openapiClient/openapi/Response.js';
import PathInfo from './PathInfo.js';
import { ImportMetadata, ImportSource } from './importSource.js';

/**
 * Singleton
 * TODO: refactor
 */
export type SchemaEntry = {
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
  sourceFile?: PathInfo;

  importMeta: ImportMetadata;
  /**
   * Raw OpenAPI schema object
   *
   * TODO: carry elsewhere?
   */
  raw: JSONSchema7;
};
type ResponseEntry = {
  /**
   * Name of typescript type
   */
  typeName: string;
  /**
   * Name of typebox validator / schema
   */
  validatorName?: string;
  /**
   * Source file path
   */
  sourceFile: PathInfo;
  /**
   * Pre-made import code
   */
  import: ImportSource;
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

export const context = {
  expectedSchemas: new Map<string, SchemaEntry>(),
  schemas: referenceIndex<SchemaEntry>(),
  responses: referenceIndex<ResponseEntry>(),
};
export default context;
