import { type SchemaEntry } from '../../utility/context.js';
import { type ImportSlice } from '../joinSlices.js';
import { type CodeEmitter, type Options } from './CodeEmitter.js';

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

  import(metadata: SchemaEntry): ImportSlice {
    return {
      code: metadata.validatorName,
      imports: metadata.importMeta.validator,
      importOnly: true,
    };
  }
}

export default TypeboxEmitter;
