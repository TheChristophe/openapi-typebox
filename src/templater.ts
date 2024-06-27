const toValue = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value.toString();
  } else if (Array.isArray(value)) {
    let outputBuf = '';
    for (const el of value) {
      if (el || el === '') {
        const intermediary = toValue(el);
        if (intermediary || intermediary === '') {
          outputBuf && (outputBuf += ' ');
          outputBuf += intermediary;
        }
      }
    }
    return outputBuf;
  }
  throw new Error(`Untemplateable: ${JSON.stringify(value)}`);
};

const templater = (separator: string, ...args: unknown[]) => {
  let outputBuf = '';
  for (const arg of args) {
    if (arg || arg === '') {
      const intermediary: string = toValue(arg);
      if (intermediary || intermediary === '') {
        outputBuf && (outputBuf += separator);
        outputBuf += intermediary;
      }
    }
  }
  return outputBuf;
};

const template = {
  spaces: (...args: unknown[]) => templater(' ', ...args),
  lines: (...args: unknown[]) => templater('\n', ...args),
  concat: (...args: unknown[]) => templater('', ...args),
};

export default template;
