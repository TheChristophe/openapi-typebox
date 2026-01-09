import { type TSchema, type TSchemaOptions, Type } from 'typebox';
import { Value } from 'typebox/value';

class OneOfInner<T extends TSchema[]> extends Type.Base<'ExtendedOneOf'> {
  #schemas: T;

  constructor(schemas: T) {
    super();
    this.#schemas = schemas;
  }

  public override Check(value: unknown): value is 'ExtendedOneOf' {
    // match exactly and only one
    return (
      this.#schemas.reduce(
        (acc: number, schema_: TSchema) => acc + (Value.Check(schema_, value) ? 1 : 0),
        0,
      ) === 1
    );
  }
}

const OneOf = <T extends TSchema[]>(oneOf: [...T], options: TSchemaOptions = {}) => {
  const schema = new OneOfInner<T>(oneOf);
  Object.assign(schema, options);
  return schema;
};
//Type.Unsafe<Static<TUnion<T>>>({ ...options, ['~kind']: 'ExtendedOneOf', oneOf });

export default OneOf;
