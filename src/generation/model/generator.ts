import {
  type JSONSchema7,
  type JSONSchema7Definition,
  JSONSchema7Type,
  type JSONSchema7TypeName,
} from 'json-schema';
import configuration from '../utility/configuration.js';
import context from '../utility/context.js';
import { GenerationError, MissingReferenceError } from '../utility/errors.js';
import { default as rootLogger } from '../utility/logger.js';
import template from '../utility/templater.js';
import CodeEmitter, { filterExtraOptions, Options } from './emitting/CodeEmitter.js';
import { CodegenSlice, ImportSlice, joinSubSlices, SourceSlice } from './joinSlices.js';
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

const logger = rootLogger.child({ context: 'generator' });

let nullableWarningSent = false;
const nullableWarning = () => {
  if (!nullableWarningSent) {
    logger.warn(
      "Warning: 'nullable: true' is invalid in OpenAPI 3.1.0 and is only supported for compatibility reasons.\nPlease migrate to using 'type: [<type>, \"null\"]' instead.\nThis warning will only be sent once.",
    );
    nullableWarningSent = true;
  }
};

const generator = (emitter: CodeEmitter) => {
  const resolveObjectReference = (schema: RefSchema): ImportSlice => {
    const entry = context.schemas.lookup(schema['$ref']);

    if (entry == null) {
      throw new MissingReferenceError(schema['$ref']);
    }

    return emitter.import(entry);
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
      code: emitter.allOf(code, filterExtraOptions(schema)),
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
      imports: imports,
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
  const generate = (schema: JSONSchema7Definition): SourceSlice => {
    if (typeof schema === 'boolean') {
      return { code: JSON.stringify(schema) };
    }

    if (typeof schema === 'object' && 'nullable' in schema) {
      if (configuration.strict) {
        throw new GenerationError("'nullable: true' is invalid in OpenAPI 3.1.0.");
      }
      nullableWarning();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nullable, ...rest } = schema;
      const { code, imports } = generate(rest);
      return {
        code: emitter.anyOf([code, emitter.null()]),
        imports,
      };
    }

    /*if (isRef(schema)) {
      return resolveObjectReference(schema);
    } else */ if (isObjectSchema(schema)) {
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
    logger.warn('Unsupported schema, defaulting to unknown', { schema });
    return parseUnknown();
  };

  return (schema: JSONSchema7Definition): SourceSlice => {
    if (typeof schema === 'boolean') {
      return { code: JSON.stringify(schema) };
    }

    if (isRef(schema)) {
      return {
        ...resolveObjectReference(schema),
        importOnly: true,
      };
    }
    return generate(schema);
  };
};

export default generator;
