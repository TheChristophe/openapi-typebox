import { ImportCollection } from '../importSource.js';

/**
 * Creates the imports required to build the typebox code.
 * Unused imports are stripped by eslint.
 */
const typeboxImportStatements = new ImportCollection(
  {
    file: {
      path: '@sinclair/typebox',
      internal: false,
    },
    entries: [
      { item: 'Kind' },
      { item: 'SchemaOptions' },
      { item: 'Static' },
      { item: 'TSchema' },
      { item: 'TUnion' },
      { item: 'Type' },
      { item: 'TypeRegistry' },
      { typeOnly: true, item: 'TObject' },
      { typeOnly: true, item: 'TString' },
      { typeOnly: true, item: 'TBoolean' },
      { typeOnly: true, item: 'TLiteral' },
      { typeOnly: true, item: 'TArray' },
      { typeOnly: true, item: 'TNumber' },
      { typeOnly: true, item: 'TOptional' },
      { typeOnly: true, item: 'TNull' },
    ],
    eslintIgnores: ['@typescript-eslint/no-unused-vars', 'unused-imports/no-unused-imports'],
  },
  {
    file: {
      path: '@sinclair/typebox/value',
      internal: false,
    },
    entries: [{ item: 'Value' }],
  },
);

export default typeboxImportStatements;
