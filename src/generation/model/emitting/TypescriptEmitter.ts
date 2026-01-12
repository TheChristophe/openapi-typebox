import { type SchemaEntry } from '../../utility/context.js';
import { needsSanitization } from '../../utility/sanitization.js';
import template from '../../utility/templater.js';
import { type ImportSlice } from '../joinSlices.js';
import { type CodeEmitter, type Options } from './CodeEmitter.js';

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
    if (needsSanitization(key)) {
      // TODO: this still seems unsafe
      key = `'${key.replaceAll("'", "\\'")}'`;
    }
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

  import(metadata: SchemaEntry): ImportSlice {
    return {
      code: metadata.typeName,
      imports: metadata.importMeta.type,
      importOnly: true,
    };
  }
}

export default TypescriptEmitter;
