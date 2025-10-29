import { JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import configuration from '../shared/configuration.js';
import generateSchemas from '../shared/generateSchemas.js';
import { default as rootLogger } from '../shared/logger.js';
import NotImplementedError from '../shared/NotImplementedError.js';
import sanitizeBulk from '../shared/sanitizeBulk.js';
import template from '../shared/templater.js';
import writeSourceFile from '../shared/writeSourceFile.js';
import operationToFunction, { FunctionMetadata } from './functionGeneration/index.js';
import generateResponses from './generateResponses.js';
import type OpenApiSpec from './openapi/index.js';
import { OpenApiMethods } from './openapi/PathItem.js';

const logger = rootLogger.child({ context: 'client' });

const processPaths = (
  paths: Required<OpenApiSpec>['paths'],
  outDir: string,
): FunctionMetadata[] => {
  logger.info('Mkdir', path.join(outDir, 'functions'));
  fs.mkdirSync(path.join(outDir, 'functions'), { recursive: true });
  const files: string[] = [];

  const sharedFiles = [
    './output/apiFunction.ts',
    './output/clientConfig.ts',
    './output/HTTPStatusCode.ts',
    './output/request.ts',
  ];
  for (const file of sharedFiles) {
    writeSourceFile(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `${outDir}/${file.split('/').pop()!}`,
      fs.readFileSync(new URL(import.meta.resolve(file)), 'utf-8'),
    );
    files.push(`${outDir}/${file}`);
  }

  const functions: FunctionMetadata[] = [];

  for (const [route, pathItem] of Object.entries(paths)) {
    for (const method of Object.values(OpenApiMethods)) {
      const operation = pathItem[method];
      if (operation == null) {
        continue;
      }

      if (pathItem['$ref'] !== undefined) {
        throw new NotImplementedError("PathItem['$ref']");
      }

      if (pathItem['parameters'] !== undefined) {
        operation.parameters = (operation.parameters ?? []).concat(pathItem['parameters']);
      }

      functions.push(operationToFunction(route, method, operation, outDir));
    }
  }

  for (const fn of functions) {
    files.push(fn.systemPath);
  }

  return functions;
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
    "import { mergeConfigs, type GlobalConfig, type ConfigOverrides } from './clientConfig.js';",
    functions.map(
      ({ operationName, importPath }) => `import ${operationName} from '${importPath}';`,
    ),
    '',

    'const buildClient = (baseConfig?: GlobalConfig): {',
    functions.map(({ operationName }) => `  ${operationName}: typeof ${operationName}; `),
    '} => {',
    '  if (baseConfig == null) {',
    `    return ({ ${functions.map(({ operationName }) => operationName).join(', ')} });`,
    '  }',

    '  return ({',
    functions.map(({ operationName, takesParameters, requiresParameters }) =>
      takesParameters
        ? `${operationName}: ((args: Parameters<typeof ${operationName}>[0]${!requiresParameters ? '= {}' : ''}) => ${operationName}({ ...args, config: mergeConfigs(baseConfig, args.config) })) as typeof ${operationName},`
        : `${operationName}: ((args: Parameters<typeof ${operationName}>[0] = {}) => ${operationName}({ config: mergeConfigs(baseConfig, args.config) })) as typeof ${operationName},`,
    ),
    '  });',
    '};',
    '',
    'export default buildClient;',
  );

  writeSourceFile(`${outDir}/buildClient.ts`, source);
  return `${outDir}/buildClient.ts`;
};

const generatePackage = (version: string, outDir: string) => {
  if (!configuration.package) {
    return;
  }

  let ver = version;
  if (configuration.package.snapshotVersion) {
    const now = new Date();
    const f = (n: number, length: number = 2) => n.toString().padStart(length, '0');
    const timestamp = `${f(now.getFullYear(), 4)}${f(now.getMonth() + 1)}${f(now.getDate())}T${f(now.getUTCHours())}${f(now.getUTCMinutes())}${f(now.getUTCSeconds())}Z`;
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
          //prepublishOnly: 'npm run build',
        },
        dependencies: {
          // TODO: find a good way to keep these updated
          '@sinclair/typebox': '^0.34',
        },
        devDependencies: {
          // TODO: find a good way to keep these updated
          '@types/node': '^22',
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

const openapiToClient = async (specPath: string, outDir: string) => {
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
  logger.info('Mkdir', outPath);
  //fs.rmSync(outPath, { recursive: true, force: true });
  fs.mkdirSync(outPath, { recursive: true });

  const files = [];

  if (spec.components?.schemas != null) {
    logger.info('Mkdir', path.join(outDir, 'models'));
    const modelDir = path.join(outDir, 'models');
    fs.mkdirSync(modelDir, { recursive: true });
    files.push(
      ...generateSchemas(
        Object.entries(spec.components.schemas).map(([key, schema]) => ({
          name: key,
          schema: schema as JSONSchema7,
          ref: `#/components/schemas/${key}`,
        })),
        modelDir,
        outDir,
      ),
    );
  }
  if (spec.components?.responses != null) {
    files.push(...generateResponses(spec.components.responses, outPath));
  }

  if (spec.paths != null) {
    const functions = processPaths(spec.paths, outPath);
    files.push(...functions.map((fn) => fn.systemPath));
    files.push(buildClient(functions, outDir));
  }

  if (configuration.package) {
    generatePackage(spec.info.version, outPath);
  }

  await sanitizeBulk(outPath, files);
};

export default openapiToClient;
