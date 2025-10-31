import { ImportCollection, ImportSource } from '../importSource.js';

export type CodegenSlice = {
  /**
   * The source code defining the schema.
   */
  code: string;
  imports?: ImportSource | ImportCollection;
  importOnly?: false;
};
export type ImportSlice = {
  /**
   * The name of the referenced object.
   */
  code: string;
  imports: ImportSource | ImportCollection;
  importOnly: true;
};
export type SourceSlice = CodegenSlice | ImportSlice;

export const joinSubSlices = (output: SourceSlice[]) => {
  const subSlices = output.map((item) => ('code' in item ? item.code : ''));

  return {
    code: subSlices,
    imports: new ImportCollection(...output.map((x) => x.imports)),
  };
};
