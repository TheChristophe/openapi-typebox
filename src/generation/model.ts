import { type JSONSchema7Definition, type JSONSchema7Type } from 'json-schema';
import TypeboxEmitter from './model/emitting/TypeboxEmitter.js';
import TypescriptEmitter from './model/emitting/TypescriptEmitter.js';
import generator from './model/generator.js';
import { type EnumSchema, isEnumSchema } from './model/schema-matchers.js';
import typeboxImports from './model/typeboxImports.js';
import { GenerationError } from './utility/errors.js';
import { ImportCollection, type ImportMetadata } from './utility/importSource.js';
import { camelize, sanitizeVariableName, uppercaseFirst } from './utility/sanitization.js';
import template from './utility/templater.js';

const sanitizeModelName = (name: string) => {
  switch (name) {
    // type names that should be avoided
    case 'Error':
      return 'APIErrorModel';
  }

  // TODO: this is a limited subset of actually valid characters
  if (!name[0].match(/[A-Za-z_$]/)) {
    return `API${uppercaseFirst(camelize(name))}`;
  }
  return uppercaseFirst(camelize(name));
};

const valueToEnumEntry = (value: JSONSchema7Type) => {
  if (value === null) {
    return 'Null: null,';
  } else if (typeof value === 'boolean') {
    return value ? 'True: true,' : 'False: false,';
  } else if (typeof value === 'number') {
    return `'${sanitizeVariableName(uppercaseFirst(camelize(`Num${value.toString()}`)))}': ${value.toString()},`;
  } else if (typeof value === 'string') {
    return `'${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}': '${value}',`;
  } else if (typeof value === 'object') {
    throw new Error('Objects and arrays not supported yet for enums');
  }
  throw new Error('valueToEnumName: passed exhaustive if');
};

export const generateEnum = (name: string, schema: EnumSchema) =>
  template.lines(`export const ${name} = {`, schema.enum.map(valueToEnumEntry), '} as const;');

const generateValidator = generator(new TypeboxEmitter());
const generateType = generator(new TypescriptEmitter());

type ModelCodeReference = {
  typeName: string;
  validatorName: string;
} & (
  | {
      type: 'source';
      hasEnum: boolean;
      imports: ImportCollection;
      code: string;
    }
  | {
      type: 'import';
      importMeta: ImportMetadata;
    }
);

/**
 * Generates TypeBox code from a given JSON schema
 */
const schemaToModel = (jsonSchema: JSONSchema7Definition, name: string): ModelCodeReference => {
  const typeName = sanitizeModelName(name);
  if (typeName.length === 0) {
    throw new GenerationError('Tried generating a model with empty name (no title)');
  }

  if (typeof jsonSchema !== 'boolean') {
    jsonSchema.$id ??= typeName;
  }

  const validator = generateValidator(jsonSchema);
  const type = generateType(jsonSchema);

  if (validator.importOnly && type.importOnly && type.imports && validator.imports) {
    // there is only ever 1 type or validator, so there should only be one entry
    if (type.imports instanceof ImportCollection) {
      throw new GenerationError(`Type for ${name} has multiple imports`);
    }
    if (validator.imports instanceof ImportCollection) {
      throw new GenerationError(`Validator for ${name} has multiple imports`);
    }
    return {
      typeName: type.code,
      validatorName: validator.code,
      type: 'import',
      importMeta: {
        type: type.imports,
        validator: validator.imports,
      },
    };
  }

  return {
    typeName: typeName,
    validatorName: `${typeName}Schema`,
    hasEnum: typeof jsonSchema !== 'boolean' && isEnumSchema(jsonSchema),
    imports: new ImportCollection(
      typeboxImports,
      type.imports,
      validator.imports,
      // add oneOf import just in case; if it's unused, it will get removed by linter
      {
        file: {
          internal: true,
          path: '_oneOf.js',
        },
        entries: [
          {
            item: 'OneOf',
            default: true,
          },
        ],
      },
    ),
    type: 'source',
    code: template.lines(
      `export const ${typeName}Schema = ${validator.code};`,
      `export type ${typeName} = ${type.code};`,

      // boolean is weird
      typeof jsonSchema !== 'boolean' &&
        isEnumSchema(jsonSchema) &&
        generateEnum(typeName, jsonSchema),
    ),
  };
};

export default schemaToModel;
