/**
 * Sanitize a comment string to be used in jsdoc.
 *
 * @param str comment to format
 * @param options
 * @param options.indent indentation level within jsdoc
 * @param options.firstLine if the first line should be prefixed as comment and indented
 */
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
    str
      .replaceAll('/*', '/ *')
      .replaceAll('*/', '* /')
      .replaceAll('\n', `\n * ${' '.repeat(indent)}`)
  );
};

export default commentSanitize;
