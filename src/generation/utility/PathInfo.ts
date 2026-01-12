import path from 'node:path';

export type PathInfo = {
  basePath: string;
  path: string;
};
export type FileInfo = {
  basePath: string;
  path: string;
  filename: string;
};

export const resolveAbsolutePath = (where: PathInfo | FileInfo): string => {
  return 'filename' in where
    ? path.resolve(where.basePath, where.path, where.filename)
    : path.resolve(where.basePath, where.path);
};

export const resolveRelativePath = (from: string, to: string): string => {
  let p = path.normalize(path.relative(from, to)).replaceAll(path.sep, '/');
  if (p[0] !== '.') {
    p = `./${p}`;
  }
  return p;
};

export default PathInfo;
