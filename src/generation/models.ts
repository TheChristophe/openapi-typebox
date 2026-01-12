import { JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import schemaToModel from '../generation/model.js';
import context, { SchemaEntry } from './utility/context.js';
import { MissingReferenceError } from './utility/errors.js';
import { ImportCollection, ImportSource, resolveImports } from './utility/importSource.js';
import { default as rootLogger } from './utility/logger.js';
import PathInfo, { FileInfo } from './utility/PathInfo.js';
import template from './utility/templater.js';
import writeSourceFile from './utility/writeSourceFile.js';

const logger = rootLogger.child({ context: 'schema' });

const generateModelIndex = (location: PathInfo) => {
  const destination: FileInfo = {
    ...location,
    filename: 'index.ts',
  };
  writeSourceFile(
    destination,
    resolveImports(
      location,
      new ImportCollection(
        ...Object.entries(context.schemas.index)
          .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
          .flatMap(([, schema]) => [schema.importMeta.type, schema.importMeta.validator]),
      ),
      { replaceImportWithExport: true },
    ),
  );

  return [destination];
};

type Schema = { schema: JSONSchema7; name: string; ref: string };
const generateModels = (schemas: Schema[], outDir: PathInfo) => {
  const files: FileInfo[] = [];

  // TODO: build a tree instead, could then be parallelized
  // TODO: type assertion
  const openSet: Schema[] = [...schemas];
  for (const { schema, ref } of openSet) {
    schema['title'] ??= ref;
  }

  writeSourceFile(
    { basePath: outDir.basePath, path: '.', filename: '_oneOf.ts' },
    fs.readFileSync(new URL(import.meta.resolve('../output/_oneOf.ts')), 'utf-8'),
  );
  files.push(
    { basePath: outDir.basePath, path: '.', filename: '_oneOf.ts' },
    { basePath: outDir.basePath, path: '.', filename: 'HTTPStatusCode.ts' },
  );

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const { name, ref, schema } = openSet[i];
      try {
        const schemaModel = schemaToModel(schema, name);
        const entry: Omit<SchemaEntry, 'importMeta'> = {
          typeName: schemaModel.typeName,
          validatorName: schemaModel.validatorName,
          raw: schema,
        };

        let typeImport: ImportSource;
        let validatorImport: ImportSource;
        if (schemaModel.type === 'import') {
          typeImport = schemaModel.importMeta.type;
          validatorImport = schemaModel.importMeta.validator;
        } else {
          const sourceFile = {
            basePath: outDir.basePath,
            path: outDir.path,
            filename: `${schemaModel.typeName}.ts`,
          };
          writeSourceFile(
            sourceFile,
            template.lines(resolveImports(outDir, schemaModel.imports), '', schemaModel.code),
          );
          files.push(sourceFile);
          typeImport = {
            entries: [{ item: schemaModel.typeName, typeOnly: !schemaModel.hasEnum }],
            file: { internal: true, path: `models/${schemaModel.typeName}.js` },
          };
          validatorImport = {
            entries: [{ item: schemaModel.validatorName }],
            file: { internal: true, path: `models/${schemaModel.typeName}.js` },
          };
        }

        context.schemas.add(ref, {
          ...entry,
          importMeta: {
            type: typeImport,
            validator: validatorImport,
          },
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
        logger.error('Unknown error', e);
        process.exit(1);
      }
    }

    if (!progressed) {
      logger.error(
        'Not all references could be resolved',
        openSet.map(({ ref }) => ref),
      );
      logger.warn(
        'Available schemas',
        Array.from(Object.keys(context.schemas.index)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      );
      for (const e of errors) {
        logger.error(e.message);
      }
      process.exit(1);
    }
  }

  files.push(...generateModelIndex(outDir));
  return files;
};

export default generateModels;
