import { ParsedImport } from './models/ParsedImport';
import * as path from 'path';
import { TextEditor, window } from 'vscode';
import { getLastInitialComment, last, isPathPackage, getWorkspacePath } from './utils';
import { commentRegex } from './regex';
import { ImportPositionPy } from './models/ImportPositionPy';

export function getImportPosition(importPath: string, isExtraImport: boolean | undefined, imports: ParsedImport[], text: string): ImportPositionPy {
    // If no imports, find first non-comment line
    if (!imports.length) {
        return {
            match: getLastInitialComment(text, commentRegex),
            indexModifier: 1,
            isFirstImport: true,
        };
    }

    let dirDotPath: string | undefined;

    // First look for an exact match. This is done outside the main sorting loop because we don't care
    // where the exact match is located if it exists.
    const exactMatch = imports.find(i => {
        let existingImportPath = i.path;
        if (existingImportPath[0] === '.') {
            // relative path
            if (!dirDotPath) {
                const filepath = (window.activeTextEditor as TextEditor).document.fileName;
                const relativeDirPath = path.relative(getWorkspacePath(), path.dirname(filepath));
                dirDotPath = relativeDirPath.replace(/\//g, '.');
            }
            existingImportPath = `${dirDotPath}${existingImportPath}`;
        }
        return existingImportPath === importPath;
    });
    if (exactMatch) {
        return { match: exactMatch, indexModifier: 0, isFirstImport: false };
    }

    const importIsAbsolute = !importPath.startsWith('.');

    for (const importData of imports) {
        // Package check
        const lineIsPackage = isPathPackage(importData.path);
        if (lineIsPackage && !isExtraImport) {
            continue;
        }

        // One is a package and the other isn't
        if (isExtraImport && !lineIsPackage) {
            return { match: importData, indexModifier: -1, isFirstImport: false };
        } else if (!isExtraImport && lineIsPackage) {
            continue;
        }

        if (isExtraImport && (!lineIsPackage || importPath < importData.path)) {
            return { match: importData, indexModifier: -1, isFirstImport: false };
        } else if (lineIsPackage) {
            continue;
        }

        // Absolute path comparison. This also handles the case where both paths are packages, causing
        // them to get compared alphabetically.
        const lineIsAbsolute = !importData.path.startsWith('.');
        if (importIsAbsolute && (!lineIsAbsolute || importPath < importData.path)) {
            return { match: importData, indexModifier: -1, isFirstImport: false };
        } else if (lineIsAbsolute) {
            continue;
        }
    }

    // Since we didn't find a line to sort the new import before, it will go after the last import
    return {
        match: last(imports),
        indexModifier: 1,
        isFirstImport: false,
    };
}
