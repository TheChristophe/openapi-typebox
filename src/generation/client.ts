import { type JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import YAML from 'yaml';
import { type OpenApiSpecification } from '../openapi/index.js';
import { OpenApiMethods } from '../openapi/PathItem.js';
import operationToFunction, { type FunctionMetadata } from './function.js';
import generateModels from './models.js';
import generateResponses from './responses.js';
import configuration from './utility/configuration.js';
import { NotImplementedError } from './utility/errors.js';
import lintAndCheckFiles from './utility/lintAndCheckFiles.js';
import { default as rootLogger } from './utility/logger.js';
import { type FileInfo, type PathInfo, resolveAbsolutePath } from './utility/PathInfo.js';
import template from './utility/templater.js';
import writeSourceFile from './utility/writeSourceFile.js';

import baselineTsConfig from '../../tsconfig.json' with { type: 'json' };

const logger = rootLogger.child({ context: 'client' });

const processPaths = (
  paths: Required<OpenApiSpecification>['paths'],
  outDir: PathInfo,
): FunctionMetadata[] => {
  logger.info('Mkdir', resolveAbsolutePath(outDir));
  fs.mkdirSync(resolveAbsolutePath(outDir), { recursive: true });

  const sharedFiles = ['clientConfig.ts', 'HTTPStatusCode.ts', 'request.ts'];
  for (const file of sharedFiles) {
    const filePath = {
      basePath: outDir.basePath,
      path: '.',
      filename: file,
    };
    writeSourceFile(
      filePath,
      fs.readFileSync(new URL(import.meta.resolve(`../output/${file}`)), 'utf-8'),
    );
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

      functions.push(
        operationToFunction(route, method, operation, {
          ...outDir,
          path: 'functions',
        }),
      );
    }
  }

  return functions;
};

const buildClient = (
  functions: Awaited<ReturnType<typeof operationToFunction>>[],
  outFile: FileInfo,
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

  writeSourceFile(outFile, source);
  return outFile;
};

const generatePackage = (version: string, outDir: PathInfo) => {
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

  writeSourceFile(
    { ...outDir, path: '.', filename: 'package.json' },
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
        },
        dependencies: {
          typebox: '^1',
        },
        devDependencies: {
          '@types/node': '^24',
          typescript: '^5',
        },
        module: './dist/index.js',
        typings: './dist/index.d.ts',
        sideEffects: false,
        type: 'module',
        exports: {
          './models': './dist/models/index.js',
          './*': './dist/*',
        },
        files: ['dist', 'package.json', 'tsconfig.json', 'README.md'],
      },
      null,
      2,
    ),
  );
  writeSourceFile(
    { ...outDir, path: '.', filename: 'tsconfig.json' },
    JSON.stringify(
      {
        ...baselineTsConfig,
        compilerOptions: {
          ...baselineTsConfig.compilerOptions,
          declaration: true,
          outDir: 'dist',
          rootDir: '.',
          typeRoots: ['node_modules/@types'],
          lib: [...baselineTsConfig.compilerOptions.lib, 'dom', 'dom.iterable'],
        },
        include: ['**/*.ts'],
        exclude: ['dist', 'node_modules'],
      },
      null,
      2,
    ),
  );
};

const client = async (specPath: string, outPath: PathInfo) => {
  // TODO: validation
  let spec: OpenApiSpecification;
  if (['.yml', '.yaml'].some((e) => specPath.endsWith(e))) {
    const fileContents = fs.readFileSync(specPath).toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    spec = YAML.parse(fileContents);
  } /*if (['.json'].some((e) => specPath.endsWith(e)))*/ else {
    const fileContents = fs.readFileSync(specPath).toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    spec = JSON.parse(fileContents);
  }

  logger.info('Mkdir', resolveAbsolutePath(outPath));
  //fs.rmSync(outPath, { recursive: true, force: true });
  fs.mkdirSync(resolveAbsolutePath(outPath), { recursive: true });

  const files: PathInfo[] = [];

  if (spec.components?.schemas != null) {
    const modelsDir = {
      ...outPath,
      path: 'models',
    };
    logger.info('Mkdir', resolveAbsolutePath(modelsDir));
    fs.mkdirSync(resolveAbsolutePath(modelsDir), { recursive: true });
    files.push(
      ...generateModels(
        Object.entries(spec.components.schemas).map(([key, schema]) => ({
          name: key,
          schema: schema as JSONSchema7,
          ref: `#/components/schemas/${key}`,
        })),
        modelsDir,
      ),
    );
  }
  if (spec.components?.responses != null) {
    files.push(
      ...generateResponses(spec.components.responses, {
        ...outPath,
        path: 'responses',
      }),
    );
  }

  if (spec.paths != null) {
    const functions = processPaths(spec.paths, {
      ...outPath,
      path: 'functions',
    });
    files.push(...functions.map((fn) => fn.systemPath));
    files.push(
      buildClient(functions, {
        basePath: outPath.basePath,
        path: '.',
        filename: 'buildClient.ts',
      }),
    );
  }

  if (configuration.package) {
    generatePackage(spec.info.version, outPath);
  }

  await lintAndCheckFiles(outPath.basePath, files);
};

export default client;
