/**
 * https://stackoverflow.com/a/2970667
 * @param str
 */
export const camelize = (str: string) =>
  str
    .replaceAll(/[^a-zA-Z0-9_\s]/g, '') // remove weird chars
    .replaceAll('_', ' ') // snake_case
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    ) // w => w, ␣w => W
    .replaceAll(/\s+/g, '');

/**
 * Check a property / variable name against a list of forbidden keywords
 *
 * @param varName variable name
 */
export const needsSanitization = (varName: string) => {
  // no starting with numbers
  if (varName[0].match(/[0-9]/g) !== null) {
    return true;
  }

  if (varName.match(/\s/g) !== null) {
    return true;
  }

  // no reserved keywords
  switch (varName) {
    // TODO: put the js keywords here
    case 'private':
      return true;
  }

  return false;
};

/**
 * Sanitize a potentially problematic variable name
 *
 * @param varName variable name
 */
export const sanitizeVariableName = (varName: string) =>
  varName + (needsSanitization(varName) ? '_' : '');

/**
 * Copy string with uppercase first letter
 * @param s
 */
export const uppercaseFirst = (s: string) => s[0].toUpperCase() + s.substring(1);

/**
 * Copy string with lowercase first letter
 * @param s
 */
export const lowercaseFirst = (s: string) => s[0].toLowerCase() + s.substring(1);

export const toCamelCase = (s: string) => {
  if (s.includes('_') || s.includes('-')) {
    return s
      .toLowerCase()
      .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
  }
  return lowercaseFirst(s);
};
