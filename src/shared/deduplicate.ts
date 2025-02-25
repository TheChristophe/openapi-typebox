export const deduplicate = (lines: string[]): string[] => [...new Set(lines)];
