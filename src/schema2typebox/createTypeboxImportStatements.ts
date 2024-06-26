/**
 * Creates the imports required to build the typebox code.
 * Unused imports (e.g. if we don't need to create a TypeRegistry for OneOf
 * types) are stripped in a postprocessing step.
 */
const createTypeboxImportStatements = () =>
  `import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";`;

export default createTypeboxImportStatements;
