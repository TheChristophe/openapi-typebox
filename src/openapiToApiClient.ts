import fs from 'node:fs';
import YAML from 'yaml';
import type OpenApiSpec from './openapi/index.js';
import { schema2typebox } from './schema2typebox/index.js';
import writeSanitizedFile from './writeSanitizedFile.js';
import MissingReferenceError from './schema2typebox/MissingReferenceError.js';
import path from 'node:path';
import { OpenApiMethods } from './openapi/PathItem.js';
import operationToFunction from './operationToFunction/index.js';
import type JsonSchema from './openapi/JsonSchema.js';
import { addReference, knownReferences } from './referenceDictionary.js';
import template from './templater.js';

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

  // TODO: build a tree instead, could then be parallelized
  // TODO: type assertion
  const openSet: [string, JsonSchema][] = [...Object.entries(schemas)] as [string, JsonSchema][];
  for (const [key, schema] of openSet) {
    schema['title'] ??= key;
  }

  await writeSanitizedFile(
    `${outDir}/models/_oneOf.ts`,
    fs.readFileSync(import.meta.resolve('./clientLib/_oneOf.ts').replace('file:///', ''), 'utf-8'),
  );

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const [key, schema] = openSet[i];
      try {
        const destFile = `${outDir}/models/${key}.ts`;
        await writeSanitizedFile(destFile, schema2typebox(schema, key));

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
};

const processPaths = async (paths: Required<OpenApiSpec>['paths'], outDir: string) => {
  console.log('Mkdir', path.join(outDir, 'functions'));
  fs.mkdir(
    path.join(outDir, 'functions'),
    { recursive: true },
    (err) => err != null && console.error(err),
  );

  await Promise.allSettled(
    ['ClientConfig.ts', 'ApiError.ts'].map((file) =>
      writeSanitizedFile(
        `${outDir}/${file}`,
        fs.readFileSync(
          import.meta.resolve(`./clientLib/${file}`).replace('file:///', ''),
          'utf-8',
        ),
      ),
    ),
  );

  const functions: Awaited<ReturnType<typeof operationToFunction>>[] = [];

  for (const [route, pathItem] of Object.entries(paths)) {
    for (const method of Object.values(OpenApiMethods)) {
      const operation = pathItem[method];
      if (operation == null) {
        continue;
      }

      functions.push(await operationToFunction(route, method, operation, outDir));
    }
  }

  await buildClient(functions, outDir);
};

const buildClient = async (
  functions: Awaited<ReturnType<typeof operationToFunction>>[],
  outDir: string,
) => {
  functions.sort((a, b) => {
    if (a.operationName < b.operationName) {
      return -1;
    }
    if (b.operationName < a.operationName) {
      return 1;
    }
    return 0;
  });
  const source = template.lines(
    "import type ClientConfig from './ClientConfig.js';",
    "import { mergeConfigs } from './ClientConfig.js';",
    functions.map(
      ({ operationName, importPath }) => `import ${operationName} from '${importPath}';`,
    ),
    '',

    'const buildClient = (baseConfig?: ClientConfig) => {',
    '  if (baseConfig == null) {',
    `    return ({ ${functions.map(({ operationName }) => operationName).join(', ')} });`,
    '  }',

    '  return ({',
    functions.map(({ operationName, hasParams }) =>
      hasParams
        ? `${operationName}: (params: Parameters<typeof ${operationName}>[0], config?: ClientConfig) => ${operationName}(params, mergeConfigs(baseConfig, config)),`
        : `${operationName}: (config?: ClientConfig) => ${operationName}(mergeConfigs(baseConfig, config)),`,
    ),
    '  });',
    '};',
    '',
    'export default buildClient;',
  );

  await writeSanitizedFile(`${outDir}/buildClient.ts`, source);
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

  spec.paths != null && (await processPaths(spec.paths, outPath));
};

export default openapiToApiClient;
