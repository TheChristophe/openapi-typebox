import { type JSONSchema7 } from 'json-schema';
import { CodegenSlice } from './joinSlices.js';

const typeFields = [
  'title',
  'type',
  'items',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'properties',
  'required',
  'const',
  'enum',
] as const;
type TypeField = (typeof typeFields)[number];
export type Options = Omit<JSONSchema7, TypeField>;
type OptionEntries = [keyof Options, Options[keyof Options]];
export const filterExtraOptions = (schema: JSONSchema7) =>
  Object.fromEntries(
    Object.entries(schema).filter(
      ([key]) => !(typeFields as readonly string[]).includes(key),
    ) as OptionEntries[],
  ) as Options;

type CodeEmitter = {
  array: (element: string, options?: Options) => string;
  object: (children: string[], options?: Options) => string;
  annotation: (options: Options) => string | null;
  objectChild: (key: string, element: string, required?: boolean) => string;

  anyOf: (code: string[], options?: Options) => string;
  allOf: (code: string[], options?: Options) => string;
  oneOf: (code: string[], options?: Options) => string;

  not: (code: string, options?: Options) => string;

  stringLiteral: (value: string, options?: Options) => string;
  numericLiteral: (value: number | boolean, options?: Options) => string;

  number: (options?: Options) => string;
  string: (options?: Options) => string;
  boolean: (options?: Options) => string;

  unknown: (options?: Options) => string;
  null: (options?: Options) => string;
  never: (options?: Options) => string;

  import: (name: string) => CodegenSlice;
};

export default CodeEmitter;
