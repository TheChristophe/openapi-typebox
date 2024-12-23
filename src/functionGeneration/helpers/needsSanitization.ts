/**
 * Check a property / variable name against a list of forbidden keywords
 *
 * @param varName variable name
 */
const needsSanitization = (varName: string) => {
  // no starting with numbers
  if (varName[0].match(/[0-9]/g) !== null) {
    return true;
  }

  // no reserved keywords
  switch (varName) {
    // TODO: put the js keywords here
    case 'private':
      return true;

    default:
      return false;
  }
};

export default needsSanitization;
