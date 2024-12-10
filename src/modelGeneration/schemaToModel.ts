import {
  type JSONSchema7,
  type JSONSchema7Definition,
  JSONSchema7Type,
  type JSONSchema7TypeName,
} from 'json-schema';
import GenerationError from '../GenerationError.js';
import appContext from '../appContext.js';
import sanitizeVariableName from '../clientGeneration/operationToFunction/helpers/sanitizeVariableName.js';
import { uppercaseFirst } from '../clientGeneration/operationToFunction/helpers/stringManipulation.js';
import configuration from '../configuration.js';
import { deduplicate } from '../deduplicate.js';
import template from '../templater.js';
import MissingReferenceError from './MissingReferenceError.js';
import { CodegenSlice, joinSubSlices } from './joinSlices.js';
import {
  type AllOfSchema,
  type AnyOfSchema,
  type ArraySchema,
  ConstSchema,
  EnumSchema,
  isAllOfSchema,
  isAnyOfSchema,
  isArraySchema,
  isConstSchema,
  isEnumSchema,
  isNotSchema,
  isObjectSchema,
  isOneOfSchema,
  isRef,
  isSchemaWithMultipleTypes,
  isUnknownSchema,
  type MultipleTypesSchema,
  type NotSchema,
  ObjectSchema,
  type OneOfSchema,
  RefSchema,
} from './schema-matchers.js';
import typeboxImportStatements from './typeboxImportStatements.js';

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

export const generateTypeName = (schema: JSONSchema7Definition) => {
  if (typeof schema === 'boolean') {
    return 'Model';
  }

  // TODO: title which may have spaces, handle how?
  return schema['title'] ?? 'Model';
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
    return `${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}: ${value.toString()},`;
  } else if (typeof value === 'string') {
    return `${sanitizeVariableName(uppercaseFirst(camelize(value.toString())))}: '${value}',`;
  } else if (typeof value === 'object') {
    throw new Error('Objects and arrays not supported yet for enums');
  }
  throw new Error('valueToEnumName: passed exhaustive if');
};

const generateEnum = (name: string, schema: EnumSchema) =>
  template.lines(`export const ${name} = {`, schema.enum.map(valueToEnumEntry), '} as const;');

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

type Options = Omit<JSONSchema7, TypeField>;
type OptionEntries = [keyof Options, Options[keyof Options]];
const filterExtraOptions = (schema: JSONSchema7) =>
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

class TypeboxEmitter implements CodeEmitter {
  #formatExtraOptions = (options: Options | undefined = undefined, comma = true) => {
    if (options === undefined) {
      return '';
    }
    return `${comma ? ',' : ''}${JSON.stringify(options)}`;
  };

  #formatOptional = (code: string, required: boolean = false) =>
    required ? code : `Type.Optional(${code})`;

  array(element: string, options?: Options): string {
    return `Type.Array(${element}${this.#formatExtraOptions(options)})`;
  }

  object(children: string[], options?: Options): string {
    return `Type.Object({${children.join(', ')}}${this.#formatExtraOptions(options)})`;
  }

  annotation() {
    return null;
  }
  objectChild(key: string, element: string, required?: boolean) {
    return `"${key}": ${this.#formatOptional(element, required)}`;
  }

  anyOf(code: string[], options?: Options) {
    return `Type.Union([${code.join(', ')}]${this.#formatExtraOptions(options)})`;
  }
  allOf(code: string[], options?: Options) {
    return `Type.Intersect([${code.join(', ')}]${this.#formatExtraOptions(options)})`;
  }
  oneOf(code: string[], options?: Options) {
    return `OneOf([${code.join(', ')}]${this.#formatExtraOptions(options)})`;
  }

  not(code: string, options?: Options) {
    return `Type.Not(${code}${this.#formatExtraOptions(options)})`;
  }

  stringLiteral(value: string, options?: Options) {
    return `Type.Literal("${value}"${this.#formatExtraOptions(options)})`;
  }
  numericLiteral(value: number | boolean, options?: Options) {
    return `Type.Literal(${value.toString()}${this.#formatExtraOptions(options)})`;
  }

  number(options?: Options) {
    return `Type.Number(${this.#formatExtraOptions(options, false)})`;
  }
  string(options?: Options) {
    return `Type.String(${this.#formatExtraOptions(options, false)})`;
  }
  boolean(options?: Options) {
    return `Type.Boolean(${this.#formatExtraOptions(options, false)})`;
  }

  unknown(options?: Options) {
    return `Type.Unknown(${this.#formatExtraOptions(options, false)})`;
  }
  null(options?: Options) {
    return `Type.Null(${this.#formatExtraOptions(options, false)})`;
  }
  never(options?: Options) {
    return `Type.Never(${this.#formatExtraOptions(options, false)})`;
  }

  import(name: string) {
    return {
      code: `${name}Schema`,
      // TODO: resolve imports better than just using root-relative imports
      imports: [`import { ${name}Schema } from "../models/${name}.js";`],
    };
  }
}

class TypescriptEmitter implements CodeEmitter {
  #docString(options: Options): string {
    const sections = [];
    // TODO: why options can == undefined according to ts?
    if ('description' in options && options.description !== undefined) {
      sections.push(` * ${options.description.replaceAll('\n', '\n * ')}`);
    }
    if ('example' in options && options.example !== undefined) {
      sections.push(` * Example: ${JSON.stringify(options.example)}`);
    }
    if ('deprecated' in options && options.deprecated) {
      sections.push(' * @deprecated');
    }
    if (sections.length > 0) {
      return template.lines('/**', sections.join('\n  *\n'), ' */');
    }
    return '';
  }

  array(element: string) {
    // TODO: options
    return `Array<${element}>`;
  }

  object(children: string[]) {
    // TODO: options
    return template.lines('{', children.join(',\n'), '}');
  }

  annotation(options: Options) {
    return this.#docString(options);
  }
  objectChild(key: string, element: string, required?: boolean) {
    return template.lines(`${key}${required ? '' : '?'}: ${element}`);
  }

  anyOf(code: string[]) {
    // TODO: this can validate against one or more types
    return code.join(' | ');
  }
  oneOf(code: string[]) {
    // TODO: this can validate against exactly only one type
    return code.join(' | ');
  }
  allOf(code: string[]) {
    return code.join(' & ');
  }

  not() {
    // this is how typebox handles it
    return 'unknown';
  }

  stringLiteral(value: string) {
    // escape '
    return `'${value.replaceAll("'", "\\'")}'`;
  }
  numericLiteral(value: number | boolean) {
    return value.toString();
  }

  number() {
    return 'number';
  }
  string() {
    return 'string';
  }
  boolean() {
    return 'boolean';
  }

  unknown() {
    return 'unknown';
  }
  null() {
    return 'null';
  }
  never() {
    return 'never';
  }

  import(name: string) {
    return {
      code: name,
      // TODO: resolve imports better than just using root-relative imports
      imports: [`import { type ${name} } from "../models/${name}.js";`],
    };
  }
}

const generator = (emitter: CodeEmitter) => {
  const resolveObjectReference = (schema: RefSchema): CodegenSlice => {
    const entry = appContext.schemas.lookup(schema['$ref']);

    if (entry == null) {
      throw new MissingReferenceError(schema['$ref']);
    }

    // TODO: use other source of truth for imports instead of building manually
    //       it includes import for schema & type
    return emitter.import(entry.typeName);
  };

  const parseObject = (schema: ObjectSchema): CodegenSlice => {
    const { properties, required } = schema;
    if (properties === undefined) {
      return { code: emitter.unknown() };
    }

    const { code, imports } = joinSubSlices(
      Object.entries(properties).map(([property, subSchema]) => {
        const type = generate(subSchema);

        return {
          code: template.lines(
            // TODO: better way to handle docstrings
            typeof subSchema === 'object' && subSchema != null && !Array.isArray(subSchema)
              ? emitter.annotation(filterExtraOptions(subSchema))
              : null,
            emitter.objectChild(property, type.code, required?.includes(property)),
          ),
          imports: type.imports,
        };
      }),
    );

    return {
      code: emitter.object(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseEnum = (schema: EnumSchema): CodegenSlice => {
    const { code, imports } = joinSubSlices(schema.enum.map((t) => parseLiteral(t)));

    return {
      code: emitter.anyOf(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseConst = (schema: ConstSchema): CodegenSlice => {
    return parseLiteral(schema.const, filterExtraOptions(schema));
  };

  const parseUnknown = (): CodegenSlice => ({
    code: emitter.unknown(),
  });

  const parseLiteral = (type: JSONSchema7Type, options?: Options): CodegenSlice => {
    if (Array.isArray(type)) {
      const { code, imports } = joinSubSlices(type.map((t) => parseLiteral(t)));

      return {
        code: emitter.anyOf(code, options),
        imports: imports,
      };
    }
    if (type === null) {
      return {
        code: emitter.null(options),
      };
    } else if (typeof type === 'string') {
      return {
        code: emitter.stringLiteral(type, options),
      };
    } else if (typeof type === 'number' || typeof type === 'boolean') {
      return {
        code: emitter.numericLiteral(type, options),
      };
    }
    const { code, imports } = joinSubSlices(
      Object.entries(type).map(([property, subSchema]) => {
        const output = parseLiteral(subSchema);

        return {
          code: template.lines(
            // TODO: better way to handle docstrings
            typeof subSchema === 'object' && subSchema != null && !Array.isArray(subSchema)
              ? emitter.annotation(filterExtraOptions(subSchema))
              : null,
            emitter.objectChild(property, output.code, true),
          ),
          imports: output.imports,
        };
      }),
    );

    return {
      code: emitter.object(code, options),
      imports: imports,
    };
  };

  const parseAnyOf = (schema: AnyOfSchema): CodegenSlice => {
    const { code, imports } = joinSubSlices(schema.anyOf.map(generate));

    return {
      code: emitter.anyOf(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseAllOf = (schema: AllOfSchema): CodegenSlice => {
    const { code, imports } = joinSubSlices(schema.allOf.map(generate));

    return {
      code: emitter.oneOf(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseOneOf = (schema: OneOfSchema): CodegenSlice => {
    const { code, imports } = joinSubSlices(schema.oneOf.map(generate));

    return {
      code: emitter.oneOf(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseNot = (schema: NotSchema): CodegenSlice => {
    const { code, imports } = generate(schema.not);

    return {
      code: emitter.not(code, filterExtraOptions(schema)),
      imports: imports,
    };
  };

  const parseArray = (schema: ArraySchema): CodegenSlice => {
    if (Array.isArray(schema.items)) {
      const { code, imports } = joinSubSlices(schema.items.map(generate));

      return {
        code: emitter.array(emitter.anyOf(code), filterExtraOptions(schema)),
        imports: imports,
      };
    }

    const output = schema.items ? generate(schema.items) : undefined;
    const itemsType = output?.code ?? emitter.unknown();
    return {
      code: emitter.array(itemsType, filterExtraOptions(schema)),
      imports: output?.imports,
    };
  };

  const parseWithMultipleTypes = (schema: MultipleTypesSchema): CodegenSlice => {
    const { code, imports } = joinSubSlices(
      schema.type.map((typeName) => parseSchemaType(typeName, schema)),
    );
    return {
      code: emitter.anyOf(code, filterExtraOptions(schema)),
      imports,
    };
  };

  const parseSchemaType = (type: JSONSchema7TypeName, schema: JSONSchema7): CodegenSlice => {
    switch (type) {
      case 'number':
      case 'integer':
        return {
          code: emitter.number(filterExtraOptions(schema)),
        };
      case 'string':
        return {
          code: emitter.string(filterExtraOptions(schema)),
        };
      case 'boolean':
        return {
          code: emitter.boolean(filterExtraOptions(schema)),
        };
      case 'null':
        return {
          code: emitter.null(filterExtraOptions(schema)),
        };
      case 'object':
        return parseObject(schema as ObjectSchema);
      case 'array':
        return parseArray(schema as ArraySchema);
    }
  };

  /**
   * Takes the root schema and recursively collects the corresponding types
   * for it. Returns the matching typebox code representing the schema.
   *
   * @throws GenerationError if an unexpected schema was given
   */
  const generate = (schema: JSONSchema7Definition): CodegenSlice => {
    if (typeof schema === 'boolean') {
      return { code: JSON.stringify(schema) };
    }

    if (typeof schema === 'object' && 'nullable' in schema) {
      if (configuration.strict) {
        throw new GenerationError("'nullable: true' is invalid in OpenAPI 3.1.0.");
      }
      console.warn(
        "Warning: 'nullable: true' is invalid in OpenAPI 3.1.0 and is only supported for compatibility reasons.",
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nullable, ...rest } = schema;
      const { code, imports } = generate(rest);
      return {
        code: emitter.anyOf([code, emitter.null()]),
        imports,
      };
    }

    if (isRef(schema)) {
      return resolveObjectReference(schema);
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
      return parseUnknown();
    } else if (schema.type !== undefined && !Array.isArray(schema.type)) {
      return parseSchemaType(schema.type, schema);
    }
    if (configuration.strict) {
      throw new GenerationError(`Unsupported schema: ${JSON.stringify(schema)}`);
    }
    console.warn(`Unsupported schema: ${JSON.stringify(schema)}, defaulting to unknown`);
    return parseUnknown();
  };

  return generate;
};

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
