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
