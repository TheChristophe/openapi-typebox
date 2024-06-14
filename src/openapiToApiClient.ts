import fs from 'node:fs';
import YAML from 'yaml';
import type OpenApiSpec from './openapi/index.js';
import {
  createExportNameForSchema,
  knownReferences,
  schema2typebox,
} from './schema2typebox/schema-to-typebox.js';
import writeSanitizedFile from './schema2typebox/writeSanitizedFile.js';
import MissingReferenceError from './schema2typebox/MissingReferenceError.js';
import path from 'node:path';

const processComponentSchemas = async (
  schemas: Required<Required<OpenApiSpec>['components']>['schemas'],
  outDir: string,
) => {
  console.log('Mkdir', path.join(outDir, 'models'));
  fs.mkdir(
    path.join(outDir, 'models'),
    { recursive: true },
    (err) => err != null && console.error(err),
  );

  // TODO: build a tree instead
  const openSet = [...Object.entries(schemas)];
  for (const [key, schema] of openSet) {
    schema['title'] ??= key;
  }

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const [key, schema] = openSet[i];
      try {
        const destFile = `${outDir}/models/${key}.ts`;
        await writeSanitizedFile(
          destFile,
          // TODO: why as string needed
          `${schema2typebox(schema)}\nexport default ${schema['title'] as string};`,
        );

        const SchemaName = createExportNameForSchema(schema);
        knownReferences[SchemaName] = {
          name: SchemaName,
          sourceFile: destFile,
        };
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
      process.exit(1);
    }
  }
};

const openapiToApiClient = async (specPath: string, outDir: string) => {
  // TODO: validation
  let spec: OpenApiSpec;
  if (['.yml', '.yaml'].some((e) => specPath.endsWith(e))) {
    const fileContents = fs.readFileSync(specPath).toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    spec = YAML.parse(fileContents);
  } /*if (['.json'].some((e) => specPath.endsWith(e)))*/ else {
    const fileContents = fs.readFileSync(specPath).toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    spec = JSON.parse(fileContents);
  }

  const outPath = path.resolve(outDir);
  console.log('Mkdir', outPath);
  fs.mkdir(outPath, { recursive: true }, (err) => err != null && console.error(err));

  spec.components?.schemas != null &&
    (await processComponentSchemas(spec.components.schemas, outPath));
};

export default openapiToApiClient;
