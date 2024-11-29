import fs from 'node:fs';
import path from 'node:path';
import MissingReferenceError from '../modelGeneration/MissingReferenceError.js';
import { schemaToModelFile } from '../modelGeneration/schemaToModel.js';
import type OpenApiSpec from '../openapi/index.js';
import type JsonSchema from '../openapi/JsonSchema.js';
import { addReference, knownReferences } from '../referenceDictionary.js';
import template from '../templater.js';
import writeSourceFile from '../writeSourceFile.js';

const generateComponentIndex: (...args: Parameters<typeof processComponentSchemas>) => string[] = (
  schemas,
  outDir,
) => {
  writeSourceFile(
    `${outDir}/models/index.ts`,
    template.lines(
      ...Object.entries(schemas)
        .filter(([, schema]) => schema !== undefined)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([key]) => `export { ${key}Schema, ${key} as ${key} } from './${key}.js';`),
    ),
  );

  return [`${outDir}/models/index.ts`];
};

export const processComponentSchemas = (
  schemas: Required<Required<OpenApiSpec>['components']>['schemas'],
  outDir: string,
) => {
  console.log('Mkdir', path.join(outDir, 'models'));
  fs.mkdirSync(path.join(outDir, 'models'), { recursive: true });
  const files = [];

  // TODO: build a tree instead, could then be parallelized
  // TODO: type assertion
  const openSet: [string, JsonSchema][] = [...Object.entries(schemas)] as [string, JsonSchema][];
  for (const [key, schema] of openSet) {
    schema['title'] ??= key;
  }

  writeSourceFile(
    `${outDir}/_oneOf.ts`,
    fs.readFileSync(new URL(import.meta.resolve('../clientLib/_oneOf.ts')), 'utf-8'),
  );
  writeSourceFile(
    `${outDir}/HTTPStatusCode.ts`,
    fs.readFileSync(new URL(import.meta.resolve('../clientLib/HTTPStatusCode.ts')), 'utf-8'),
  );
  files.push(`${outDir}/_oneOf.ts`, `${outDir}/HTTPStatusCode.ts`);

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const [key, schema] = openSet[i];
      try {
        const destFile = `${outDir}/models/${key}.ts`;
        writeSourceFile(destFile, schemaToModelFile(schema, key));
        files.push(destFile);

        addReference(`#/components/schemas/${key}`, {
          name: key,
          sourceFile: destFile,
        });
        progressed = true;

        // remove processed item
        openSet.splice(i, 1);
      } catch (e) {
        if (e instanceof MissingReferenceError) {
          errors.push(e);
          // hope reference will resolve in a later iteration
          continue;
        }
        console.error('Unknown error', e);
        process.exit(1);
      }
    }

    if (!progressed) {
      console.error(
        'Failed to resolve all references for',
        openSet.map(([key]) => key),
      );
      for (const e of errors) {
        console.error(e.message);
      }
      console.log(knownReferences);
      process.exit(1);
    }
  }

  files.push(...generateComponentIndex(schemas, outDir));
  return files;
};
