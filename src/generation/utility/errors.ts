export class GenerationError extends Error {}

export class NotImplementedError extends Error {}

export class MissingReferenceError extends Error {
  constructor(schemaName: string) {
    super(`Missing reference type for ${schemaName}`);
  }
}
