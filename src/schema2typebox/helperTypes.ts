export type Code = string;
// TODO: better name lol
export type Entry = {
  code: Code;
  extraImports?: string[];
};

// helpers
const joinCode = (output: Entry[], joiner: string) => output.map(({ code }) => code).join(joiner);

const joinImports = (output: Entry[]) =>
  output.reduce<string[]>((acc, { extraImports }) => {
    extraImports != null && acc.push(...extraImports);
    return acc;
  }, []);

export const joinBatch = (output: Entry[], joiner: string): Entry => ({
  code: joinCode(output, joiner),
  extraImports: joinImports(output),
});
