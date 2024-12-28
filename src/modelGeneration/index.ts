import { type JSONSchema7Definition, JSONSchema7Type } from 'json-schema';
import GenerationError from '../GenerationError.js';
import { deduplicate } from '../deduplicate.js';
import sanitizeVariableName from '../functionGeneration/helpers/sanitizeVariableName.js';
import { uppercaseFirst } from '../functionGeneration/helpers/stringManipulation.js';
import template from '../templater.js';
import TypeboxEmitter from './TypeboxEmitter.js';
import TypescriptEmitter from './TypescriptEmitter.js';
import generator from './generator.js';
import { EnumSchema, isEnumSchema } from './schema-matchers.js';
import typeboxImportStatements from './typeboxImportStatements.js';

const generateTypeName = (schema: JSONSchema7Definition) => {
  if (typeof schema === 'boolean') {
    return 'Model';
  }

  // TODO: title which may have spaces, handle how?
  return schema['title'] ?? 'Model';
};

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
  if (value === null) {
    return 'Null: null,';
  } else if (typeof value === 'boolean') {
    return value ? 'True: true,' : 'False: false,';
  } else if (typeof value === 'number') {
    return `${sanitizeVariableName(uppercaseFirst(camelize(`Num${value.toString()}`)))}: ${value.toString()},`;
  } else if (typeof value === 'string') {
    return `${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}: '${value}',`;
  } else if (typeof value === 'object') {
    throw new Error('Objects and arrays not supported yet for enums');
  }
  throw new Error('valueToEnumName: passed exhaustive if');
};

export const generateEnum = (name: string, schema: EnumSchema) =>
  template.lines(`export const ${name} = {`, schema.enum.map(valueToEnumEntry), '} as const;');

const generateValidator = generator(new TypeboxEmitter());
const generateType = generator(new TypescriptEmitter());

/**
 * Generates TypeBox code from a given JSON schema
 */
const schemaToModel = (
  jsonSchema: JSONSchema7Definition,
  name: string = generateTypeName(jsonSchema),
) => {
  const typeName = uppercaseFirst(sanitizeModelName(name));
  if (typeName.length === 0) {
    throw new GenerationError('Tried generating a model with empty name (no title)');
  }

  if (typeof jsonSchema !== 'boolean') {
    jsonSchema.$id ??= typeName;
  }

  const validator = generateValidator(jsonSchema);
  const type = generateType(jsonSchema);

  return {
    typeName,
    validatorName: `${typeName}Schema`,
    hasEnum: typeof jsonSchema !== 'boolean' && isEnumSchema(jsonSchema),
    imports: deduplicate([
      typeboxImportStatements,

      ...(validator.imports ?? []),
      ...(type.imports ?? []),
      "import OneOf from '../_oneOf.js';",
    ]),
    code: template.lines(
      `export const ${typeName}Schema = ${validator.code};`,
      //`type ${typeName} = Static<typeof ${typeName}Schema>;`,
      `export type ${typeName} = ${type.code};`,

      // boolean is weird
      typeof jsonSchema !== 'boolean' &&
        isEnumSchema(jsonSchema) &&
        generateEnum(typeName, jsonSchema),
    ),
  };
};

export default schemaToModel;
