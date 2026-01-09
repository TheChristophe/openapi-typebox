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

/**
 * Type guards for determining the type of schema we are currently working on.
 * E.g. an anyOf schema object, oneOf, enum, const, etc..
 */
import {
  type JSONSchema7,
  type JSONSchema7Definition,
  type JSONSchema7TypeName,
} from 'json-schema';

type RequireFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type ReplaceField<T, K extends keyof T, N> = Omit<T, K> & Record<K, N>;

export type RefSchema = RequireFields<JSONSchema7, '$ref'>;
export const isRef = (schema: JSONSchema7): schema is RefSchema => schema['$ref'] !== undefined;

export type ObjectSchema = ReplaceField<JSONSchema7, 'type', 'object'>;
export const isObjectSchema = (schema: JSONSchema7): schema is ObjectSchema =>
  schema['type'] !== undefined && schema['type'] === 'object';

export type EnumSchema = RequireFields<JSONSchema7, 'enum'>;
export const isEnumSchema = (schema: JSONSchema7): schema is EnumSchema =>
  schema['enum'] !== undefined;

export type AnyOfSchema = RequireFields<JSONSchema7, 'anyOf'>;
export const isAnyOfSchema = (schema: JSONSchema7): schema is AnyOfSchema =>
  schema['anyOf'] !== undefined;

export type AllOfSchema = RequireFields<JSONSchema7, 'allOf'>;
export const isAllOfSchema = (schema: JSONSchema7): schema is AllOfSchema =>
  schema['allOf'] !== undefined;

export type OneOfSchema = RequireFields<JSONSchema7, 'oneOf'>;
export const isOneOfSchema = (schema: JSONSchema7): schema is OneOfSchema =>
  schema['oneOf'] !== undefined;

export type NotSchema = RequireFields<JSONSchema7, 'not'>;
export const isNotSchema = (schema: JSONSchema7): schema is NotSchema =>
  schema['not'] !== undefined;

export type ArraySchema = JSONSchema7 & {
  type: 'array';
  items?: JSONSchema7Definition | JSONSchema7Definition[];
};
export const isArraySchema = (schema: JSONSchema7): schema is ArraySchema =>
  schema.type === 'array';

export type ConstSchema = RequireFields<JSONSchema7, 'const'>;
export const isConstSchema = (schema: JSONSchema7): schema is ConstSchema =>
  schema.const !== undefined;

export type UnknownSchema = JSONSchema7 & Record<string, never>;
export const isUnknownSchema = (schema: JSONSchema7): schema is UnknownSchema =>
  typeof schema === 'object' && Object.keys(schema).length === 0;

export type MultipleTypesSchema = JSONSchema7 & { type: JSONSchema7TypeName[] };
export const isSchemaWithMultipleTypes = (schema: JSONSchema7): schema is MultipleTypesSchema =>
  Array.isArray(schema.type);
