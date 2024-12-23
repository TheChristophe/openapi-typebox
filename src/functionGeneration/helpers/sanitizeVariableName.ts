import needsSanitization from './needsSanitization.js';

/**
 * Sanitize a potentially problematic variable name
 *
 * @param varName variable name
 */
const sanitizeVariableName = (varName: string) => varName + (needsSanitization(varName) ? '_' : '');

export default sanitizeVariableName;
