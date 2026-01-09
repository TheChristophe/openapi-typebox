import type Parameter from './Parameter.js';

/**
 * https://swagger.io/specification/#header-object
 *
 * unsure how to apply 'All traits that are affected by the location MUST be applicable to a location of header (for example, [style](https://swagger.io/specification/#parameter-style)).'
 */
type Header = Omit<Parameter, 'name' | 'in'>;

export default Header;
