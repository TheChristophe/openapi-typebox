/**
 * Check a property / variable name against a list of forbidden keywords
 *
 * @param varName
 */
const needsSanitization = (varName: string) => {
  switch (varName) {
    // TODO: put the js keywords here
    case 'private':
      return true;

    default:
      return false;
  }
};

export default needsSanitization;
