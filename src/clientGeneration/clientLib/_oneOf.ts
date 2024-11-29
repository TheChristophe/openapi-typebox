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

import {
  Kind,
  type SchemaOptions,
  type Static,
  type TSchema,
  type TUnion,
  Type,
  TypeRegistry,
} from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

TypeRegistry.Set(
  'ExtendedOneOf',
  (schema: TSchema, value) =>
    1 ===
    (schema['oneOf'] as TSchema[]).reduce(
      (acc: number, schema_: TSchema) => acc + (Value.Check(schema_, value) ? 1 : 0),
      0,
    ),
);
/**
 * Creates custom typebox code to support the JSON schema keyword 'oneOf'. Based
 * on the suggestion here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 * @license MIT
 */
const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) =>
  Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf });

export default OneOf;
