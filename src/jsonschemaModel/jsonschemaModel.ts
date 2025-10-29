import { JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import configuration from '../shared/configuration.js';
import generateSchemas from '../shared/generateSchemas.js';
import { default as rootLogger } from '../shared/logger.js';
import sanitizeBulk from '../shared/sanitizeBulk.js';
import walk from '../shared/walk.js';

const logger = rootLogger.child({
  context: 'jsonSchema',
});

const write = promisify(fs.writeFile);
const read = promisify(fs.readFile);

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

const readFile = async (file: string) => {
  const content = await read(file, 'utf-8');
  return { file, content };
};

const jsonschemaToModel = async (specFolder: string, outDir: string) => {
  const outPath = path.resolve(outDir);
  logger.info(`Creating ${outPath}`);
  //fs.rmSync(outPath, { recursive: true, force: true });
  fs.mkdirSync(outPath, { recursive: true });

  const schemaPromises: Promise<{ file: string; content: string }>[] = [];
  for await (const file of walk(specFolder)) {
    if (!file.endsWith('.schema.json')) {
      continue;
    }
    schemaPromises.push(readFile(file));
  }
  // TODO: validate json schema against json schema schema
  const schemas = (await Promise.all(schemaPromises)).map(({ file, content }) => {
    const ref = path.relative(specFolder, file);
    return {
      name: path.basename(file, '.schema.json'),
      // TODO: more 'correct' windows path substitution
      ref: (ref.startsWith('.') ? ref.slice(2) : ref).replaceAll('\\', '/'),
      schema: JSON.parse(content) as JSONSchema7,
    };
  });

  const files = [];

  files.push(...generateSchemas(schemas, outPath));

  await sanitizeBulk(outPath, files);
};

export default jsonschemaToModel;
