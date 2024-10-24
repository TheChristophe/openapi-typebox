import fs from 'node:fs';
import YAML from 'yaml';
import type OpenApiSpec from './openapi/index.js';
import { schema2typebox } from './schema2typebox/index.js';
import writeSourceFile from './writeSourceFile.js';
import MissingReferenceError from './schema2typebox/MissingReferenceError.js';
import path from 'node:path';
import { OpenApiMethods } from './openapi/PathItem.js';
import operationToFunction from './operationToFunction/index.js';
import type JsonSchema from './openapi/JsonSchema.js';
import { addReference, knownReferences } from './referenceDictionary.js';
import template from './templater.js';
import configuration from './configuration.js';
import sanitizeBulk from './sanitizeBulk.js';

const generateComponentIndex: (...args: Parameters<typeof processComponentSchemas>) => void = (
  schemas,
  outDir,
) => {
  writeSourceFile(
    `${outDir}/models/index.ts`,
    template.lines(
      ...Object.entries(schemas)
        .filter(([, schema]) => schema !== undefined)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([key]) => `export { ${key}Schema, default as ${key} } from './${key}.js';`),
    ),
  );
};

const processComponentSchemas = (
  schemas: Required<Required<OpenApiSpec>['components']>['schemas'],
  outDir: string,
) => {
  console.log('Mkdir', path.join(outDir, 'models'));
  fs.mkdirSync(path.join(outDir, 'models'), { recursive: true });

  // TODO: build a tree instead, could then be parallelized
  // TODO: type assertion
  const openSet: [string, JsonSchema][] = [...Object.entries(schemas)] as [string, JsonSchema][];
  for (const [key, schema] of openSet) {
    schema['title'] ??= key;
  }

  writeSourceFile(
    `${outDir}/models/_oneOf.ts`,
    fs.readFileSync(new URL(import.meta.resolve('./clientLib/_oneOf.ts')), 'utf-8'),
  );

  while (openSet.length > 0) {
    let progressed = false;
    const errors: Error[] = [];

    // iterate backward to not invalidate indices when removing last
    for (let i = openSet.length - 1; i >= 0; i--) {
      const [key, schema] = openSet[i];
      try {
        const destFile = `${outDir}/models/${key}.ts`;
        writeSourceFile(destFile, schema2typebox(schema, key));

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

  generateComponentIndex(schemas, outDir);
};

const processPaths = (paths: Required<OpenApiSpec>['paths'], outDir: string) => {
  console.log('Mkdir', path.join(outDir, 'functions'));
  fs.mkdirSync(path.join(outDir, 'functions'), { recursive: true });

  const sharedFiles = ['ClientConfig.ts', 'ApiError.ts', 'typeBranding.ts'];
  for (const file of sharedFiles) {
    writeSourceFile(
      `${outDir}/${file}`,
      fs.readFileSync(new URL(import.meta.resolve(`./clientLib/${file}`)), 'utf-8'),
    );
  }

  const functions: Awaited<ReturnType<typeof operationToFunction>>[] = [];

  for (const [route, pathItem] of Object.entries(paths)) {
    for (const method of Object.values(OpenApiMethods)) {
      const operation = pathItem[method];
      if (operation == null) {
        continue;
      }

      functions.push(operationToFunction(route, method, operation, outDir));
    }
  }

  buildClient(functions, outDir);
};

const buildClient = (
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
        ? `${operationName}: ((params: Parameters<typeof ${operationName}>[0], config?: ClientConfig) => ${operationName}(params, mergeConfigs(baseConfig, config))) as typeof ${operationName},`
        : `${operationName}: ((config?: ClientConfig) => ${operationName}(mergeConfigs(baseConfig, config))) as typeof ${operationName},`,
    ),
    '  });',
    '};',
    '',
    'export default buildClient;',
  );

  writeSourceFile(`${outDir}/buildClient.ts`, source);
};

const generatePackage = (version: string, outDir: string) => {
  if (!configuration.package) {
    return;
  }

  let ver = version;
  if (configuration.package.snapshotVersion) {
    const now = new Date();
    const f = (n: number, length: number = 2) => n.toString().padStart(length, '0');
    const timestamp = `${f(now.getFullYear(), 4)}${f(now.getMonth())}${f(now.getDay())}T${f(now.getUTCHours())}${f(now.getUTCMinutes())}${f(now.getUTCSeconds())}Z`;
    if (ver.includes('-')) {
      // pre-release, append timestamp
      ver = `${ver}.${timestamp}`;
    } else {
      ver = `${ver}-snapshot.${timestamp}`;
    }
  }

  fs.writeFileSync(
    `${outDir}/package.json`,
    JSON.stringify(
      {
        name: configuration.package.name,
        author: configuration.package.author,
        version: ver,
        ...(configuration.package.registry && {
          publishConfig: {
            registry: configuration.package.registry,
          },
        }),
        scripts: {
          build: 'tsc',
          prepublishOnly: 'npm run build',
        },
        dependencies: {
          // TODO: find a good way to keep these updated
          '@sinclair/typebox': '^0.32',
        },
        devDependencies: {
          // TODO: find a good way to keep these updated
          '@types/node': '^20',
          typescript: '^5',
        },
        module: './dist/index.js',
        typings: './dist/index.d.ts',
        sideEffects: false,
        type: 'module',
        exports: {
          /*
          './functions': {
            types: './dist/functions/index.js',
            import: './dist/functions/index.js',
            default: './dist/functions/index.js',
          },
          */
          './models': {
            types: './dist/models/index.js',
            import: './dist/models/index.js',
            default: './dist/models/index.js',
          },
          './*': {
            types: './dist/*.js',
            import: './dist/*.js',
            default: './dist/*.js',
          },
          './*.js': {
            types: './dist/*.js',
            import: './dist/*.js',
            default: './dist/*.js',
          },
        },
        files: ['/dist', '/package.json', '/README.md'],
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    `${outDir}/tsconfig.json`,
    JSON.stringify(
      {
        compilerOptions: {
          declaration: true,
          target: 'es2020',
          module: 'NodeNext',
          noImplicitAny: true,
          outDir: 'dist',
          rootDir: '.',
          typeRoots: ['node_modules/@types'],
          moduleResolution: 'NodeNext',
          allowSyntheticDefaultImports: true,
        },
        exclude: ['dist', 'node_modules'],
      },
      null,
      2,
    ),
  );
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
  //fs.rmSync(outPath, { recursive: true, force: true });
  fs.mkdirSync(outPath, { recursive: true });

  spec.components?.schemas != null && processComponentSchemas(spec.components.schemas, outPath);

  spec.paths != null && processPaths(spec.paths, outPath);

  if (configuration.package) {
    generatePackage(spec.info.version, outPath);
  }

  await sanitizeBulk(outPath);
};

export default openapiToApiClient;
