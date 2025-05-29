import { JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import context from './context.js';
import schemaToModel from './modelGeneration/index.js';
import MissingReferenceError from './modelGeneration/MissingReferenceError.js';
import template from './templater.js';
import writeSourceFile from './writeSourceFile.js';

const generateComponentIndex = (outDir: string) => {
  writeSourceFile(
    `${outDir}/index.ts`,
    template.lines(
      ...Object.entries(context.schemas.index)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([, schema]) => schema.import.replace('import', 'export')),
    ),
  );

  return [`${outDir}/index.ts`];
};

type Schema = { schema: JSONSchema7; name: string; ref: string };
const generateSchemas = (schemas: Schema[], outDir: string, rootDir = outDir) => {
  const files = [];

  // TODO: build a tree instead, could then be parallelized
  // TODO: type assertion
  const openSet: Schema[] = [...schemas];
  for (const { schema, ref } of openSet) {
    schema['title'] ??= ref;
  }

  writeSourceFile(
    `${rootDir}/_oneOf.ts`,
    fs.readFileSync(new URL(import.meta.resolve('./output/_oneOf.ts')), 'utf-8'),
  );
  files.push(`${rootDir}/_oneOf.ts`, `${rootDir}/HTTPStatusCode.ts`);

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const { name, ref, schema } = openSet[i];
      try {
        const schemaModel = schemaToModel(schema, name);
        if (schemaModel.type === 'import') {
          context.schemas.add(ref, {
            typeName: schemaModel.typeName,
            validatorName: schemaModel.validatorName,
            sourceFile: '',
            import: template.lines(schemaModel.typeImport, schemaModel.validatorImport),
            raw: schema,
          });
        } else {
          const destFile = `${outDir}/${schemaModel.typeName}.ts`;

          writeSourceFile(destFile, template.lines(...schemaModel.imports, '', schemaModel.code));
          files.push(destFile);

          context.schemas.add(ref, {
            typeName: schemaModel.typeName,
            validatorName: schemaModel.validatorName,
            sourceFile: destFile,
            import: `import { ${!schemaModel.hasEnum ? 'type' : ''} ${schemaModel.typeName}, ${schemaModel.validatorName} } from './${schemaModel.typeName}.js';`,
            raw: schema,
          });
          progressed = true;

          // remove processed item
          openSet.splice(i, 1);
        }
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
        openSet.map(({ ref }) => ref),
      );
      for (const e of errors) {
        console.error(e.message);
      }
      process.exit(1);
    }
  }

  files.push(...generateComponentIndex(outDir));
  return files;
};

export default generateSchemas;
