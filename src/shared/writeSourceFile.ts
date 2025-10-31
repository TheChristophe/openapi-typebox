import fs from 'node:fs';
import { default as rootLogger } from './logger.js';
import PathInfo, { resolveAbsolutePath } from './PathInfo.js';

const logger = rootLogger.child({ context: 'write' });

/**
 * @returns The generated code as string
 *
 * @throws Error
 **/
const writeSourceFile = (filename: PathInfo, input: string) => {
  const path = resolveAbsolutePath(filename);
  fs.writeFileSync(path, input);

  logger.info('Generated', path);
};

export default writeSourceFile;
