const commentSanitize = (
  str: string,
  options: {
    indent?: number;
    firstLine?: boolean;
  } = {},
) => {
  const { indent = 0, firstLine = false } = options;
  return (
    (firstLine ? ` * ${' '.repeat(indent)}` : '') +
    str.replaceAll('\n', `\n * ${' '.repeat(indent)}`)
  );
};

export default commentSanitize;
