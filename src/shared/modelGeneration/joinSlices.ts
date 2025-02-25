export type CodegenSlice = {
  code: string;
  imports?: string[];
};

export const joinImports = (output: CodegenSlice[]): string[] =>
  output
    .map(({ imports }) => imports)
    .filter((x) => x != null)
    .flat();

export const joinSubSlices = (output: CodegenSlice[]) => {
  const subSlices = output.map(({ code }) => code);

  return {
    code: subSlices,
    imports: joinImports(output),
  };
};
