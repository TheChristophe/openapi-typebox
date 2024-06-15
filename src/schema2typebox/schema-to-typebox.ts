/**
 * MIT License
 *
 * Copyright (c) 2023 Pierre Dahmani
 * Copyright (c) 2024 Christophe
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { isBoolean } from 'fp-ts/lib/boolean.js';
import { isNumber } from 'fp-ts/lib/number.js';
import { isString } from 'fp-ts/lib/string.js';
import {
  type JSONSchema7,
  type JSONSchema7Definition,
  type JSONSchema7Type,
  type JSONSchema7TypeName,
} from 'json-schema';
import {
  type AllOfSchema,
  type AnyOfSchema,
  type ArraySchema,
  type ConstSchema,
  type EnumSchema,
  isAllOfSchema,
  isAnyOfSchema,
  isArraySchema,
  isConstSchema,
  isEnumSchema,
  isNotSchema,
  isNullType,
  isObjectSchema,
  isOneOfSchema,
  isRef,
  isSchemaWithMultipleTypes,
  isUnknownSchema,
  type MultipleTypesSchema,
  type NotSchema,
  type ObjectSchema,
  type OneOfSchema,
  type RefSchema,
} from './schema-matchers.js';
import MissingReferenceError from './MissingReferenceError.js';
import { type Code, type Entry, joinBatch } from './helperTypes.js';

/**
 * Singleton
 * TODO: refactor
 */
type ObjectEntry = {
  name: string;
  sourceFile: string;
};
export const knownReferences: Record<string, ObjectEntry> = {};

const options = (schemaOptions: string | undefined) => (schemaOptions ? `,${schemaOptions}` : '');

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = (jsonSchema: JSONSchema7Definition) => {
  const exportedName = createExportNameForSchema(jsonSchema);
  // Ensuring that generated typebox code will contain an '$id' field.
  // see: https://github.com/xddq/schema2typebox/issues/32
  if (typeof jsonSchema !== 'boolean' && jsonSchema.$id === undefined) {
    jsonSchema.$id = exportedName;
  }
  const schema = collect(jsonSchema);
  const exportedType = createExportedTypeForName(exportedName);

  return `${createImportStatements()}
${schema.extraImports?.join('\n') ?? ''}
${schema.code.includes('OneOf([') ? createOneOfTypeboxSupportCode() : ''}
${exportedType}
export const ${exportedName} = ${schema.code}`;
};

const resolveObjectReference = (schema: RefSchema): Entry => {
  const name = createExportNameForSchema(schema);

  if (!(name in knownReferences)) {
    throw new MissingReferenceError(name);
  }

  return {
    code: name,
    // TODO: resolve imports better than just using root-relative imports
    extraImports: [`import ${name} from "../models/${name}.js";`],
  };
};

/**
 * Takes the root schema and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schema.
 *
 * @throws Error if an unexpected schema (one with no matching parser) was given
 */
export const collect = (schema: JSONSchema7Definition): Entry => {
  if (isBoolean(schema)) {
    return { code: JSON.stringify(schema) };
  } else if (isRef(schema)) {
    return resolveObjectReference(schema);
    // TODO: boolean schema support..?
  } else if (isObjectSchema(schema)) {
    return parseObject(schema);
  } else if (isEnumSchema(schema)) {
    return parseEnum(schema);
  } else if (isAnyOfSchema(schema)) {
    return parseAnyOf(schema);
  } else if (isAllOfSchema(schema)) {
    return parseAllOf(schema);
  } else if (isOneOfSchema(schema)) {
    return parseOneOf(schema);
  } else if (isNotSchema(schema)) {
    return parseNot(schema);
  } else if (isArraySchema(schema)) {
    return parseArray(schema);
  } else if (isSchemaWithMultipleTypes(schema)) {
    return parseWithMultipleTypes(schema);
  } else if (isConstSchema(schema)) {
    return parseConst(schema);
  } else if (isUnknownSchema(schema)) {
    return parseUnknown(/*schema*/);
  } else if (schema.type !== undefined && !Array.isArray(schema.type)) {
    return parseTypeName(schema.type, schema);
  }
  throw new Error(
    `Unsupported schema. Did not match any type of the parsers. Schema was: ${JSON.stringify(
      schema,
    )}`,
  );
};

/**
 * Creates the imports required to build the typebox code.
 * Unused imports (e.g. if we don't need to create a TypeRegistry for OneOf
 * types) are stripped in a postprocessing step.
 */
export const createImportStatements = () => {
  return [
    'import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from "@sinclair/typebox"',
    'import { Value } from "@sinclair/typebox/value";',
  ].join('\n');
};

export const createExportNameForSchema = (schema: JSONSchema7Definition) => {
  if (isBoolean(schema)) {
    return 'T';
  }

  if (isRef(schema)) {
    return schema['$ref'].substring(schema['$ref'].lastIndexOf('/') + 1);
  }

  return schema['title'] ?? 'T';
};

/**
 * Creates custom typebox code to support the JSON schema keyword 'oneOf'. Based
 * on the suggestion here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 *
 * TODO: single instance of this
 */
export const createOneOfTypeboxSupportCode = (): Code =>
  [
    "TypeRegistry.Set('ExtendedOneOf', (schema: any, value) => 1 === schema.oneOf.reduce((acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0), 0))",
    "const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf })",
  ].reduce((acc, curr) => `${acc + curr}\n\n`, '');

/**
 * @throws Error
 */
const createExportedTypeForName = (exportedName: string) => {
  if (exportedName.length === 0) {
    throw new Error("Can't create exported type for a name with length 0.");
  }
  const typeName = `${exportedName.charAt(0).toUpperCase()}${exportedName.slice(1)}`;
  return `export type ${typeName} = Static<typeof ${exportedName}>`;
};

const addOptionalModifier = (
  code: Code,
  propertyName: string,
  requiredProperties: JSONSchema7['required'],
) => (requiredProperties?.includes(propertyName) ? code : `Type.Optional(${code})`);

export const parseObject = (schema: ObjectSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const properties = schema.properties;
  const requiredProperties = schema.required;
  if (properties === undefined) {
    return {
      code: 'Type.Unknown()',
    };
  }
  const attributes = Object.entries(properties);
  // NOTE: Just always quote the propertyName here to make sure we don't run
  // into issues as they came up before
  // [here](https://github.com/xddq/schema2typebox/issues/45) or
  // [here](https://github.com/xddq/schema2typebox/discussions/35). Since we run
  // prettier as "postprocessor" anyway we will also ensure to still have a sane
  // output without any unnecessarily quotes attributes.
  const output: Entry[] = attributes.map(([propertyName, schema]) => {
    const parsed = collect(schema);

    return {
      code: `"${propertyName}": ${addOptionalModifier(
        parsed.code,
        propertyName,
        requiredProperties,
      )}`,
      extraImports: parsed.extraImports,
    };
  });

  const { code, extraImports } = joinBatch(output, ',\n');

  return {
    code: `Type.Object({${code}}${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseEnum = (schema: EnumSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.enum.map(parseType), ',');

  return {
    code: `Type.Union([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseConst = (schema: ConstSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.const)) {
    const { code, extraImports } = joinBatch(
      schema.const.map((schema) => parseType(schema)),
      '\n',
    );

    return {
      code: `Type.Union([${code}]${options(schemaOptions)})`,
      extraImports,
    };
  }

  // TODO: case where const is object..?
  if (typeof schema.const === 'object') {
    return {
      code: 'Type.Todo(const with object)',
    };
  }
  if (typeof schema.const === 'string') {
    return {
      code: `Type.Literal("${schema.const}"${options(schemaOptions)})`,
    };
  }
  return {
    code: `Type.Literal(${schema.const}${options(schemaOptions)})`,
  };
};

export const parseUnknown = (/*_: UnknownSchema*/): Entry => ({
  code: 'Type.Unknown()',
});

export const parseType = (type: JSONSchema7Type): Entry => {
  if (isString(type)) {
    return {
      code: `Type.Literal("${type}")`,
    };
  } else if (isNullType(type)) {
    return {
      code: 'Type.Null()',
    };
  } else if (isNumber(type) || isBoolean(type)) {
    return {
      code: `Type.Literal(${type})`,
    };
  } else if (Array.isArray(type)) {
    const { code, extraImports } = joinBatch(type.map(parseType), ',');
    return {
      code: `Type.Array([${code}])`,
      extraImports,
    };
  }
  const { code, extraImports } = joinBatch(
    Object.entries(type).map(([key, value]) => {
      const output = parseType(value);
      return {
        code: `${key}: ${output.code}`,
        extraImports: output.extraImports,
      };
    }),
    ',\n',
  );

  return {
    code: `Type.Object({${code}})`,
    extraImports,
  };
};

export const parseAnyOf = (schema: AnyOfSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.anyOf.map(collect), ',\n');

  return {
    code: `Type.Union([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseAllOf = (schema: AllOfSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.allOf.map(collect), ',\n');

  return {
    code: `Type.Intersect([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseOneOf = (schema: OneOfSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.oneOf.map(collect), ',\n');

  return {
    code: `OneOf([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseNot = (schema: NotSchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = collect(schema.not);

  return {
    code: `Type.Not(${code}${options(schemaOptions)})`,
    extraImports: extraImports,
  };
};

export const parseArray = (schema: ArraySchema): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.items)) {
    const { code, extraImports } = joinBatch(schema.items.map(collect), ',\n');

    return {
      code: `Type.Array(Type.Union(${code})${options(schemaOptions)})`,
      extraImports,
    };
  }

  const output = schema.items ? collect(schema.items) : undefined;
  const itemsType = output ? output.code : 'Type.Unknown()';
  return {
    code: `Type.Array(${itemsType}${options(schemaOptions)})`,
    extraImports: output?.extraImports,
  };
};

export const parseWithMultipleTypes = (schema: MultipleTypesSchema): Entry => {
  const { code, extraImports } = joinBatch(
    schema.type.map((typeName) => parseTypeName(typeName, schema)),
    ',\n',
  );
  return {
    code: `Type.Union([${code}])`,
    extraImports,
  };
};

export const parseTypeName = (type: JSONSchema7TypeName, schema: JSONSchema7 = {}): Entry => {
  const schemaOptions = parseSchemaOptions(schema);
  switch (type) {
    case 'number':
    case 'integer':
      return {
        code: `Type.Number(${schemaOptions ?? ''})`,
      };
    case 'string':
      return {
        code: `Type.String(${schemaOptions ?? ''})`,
      };
    case 'boolean':
      return {
        code: `Type.Boolean(${schemaOptions ?? ''})`,
      };
    case 'null':
      return {
        code: `Type.Null(${schemaOptions ?? ''})`,
      };
    case 'object':
      return parseObject(schema as ObjectSchema);
    case 'array':
      return parseArray(schema as ArraySchema);
  }
};

const parseSchemaOptions = (schema: JSONSchema7): Code | undefined => {
  const properties = Object.entries(schema).filter(
    ([key]) =>
      // NOTE: To be fair, not sure if we should filter out the title. If this
      // makes problems one day, think about not filtering it.
      key !== 'title' &&
      key !== 'type' &&
      key !== 'items' &&
      key !== 'allOf' &&
      key !== 'anyOf' &&
      key !== 'oneOf' &&
      key !== 'not' &&
      key !== 'properties' &&
      key !== 'required' &&
      key !== 'const' &&
      key !== 'enum',
  );
  if (properties.length === 0) {
    return undefined;
  }
  const result = Object.fromEntries(properties);
  return JSON.stringify(result);
};
