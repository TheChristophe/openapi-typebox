import {
  Kind,
  type SchemaOptions,
  type Static,
  type TSchema,
  type TUnion,
  Type,
  TypeRegistry,
} from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// TODO: resolve eslint ignores

TypeRegistry.Set(
  'ExtendedOneOf',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (schema: any, value) =>
    1 ===
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    schema.oneOf.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: number, schema_: any) => acc + (Value.Check(schema_, value) ? 1 : 0),
      0,
    ),
);
/**
 * Creates custom typebox code to support the JSON schema keyword 'oneOf'. Based
 * on the suggestion here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 */
const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) =>
  Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf });

export default OneOf;
