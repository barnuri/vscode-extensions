import { RichQuickPickItem } from './models/RichQuickPickItem';
import { Diagnostic, Range, TextDocument, TextEditor, window } from 'vscode';
import * as _ from 'lodash';
import { getDiagnosticsForActiveEditor } from './utils';
import { CompilationData } from './models/CompilationData';
import { buildImportItems } from './buildImportItems';
import { doesImportExist, insertLine, preserveRenamedImports } from './utils';
import { parseImports } from './regex';
import { getImportPosition, ImportPositionPy } from './getImportPosition';
import { ParsedImport } from './models/ParsedImport';
import { getNewLine } from './getNewLine';
import { cacheFileManager } from './cacher';

export const getItemsForText = async (text?: string | null) => {
    const CompilationData: CompilationData = await cacheFileManager();
    const mergedData: any = { ...CompilationData.imp, ...CompilationData.exp };
    const items = buildImportItems(mergedData);
    if (!items) {
        return;
    }

    return text ? items.filter((item: any) => item.label === text) : items;
};

export async function importUndefinedVariables() {
    const diagnostics = getDiagnosticsForActiveEditor();
    if (!diagnostics.length) {
        return;
    }

    const { document } = window.activeTextEditor as TextEditor;
    const words = getUndefinedWords(document, diagnostics);
    for (const word of words) {
        await selectImport(word);
    }
}

export async function selectImport(text?: string | null) {
    const items = await getItemsForText(text);
    if (!items) {
        return;
    }
    const item = await window.showQuickPick(items, { matchOnDescription: true });
    if (!item) {
        return;
    }
    await insertImport(item);
}

export function getUndefinedWords(document: TextDocument, diagnostics: Diagnostic[], ignoreRanges: Range[] = [] as any[]) {
    // Must collect all words before inserting any because insertions will cause the diagnostic ranges
    // to no longer be correct, thus not allowing us to get subsequent words
    const words = diagnostics
        .map(d => {
            // Flake8 is returning a collapsed range, so expand it to the entire word
            const range = _.isEqual(d.range.start, d.range.end) ? document.getWordRangeAtPosition(d.range.start) : d.range;

            if (!range) {
                return null;
            }

            // Don't import word if range overlaps at all
            for (const ignoreRange of ignoreRanges) {
                if (ignoreRange.intersection(range)) {
                    return null;
                }
            }

            return document.getText(range);
        })
        .filter(Boolean);

    return _.uniq(words);
}

export function insertImport(importSelection: RichQuickPickItem, shouldApplyEdit = true) {
    const { label: exportName, isExtraImport } = importSelection;
    const isPackageImport = !importSelection.description;
    const importPath = importSelection.description || exportName;
    const editor = window.activeTextEditor as TextEditor;

    const fileText = editor.document.getText();
    const imports = parseImports(fileText);
    const importPosition = getImportPosition(importPath, isExtraImport, imports, fileText);

    // Make sure we aren't importing a full package when it already has a partial import, or vice versa
    if (!importPosition.indexModifier && !importPosition.isFirstImport) {
        // We have an exact line match for position
        if (isPackageImport) {
            if (!importPosition.match['isEntirePackage']) {
                // partial imports exist
                window.showErrorMessage("Can't import entire package when parts of the package are already being imported.");
            }
            return;
        } else if (importPosition.match['isEntirePackage']) {
            // partial imports don't exist
            window.showErrorMessage("Can't import part of a package when the entire package is already being imported.");
            return;
        }
    }

    const lineImports = getNewLineImports(importPosition, exportName);
    if (!lineImports) {
        return;
    }

    let newLine: string;
    if (isPackageImport) {
        newLine = `import ${exportName}`;
    } else {
        // If we're adding to an existing line, re-use its path from `importPosition.match.path` in case it is a relative one
        const lineImportPath = importPosition.indexModifier || !importPosition.match['path'] ? importPath : importPosition.match['path'];
        newLine = getNewLine(lineImportPath, lineImports);
    }

    newLine = newLine.replace(/[\\,\/]/g, '.');
    return insertLine(newLine, importPosition, shouldApplyEdit);
}

function getNewLineImports(importPosition: ImportPositionPy, newImport: string) {
    const { match, indexModifier, isFirstImport } = importPosition;
    if (indexModifier || isFirstImport) {
        return [newImport];
    }

    const { imports, renamed } = match as ParsedImport;
    if (!imports) {
        return [newImport];
    }
    if (doesImportExist(imports, newImport, renamed)) {
        return;
    }

    const newImports = preserveRenamedImports(imports, renamed);
    newImports.push(newImport);
    return newImports;
}
