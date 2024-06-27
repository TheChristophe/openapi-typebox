import template from '../templater.js';

/**
 * Creates the imports required to build the typebox code.
 * Unused imports are stripped by eslint.
 */
const typeboxImportStatements = template.lines(
  "import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from '@sinclair/typebox';",
  "import { Value } from '@sinclair/typebox/value';",
);

export default typeboxImportStatements;
