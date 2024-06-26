export type CodegenSlice = {
  code: string;
  extraImports?: string[];
};

// helpers
const joinCode = (output: CodegenSlice[], joiner: string) =>
  output.map(({ code }) => code).join(joiner);

const joinImports = (output: CodegenSlice[]): string[] =>
  output
    .map(({ extraImports }) => extraImports)
    .filter((x) => x != null)
    .flat();

export const joinBatch = (output: CodegenSlice[], joiner: string): CodegenSlice => ({
  code: joinCode(output, joiner),
  extraImports: joinImports(output),
});
