import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';
import { ESLint } from 'eslint';

const eslint = new ESLint({
  fix: true,
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
  if (lintedOutput.some((output) => output.errorCount !== 0)) {
    console.error('Error while linting files');
    console.warn(lintedOutput.filter((output) => output.errorCount !== 0));
    process.exit(1);
  }

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
