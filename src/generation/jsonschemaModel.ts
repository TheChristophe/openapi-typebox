import { type JSONSchema7 } from 'json-schema';
import fs from 'node:fs';
import { readFile as read } from 'node:fs/promises';
import path from 'node:path';
import generateModels from './models.js';
import lintAndCheckFiles from './utility/lintAndCheckFiles.js';
import { default as rootLogger } from './utility/logger.js';
import walk from './utility/walk.js';

const logger = rootLogger.child({
  context: 'jsonSchema',
});

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
      ref: (ref.startsWith('.') ? ref.slice(2) : ref).replaceAll(path.sep, '/'),
      schema: JSON.parse(content) as JSONSchema7,
    };
  });

  const files = [];

  files.push(
    ...generateModels(schemas, {
      basePath: outPath,
      path: '.',
    }),
  );

  await lintAndCheckFiles(outPath, files);
};

export default jsonschemaToModel;
