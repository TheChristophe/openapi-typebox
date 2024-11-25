import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';
import { ESLint } from 'eslint';
import url from 'node:url';

const eslint = new ESLint({
  fix: true,
  overrideConfigFile: url.fileURLToPath(new URL(import.meta.resolve('../eslint.config.js'))),
});
const prettierConfigPath = await prettier.resolveConfigFile();
const prettierConfig = (prettierConfigPath &&
  (await prettier.resolveConfig(prettierConfigPath))) ?? {
  tabWidth: 2,
  singleQuote: true,
  printWidth: 100,
};

async function* walk(dir: string): AsyncIterableIterator<string> {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(entry);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}

const sanitizeBulk = async (clientDir: string) => {
  const lintedOutput = await eslint.lintFiles([`${clientDir}/**/*.ts`]);
  if (lintedOutput.some((output) => output.errorCount - output.fixableErrorCount !== 0)) {
    console.error('Error while linting files');
    for (const file of lintedOutput.filter(
      (output) => output.errorCount - output.fixableErrorCount !== 0,
    )) {
      console.warn(
        `${file.filePath} failed on ${(file.errorCount - file.fixableErrorCount).toString()} counts:`,
      );
      for (const error of file.messages) {
        if (error.fix !== undefined || error.severity !== 2) {
          continue;
        }
        console.warn(
          `${error.line.toString()}: ${error.ruleId?.toString() ?? 'unknown'}: ${error.message}`,
        );
        //console.warn(JSON.stringify(error));
      }
    }
    process.exit(1);
  }
  await ESLint.outputFixes(lintedOutput);

  for await (const file of walk(clientDir)) {
    if (!file.endsWith('.ts')) {
      continue;
    }
    fs.writeFileSync(
      file,
      await prettier.format(fs.readFileSync(file, 'utf-8'), {
        parser: 'typescript',
        ...prettierConfig,
      }),
    );
  }
};

export default sanitizeBulk;
