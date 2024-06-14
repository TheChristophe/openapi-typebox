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
  type JSONSchema7Type,
  type JSONSchema7TypeName,
} from 'json-schema';

export type RefSchema = JSONSchema7 & { $ref: string };
export const isRef = (schema: JSONSchema7): schema is RefSchema => schema['$ref'] !== undefined;

export type ObjectSchema = JSONSchema7 & { type: 'object' };
export const isObjectSchema = (schema: JSONSchema7): schema is ObjectSchema =>
  schema['type'] !== undefined && schema['type'] === 'object';

export type EnumSchema = JSONSchema7 & { enum: JSONSchema7Type[] };
export const isEnumSchema = (schema: JSONSchema7): schema is EnumSchema =>
  schema['enum'] !== undefined;

export type AnyOfSchema = JSONSchema7 & { anyOf: JSONSchema7Definition[] };
export const isAnyOfSchema = (schema: JSONSchema7): schema is AnyOfSchema =>
  schema['anyOf'] !== undefined;

export type AllOfSchema = JSONSchema7 & { allOf: JSONSchema7Definition[] };
export const isAllOfSchema = (schema: JSONSchema7): schema is AllOfSchema =>
  schema['allOf'] !== undefined;

export type OneOfSchema = JSONSchema7 & { oneOf: JSONSchema7Definition[] };
export const isOneOfSchema = (schema: JSONSchema7): schema is OneOfSchema =>
  schema['oneOf'] !== undefined;

export type NotSchema = JSONSchema7 & { not: JSONSchema7Definition };
export const isNotSchema = (schema: JSONSchema7): schema is NotSchema =>
  schema['not'] !== undefined;

export type ArraySchema = JSONSchema7 & {
  type: 'array';
  items?: JSONSchema7Definition | JSONSchema7Definition[];
};
export const isArraySchema = (schema: JSONSchema7): schema is ArraySchema =>
  schema.type === 'array';

export type ConstSchema = JSONSchema7 & { const: JSONSchema7Type };
export const isConstSchema = (schema: JSONSchema7): schema is ConstSchema =>
  schema.const !== undefined;

export type UnknownSchema = JSONSchema7 & Record<string, never>;
export const isUnknownSchema = (schema: JSONSchema7): schema is UnknownSchema =>
  typeof schema === 'object' && Object.keys(schema).length === 0;

export type MultipleTypesSchema = JSONSchema7 & { type: JSONSchema7TypeName[] };
export const isSchemaWithMultipleTypes = (schema: JSONSchema7): schema is MultipleTypesSchema =>
  Array.isArray(schema.type);

export const isNullType = (type: JSONSchema7Type): type is null => type === null;
