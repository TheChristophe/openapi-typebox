import PathInfo, { FileInfo, resolveRelativePath } from './PathInfo.js';
import templater from './templater.js';

export type ImportSource = {
  entries: Array<{
    item: string;
    typeOnly?: boolean;
    default?: boolean;
  }>;
  file: {
    internal: boolean;
    path: string;
  };
  eslintIgnores?: string[];
};

export const toImportPath = (file: FileInfo): string =>
  `${file.path}/${file.filename.replace('.ts', '.js')}`;

const appendToSources = (
  destination: ImportSource[],
  sources: ImportSource | ImportSource[] | ImportCollection,
): ImportSource[] => {
  const sourceArray = Array.isArray(sources)
    ? sources
    : 'imports' in sources
      ? sources.imports
      : [sources];
  for (const newSource of sourceArray) {
    const source = destination.find((oldSource) => oldSource.file.path === newSource.file.path);
    if (source == null) {
      destination.push(newSource);
    } else {
      for (const newEntry of newSource.entries) {
        const oldEntry = source.entries.find((oldEntry) => oldEntry.item === newEntry.item);
        if (oldEntry != null) {
          if (oldEntry.typeOnly && !newEntry.typeOnly) {
            oldEntry.typeOnly = false;
          }
        } else {
          source.entries.push(newEntry);
        }
      }
    }
  }
  return destination;
};

// utility type to avoid type-chaos of dealing with nested arrays
export class ImportCollection {
  public imports: ImportSource[] = [];

  constructor(...sources: (ImportCollection | ImportSource | undefined)[]) {
    for (const source of sources) {
      if (source) {
        this.append(source);
      }
    }
  }
  append(source: ImportSource | ImportCollection) {
    this.imports = appendToSources(this.imports, source);
  }
  push(item: string | string[], path: string, typeOnly?: boolean) {
    this.imports = appendToSources(this.imports, {
      file: {
        path,
        internal: true,
      },
      entries: (Array.isArray(item) ? item : [item]).map((i) => ({
        item: i,
        ...(typeOnly === true && {
          typeOnly: true,
        }),
      })),
    });
  }
}

export type ImportMetadata = {
  type: ImportSource;
  validator: ImportSource;
};

export const resolveImports = (
  from: PathInfo,
  collection: ImportCollection,
  options?: {
    replaceImportWithExport?: boolean;
  },
): string => {
  const keyword = options?.replaceImportWithExport ? 'export' : 'import';

  return templater.lines(
    ...collection.imports.map((imp) => {
      const eslintDisable =
        imp.eslintIgnores && `/* eslint-disable ${imp.eslintIgnores.join(',')} */`;
      const eslintEnable =
        imp.eslintIgnores && `/* eslint-enable ${imp.eslintIgnores.join(',')} */`;

      const path = imp.file.internal
        ? resolveRelativePath(from.path, imp.file.path)
        : imp.file.path;

      const importStatements = `${keyword} { ${imp.entries
        .map((i) =>
          templater.concat(i.typeOnly && 'type ', i.default ? `default as ${i.item}` : i.item),
        )
        .join(', ')} } from '${path}';`;

      return templater.lines(eslintDisable, importStatements, eslintEnable);
    }),
  );
};
