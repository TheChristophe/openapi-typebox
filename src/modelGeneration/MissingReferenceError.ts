class MissingReferenceError extends Error {
  constructor(schemaName: string) {
    super(`Missing reference type for ${schemaName}`);
  }
}

export default MissingReferenceError;
