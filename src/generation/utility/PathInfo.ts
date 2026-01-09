import path from 'node:path';

type PathInfo = {
  basePath: string;
  path: string;
  filename?: string;
};

export const resolveAbsolutePath = (where: PathInfo): string => {
  return where.filename
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
