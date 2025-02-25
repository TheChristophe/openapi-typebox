import template from '../templater.js';

/**
 * Creates the imports required to build the typebox code.
 * Unused imports are stripped by eslint.
 */
const typeboxImportStatements = template.lines(
  "import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from '@sinclair/typebox';",
  // these type imports serve to make the generated .d.ts files more readable
  'import {',
  '  /* eslint-disable @typescript-eslint/no-unused-vars,unused-imports/no-unused-imports */',
  '  type TObject,',
  //'  type TUnion,',
  '  type TString,',
  '  type TBoolean,',
  '  type TLiteral,',
  '  type TArray,',
  '  type TNumber,',
  '  type TOptional,',
  '  type TNull,',
  '  /* eslint-enable @typescript-eslint/no-unused-vars,unused-imports/no-unused-imports */',
  "} from '@sinclair/typebox';",
  "import { Value } from '@sinclair/typebox/value';",
);

export default typeboxImportStatements;
