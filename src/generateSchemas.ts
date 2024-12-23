import fs from 'node:fs';
import path from 'node:path';
import appContext from './appContext.js';
import schemaToModel from './modelGeneration/index.js';
import MissingReferenceError from './modelGeneration/MissingReferenceError.js';
import type OpenApiSpec from './openapi/index.js';
import type JsonSchema from './openapi/JsonSchema.js';
import template from './templater.js';
import writeSourceFile from './writeSourceFile.js';

const generateComponentIndex = (outDir: string) => {
  writeSourceFile(
    `${outDir}/models/index.ts`,
    template.lines(
      ...Object.entries(appContext.schemas.index)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([, schema]) => schema.import.replace('import', 'export')),
    ),
  );

  return [`${outDir}/models/index.ts`];
};

const generateSchemas = (
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
    fs.readFileSync(new URL(import.meta.resolve('./clientLib/_oneOf.ts')), 'utf-8'),
  );
  writeSourceFile(
    `${outDir}/HTTPStatusCode.ts`,
    fs.readFileSync(new URL(import.meta.resolve('./clientLib/HTTPStatusCode.ts')), 'utf-8'),
  );
  files.push(`${outDir}/_oneOf.ts`, `${outDir}/HTTPStatusCode.ts`);

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const [key, schema] = openSet[i];
      try {
        const { typeName, validatorName, imports, code, hasEnum } = schemaToModel(schema, key);
        const destFile = `${outDir}/models/${typeName}.ts`;

        writeSourceFile(destFile, template.lines(...imports, '', code));
        files.push(destFile);

        appContext.schemas.add(`#/components/schemas/${key}`, {
          typeName,
          validatorName,
          sourceFile: destFile,
          import: `import { ${!hasEnum ? 'type' : ''} ${typeName}, ${validatorName} } from './${typeName}.js';`,
          raw: schema,
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
      console.log(appContext.schemas.index);
      process.exit(1);
    }
  }

  files.push(...generateComponentIndex(outDir));
  return files;
};

export default generateSchemas;
