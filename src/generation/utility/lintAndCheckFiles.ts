import fs from 'node:fs';
import { promisify } from 'node:util';
import * as prettier from 'prettier';
import * as ts from 'typescript';
import configuration from './configuration.js';
import { default as rootLogger } from './logger.js';
import { type PathInfo, resolveAbsolutePath } from './PathInfo.js';
import walk from './walk.js';

import baselineTsConfig from '../../../tsconfig.json' with { type: 'json' };

const logger = rootLogger.child({
  context: 'sanitize',
});

const prettierConfigPath = await prettier.resolveConfigFile();
const prettierConfig = (prettierConfigPath &&
  (await prettier.resolveConfig(prettierConfigPath))) ?? {
  tabWidth: 2,
  singleQuote: true,
  printWidth: 100,
};

const write = promisify(fs.writeFile);
const read = promisify(fs.readFile);

const lintAndCheckFiles = async (outDir: string, files: PathInfo[]) => {
  if (configuration.compile) {
    logger.info('Compiling...');
    const config = ts.convertCompilerOptionsFromJson(baselineTsConfig.compilerOptions, './');
    if ('incremental' in config.options) {
      delete config.options['incremental'];
    }
    const program = ts.createProgram(files.map(resolveAbsolutePath), {
      ...config.options,
      // different typing as tsconfig.json
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,

      declaration: true,
      noImplicitAny: true,
      outDir: `${outDir}/dist`,
      rootDir: outDir,
      typeRoots: ['node_modules/@types'],
      exclude: ['dist', 'node_modules'],
    });
    const emitResult = program.emit();

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    for (const diagnostic of allDiagnostics) {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start ?? 0,
        );
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        logger.error(
          `${diagnostic.file.fileName} (${(line + 1).toString()},${(character + 1).toString()}): ${message}`,
        );
      } else {
        logger.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }

    if (emitResult.emitSkipped) {
      logger.error('Failed to compile some files');
      process.exit(1);
    }
  }

  logger.info('Formatting...');
  const promises: Promise<unknown>[] = [];
  for await (const file of walk(outDir)) {
    if (!file.endsWith('.ts')) {
      continue;
    }
    promises.push(
      read(file, 'utf-8')
        .then((content) =>
          prettier.format(content, {
            parser: 'typescript',
            ...prettierConfig,
          }),
        )
        .then((formatted) => write(file, formatted)),
    );
  }
  await Promise.all(promises);
};

export default lintAndCheckFiles;
