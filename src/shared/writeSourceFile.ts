import fs from 'node:fs';
import { default as rootLogger } from './logger.js';

const logger = rootLogger.child({ context: 'write' });

/**
 * @returns The generated code as string
 *
 * @throws Error
 **/
const writeSourceFile = (filename: string, input: string) => {
  fs.writeFileSync(filename, input);

  logger.info('Generated', filename);
};

export default writeSourceFile;
