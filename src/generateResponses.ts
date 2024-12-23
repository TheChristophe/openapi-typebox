import fs from 'node:fs';
import path from 'node:path';
import appContext from './appContext.js';
import { buildResponseType } from './functionGeneration/buildResponseTypes.js';
import refUnsupported from './functionGeneration/helpers/refUnsupported.js';
import type OpenApiSpec from './openapi/index.js';
import template from './templater.js';
import writeSourceFile from './writeSourceFile.js';

const generateResponseIndex = (outDir: string) => {
  writeSourceFile(
    `${outDir}/responses/index.ts`,
    template.lines(
      ...Object.entries(appContext.responses.index)
        .sort(([key1], [key2]) => (key1 < key2 ? -1 : key1 > key2 ? 1 : 0))
        .map(([, response]) => response.import),
    ),
  );

  return [`${outDir}/responses/index.ts`];
};

const generateResponses = (
  responses: Required<Required<OpenApiSpec>['components']>['responses'],
  outDir: string,
) => {
  console.log('Mkdir', path.join(outDir, 'responses'));
  fs.mkdirSync(path.join(outDir, 'responses'), { recursive: true });
  const files = [];

  for (const [name, response] of Object.entries(responses)) {
    refUnsupported(response);
    // TODO: this probably wouldn't happen, type system quirk?
    if (response === undefined) {
      continue;
    }
    const r = buildResponseType(name, response);
    if (r) {
      const destFile = `${outDir}/responses/${name}.ts`;
      writeSourceFile(`${outDir}/responses/${name}.ts`, template.lines(r?.imports, r.code));
      appContext.responses.add(`#/components/responses/${name}`, {
        typeName: r.typeName,
        sourceFile: destFile,
        import: `import { type ${r.typeName} } from '../responses/${name}.js';`,
        raw: response,
      });
    }
  }

  files.push(...generateResponseIndex(outDir));
  return files;
};

export default generateResponses;
