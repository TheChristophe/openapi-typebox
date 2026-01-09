import fs from 'node:fs';
import type OpenApiSpec from '../openapi/index.js';
import refUnsupported from './function/helpers/refUnsupported.js';
import { buildResponseType } from './response/responseTypes.js';
import PathInfo, { resolveAbsolutePath } from './utility/PathInfo.js';
import context from './utility/context.js';
import { ImportCollection, resolveImports } from './utility/importSource.js';
import { default as rootLogger } from './utility/logger.js';
import template from './utility/templater.js';
import writeSourceFile from './utility/writeSourceFile.js';

const logger = rootLogger.child({ context: 'response' });

const generateResponseIndex = (location: PathInfo) => {
  const destination: PathInfo = {
    ...location,
    filename: 'index.ts',
  };
  writeSourceFile(
    destination,
    resolveImports(
      location,
      new ImportCollection(
        ...Object.entries(context.responses.index)
          .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
          .flatMap(([, schema]) =>
            schema.importMeta.validator
              ? [schema.importMeta.type, schema.importMeta.validator]
              : [schema.importMeta.type],
          ),
      ),
      { replaceImportWithExport: true },
    ),
  );

  return [destination];
};

const generateResponses = (
  responses: Required<Required<OpenApiSpec>['components']>['responses'],
  outDir: PathInfo,
) => {
  logger.info('Mkdir', resolveAbsolutePath(outDir));
  fs.mkdirSync(resolveAbsolutePath(outDir), { recursive: true });
  const files = [];

  for (const [name, response] of Object.entries(responses)) {
    refUnsupported(response);
    const r = buildResponseType(name, response);
    if (r) {
      const destFile = {
        ...outDir,
        filename: `${name}.ts`,
      };
      if (r.type === 'source') {
        writeSourceFile(
          destFile,
          template.lines(r?.imports != null && resolveImports(outDir, r.imports), r.code),
        );

        context.responses.add(`#/components/responses/${name}`, {
          typeName: r.typeName,
          validatorName: r.validatorName,
          importMeta: {
            type: {
              file: {
                path: `responses/${name}.js`,
                internal: true,
              },
              entries: [
                {
                  item: r.typeName,
                  typeOnly: true,
                },
              ],
            },
            validator: r.validatorName
              ? {
                  file: {
                    path: `responses/${name}.js`,
                    internal: true,
                  },
                  entries: [
                    {
                      item: r.validatorName,
                    },
                  ],
                }
              : undefined,
          },
          raw: response,
        });
      } else {
        context.responses.add(`#/components/responses/${name}`, {
          typeName: r.typeName,
          validatorName: r.validatorName,
          importMeta: r.importMeta,
          raw: response,
        });
      }
    }
  }

  files.push(
    ...generateResponseIndex({
      ...outDir,
      path: 'responses',
      filename: 'index.ts',
    }),
  );
  return files;
};

export default generateResponses;
