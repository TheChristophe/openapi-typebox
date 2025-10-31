import fs from 'node:fs';
import PathInfo, { resolveAbsolutePath } from '../shared/PathInfo.js';
import context from '../shared/context.js';
import { resolveImports } from '../shared/importSource.js';
import { default as rootLogger } from '../shared/logger.js';
import template from '../shared/templater.js';
import writeSourceFile from '../shared/writeSourceFile.js';
import { buildResponseType } from './functionGeneration/buildResponseTypes.js';
import refUnsupported from './functionGeneration/helpers/refUnsupported.js';
import type OpenApiSpec from './openapi/index.js';

const logger = rootLogger.child({ context: 'response' });

const generateResponseIndex = (outFile: PathInfo) => {
  writeSourceFile(
    outFile,
    template.lines(
      ...Object.entries(context.responses.index)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([, response]) => response.import),
    ),
  );

  return [outFile];
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
      writeSourceFile(
        destFile,
        template.lines(r?.imports != null && resolveImports(outDir, r.imports), r.code),
      );
      context.responses.add(`#/components/responses/${name}`, {
        typeName: r.typeName,
        validatorName: r.validatorName,
        sourceFile: destFile,
        import: {
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
        raw: response,
      });
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
