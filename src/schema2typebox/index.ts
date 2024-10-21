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
import { type CodegenSlice, joinBatch } from './joinBatch.js';
import { lookupReference } from '../referenceDictionary.js';
import typeboxImportStatements from './typeboxImportStatements.js';
import template from '../templater.js';
import { uppercaseFirst } from '../clientGeneration/operationToFunction/helpers/stringManipulation.js';
import sanitizeVariableName from '../clientGeneration/operationToFunction/helpers/sanitizeVariableName.js';

const sanitizeModelName = (name: string) => {
  switch (name) {
    // type names that should be avoided
    case 'Error':
      return 'APIErrorModel';
  }

  // TODO: this is a limited subset of actually valid characters
  if (!name[0].match(/[A-Za-z_$]/)) {
    return `API${name}`;
  }
  return name;
};
const options = (schemaOptions: string | undefined) => (schemaOptions ? `,${schemaOptions}` : '');

/**
 * https://stackoverflow.com/a/2970667
 * @param str
 */
const camelize = (str: string) =>
  str
    .replaceAll(/[^a-zA-Z0-9_\s]/g, '')
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    )
    .replaceAll(/\s+/g, '');

const valueToEnumEntry = (value: JSONSchema7Type) => {
  if (value == null) {
    return 'Null: null,';
  } else if (typeof value === 'boolean') {
    return value ? 'True: true,' : 'False: false,';
  } else if (typeof value === 'number') {
    return `${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}: ${value.toString()},`;
  } else if (typeof value === 'string') {
    return `${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}: '${value}',`;
  } else if (typeof value === 'object') {
    throw new Error('Objects and arrays not supported yet for enums');
  }
  throw new Error('valueToEnumName: passed exhaustive if');
};

const generateEnum = (name: string, schema: EnumSchema) =>
  template.lines(`const ${name} = {`, schema.enum.map(valueToEnumEntry), '} as const;');

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = (jsonSchema: JSONSchema7Definition, name?: string) => {
  const exportedName = sanitizeModelName(name ?? createExportNameForSchema(jsonSchema));
  // Ensuring that generated typebox code will contain an '$id' field.
  // see: https://github.com/xddq/schema2typebox/issues/32
  if (typeof jsonSchema !== 'boolean' && jsonSchema.$id === undefined) {
    jsonSchema.$id = exportedName;
  }
  const schema = collect(jsonSchema);
  if (exportedName.length === 0) {
    throw new Error("Can't create exported type for a name with length 0.");
  }
  const exportType = uppercaseFirst(exportedName);

  return template.lines(
    typeboxImportStatements,

    schema.extraImports && schema.extraImports.join('\n'),
    schema.code.includes('OneOf([') && "import OneOf from './_oneOf.ts';",

    `export const ${exportedName}Schema = ${schema.code};`,
    `type ${exportType} = Static<typeof ${exportedName}Schema>;`,

    // boolean is weird
    !isBoolean(jsonSchema) && isEnumSchema(jsonSchema) && generateEnum(exportType, jsonSchema),

    `export default ${exportedName};`,
  );
};

const resolveObjectReference = (schema: RefSchema): CodegenSlice => {
  const entry = lookupReference(schema['$ref']);

  if (entry == null) {
    throw new MissingReferenceError(schema['$ref']);
  }

  return {
    code: `${entry.name}Schema`,
    // TODO: resolve imports better than just using root-relative imports
    extraImports: [`import { ${entry.name}Schema } from "../models/${entry.name}.js";`],
  };
};

/**
 * Takes the root schema and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schema.
 *
 * @throws Error if an unexpected schema (one with no matching parser) was given
 */
export const collect = (schema: JSONSchema7Definition): CodegenSlice => {
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

export const createExportNameForSchema = (schema: JSONSchema7Definition) => {
  if (isBoolean(schema)) {
    return 'T';
  }

  // TODO: title which may have spaces, handle how?
  return schema['title'] ?? 'T';
};

const addOptionalModifier = (
  code: string,
  propertyName: string,
  requiredProperties: JSONSchema7['required'],
) => (requiredProperties?.includes(propertyName) ? code : `Type.Optional(${code})`);

export const parseObject = (schema: ObjectSchema): CodegenSlice => {
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
  const output: CodegenSlice[] = attributes.map(([propertyName, schema]) => {
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

export const parseEnum = (schema: EnumSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.enum.map(parseType), ',');

  return {
    code: `Type.Union([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseConst = (schema: ConstSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.const)) {
    const { code, extraImports } = joinBatch(schema.const.map(parseType), '\n');

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
    // eslint issues with ts version
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    code: `Type.Literal(${schema.const}${options(schemaOptions)})`,
  };
};

export const parseUnknown = (/*_: UnknownSchema*/): CodegenSlice => ({
  code: 'Type.Unknown()',
});

export const parseType = (type: JSONSchema7Type): CodegenSlice => {
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
      code: `Type.Literal(${type.toString()})`,
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

export const parseAnyOf = (schema: AnyOfSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.anyOf.map(collect), ',\n');

  return {
    code: `Type.Union([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseAllOf = (schema: AllOfSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.allOf.map(collect), ',\n');

  return {
    code: `Type.Intersect([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseOneOf = (schema: OneOfSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = joinBatch(schema.oneOf.map(collect), ',\n');

  return {
    code: `OneOf([${code}]${options(schemaOptions)})`,
    extraImports,
  };
};

export const parseNot = (schema: NotSchema): CodegenSlice => {
  const schemaOptions = parseSchemaOptions(schema);
  const { code, extraImports } = collect(schema.not);

  return {
    code: `Type.Not(${code}${options(schemaOptions)})`,
    extraImports: extraImports,
  };
};

export const parseArray = (schema: ArraySchema): CodegenSlice => {
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

export const parseWithMultipleTypes = (schema: MultipleTypesSchema): CodegenSlice => {
  const { code, extraImports } = joinBatch(
    schema.type.map((typeName) => parseTypeName(typeName, schema)),
    ',\n',
  );
  return {
    code: `Type.Union([${code}])`,
    extraImports,
  };
};

export const parseTypeName = (
  type: JSONSchema7TypeName,
  schema: JSONSchema7 = {},
): CodegenSlice => {
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

const parseSchemaOptions = (schema: JSONSchema7): string | undefined => {
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
