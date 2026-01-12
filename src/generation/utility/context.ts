import { type JSONSchema7 } from 'json-schema';
import { type Response } from '../../openapi/Response.js';
import { type ImportMetadata } from './importSource.js';

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

  importMeta: ImportMetadata;
  /**
   * Raw OpenAPI schema object
   *
   * TODO: carry elsewhere?
   */
  raw: JSONSchema7;
};
export type ResponseEntry = {
  /**
   * Name of typescript type
   */
  typeName: string;
  /**
   * Name of typebox validator / schema
   */
  validatorName?: string;

  /**
   * Pre-made import code
   */
  importMeta: Pick<ImportMetadata, 'type'> & Pick<Partial<ImportMetadata>, 'validator'>;
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
