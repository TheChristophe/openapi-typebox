import needsSanitization from './needsSanitization.js';

const sanitizeVariableName = (varName: string) => varName + (needsSanitization(varName) ? '_' : '');

export default sanitizeVariableName;
