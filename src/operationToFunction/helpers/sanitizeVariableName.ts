import needsSanitization from './needsSanitization.js';

const sanitizeVariableName = (varName: string) =>
  needsSanitization(varName) ? `${varName}_` : varName;

export default sanitizeVariableName;
