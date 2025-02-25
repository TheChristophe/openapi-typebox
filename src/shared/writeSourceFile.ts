import fs from 'node:fs';

/**
 * @returns The generated code as string
 *
 * @throws Error
 **/
const writeSourceFile = (filename: string, input: string) => {
  fs.writeFileSync(filename, input);

  console.log('Generated', filename);
};

export default writeSourceFile;
