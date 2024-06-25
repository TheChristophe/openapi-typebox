import type PRecord from './openapi/PRecord.js';

/**
 * Singleton
 * TODO: refactor
 */
export type ObjectEntry = {
  name: string;
  sourceFile: string;
};

export const knownReferences: PRecord<string, ObjectEntry> = {};

export const lookupReference = (ref: string): ObjectEntry | undefined => knownReferences[ref];

export const addReference = (ref: `#/components/schemas/${string}`, entry: ObjectEntry) => {
  knownReferences[ref] = entry;
};

export const getReferenceTypename = (refPath: string) =>
  refPath.substring(refPath.lastIndexOf('/') + 1);
