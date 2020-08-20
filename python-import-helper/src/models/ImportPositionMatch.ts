import { ParsedImport } from './ParsedImport';

/**
 * Determine which line number should get the import. This could be merged into that line
 * if they have the same path (resulting in lineIndexModifier = 0), or inserted as an entirely
 * new import line before or after (lineIndexModifier = -1 or 1)
 **/

export type ImportPositionMatch = {
    match: ParsedImport;
    indexModifier: -1 | 0 | 1;
    isFirstImport: false;
};
