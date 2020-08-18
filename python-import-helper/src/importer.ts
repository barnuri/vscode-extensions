import * as _ from 'lodash';
import { Diagnostic, Range, TextDocument, TextEditor, window } from 'vscode';
import { getConfiguration, getDiagnosticsForActiveEditor, getWordAtPosition } from './utils';
import { cacheFileManager } from './cacheFileManager';
import { insertImport } from './plugins/python/importing/importer';
import { ExportData } from './types';
import { buildImportItems } from './plugins/python/importing/buildImportItems';

export const getItemsForText = (exportData: ExportData, text?: string | null) => {
    const mergedData: any = { ...exportData.imp, ...exportData.exp };
    const items = buildImportItems(mergedData);
    if (!items) return;

    return text ? items.filter((item: any) => item.label === text) : items;
};

export async function importUndefinedVariables() {
    const diagnostics = getDiagnosticsForActiveEditor(shouldIncludeDisgnostic);
    if (!diagnostics.length) return;

    const { document } = window.activeTextEditor as TextEditor;
    const words = getUndefinedWords(document, diagnostics);
    for (const word of words) await selectImport(word);
}

export async function selectImport(text?: string | null) {
    return await cacheFileManager(async exportData => {
        if (!exportData) return;

        const items = getItemsForText(exportData, text);
        if (!items) return;

        const item =
            !text || items.length > 1 || !getConfiguration().autoImportSingleResult
                ? await window.showQuickPick(items, { matchOnDescription: true })
                : items[0];

        if (!item) return [];
        await insertImport(item);
    });
}

export function shouldIncludeDisgnostic({ code }: Diagnostic) {
    return code === 'F821';
}

export async function selectImportForActiveWord() {
    const editor = window.activeTextEditor;
    if (!editor) return;
    selectImport(getWordAtPosition(editor.document, editor.selection.active));
}

export function getUndefinedWords(document: TextDocument, diagnostics: Diagnostic[], ignoreRanges: Range[] = [] as any[]) {
    // Must collect all words before inserting any because insertions will cause the diagnostic ranges
    // to no longer be correct, thus not allowing us to get subsequent words
    const words = diagnostics
        .map(d => {
            // Flake8 is returning a collapsed range, so expand it to the entire word
            const range = _.isEqual(d.range.start, d.range.end) ? document.getWordRangeAtPosition(d.range.start) : d.range;

            if (!range) return null;

            // Don't import word if range overlaps at all
            for (const ignoreRange of ignoreRanges) {
                if (ignoreRange.intersection(range)) return null;
            }

            return document.getText(range);
        })
        .filter(Boolean);

    return _.uniq(words);
}
