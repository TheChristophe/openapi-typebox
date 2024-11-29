import template from '../templater.js';

/**
 * Creates the imports required to build the typebox code.
 * Unused imports are stripped by eslint.
 */
const typeboxImportStatements = (typeOnlyHints = false) =>
  template.lines(
    "import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from '@sinclair/typebox';",
    // these type imports serve to make the generated .d.ts files more readable
    typeOnlyHints &&
      template.lines(
        '// prettier-ignore',
        'import {',
        '  /* eslint-disable @typescript-eslint/no-unused-vars,unused-imports/no-unused-imports */',
        '  type TObject,',
        //'  type TUnion,',
        '  type TString,',
        '  type TBoolean,',
        '  type TLiteral,',
        '  type TArray,',
        '  type TNumber,',
        '  /* eslint-enable @typescript-eslint/no-unused-vars,unused-imports/no-unused-imports */',
        "} from '@sinclair/typebox';",
      ),
    "import { Value } from '@sinclair/typebox/value';",
  );

export default typeboxImportStatements;
