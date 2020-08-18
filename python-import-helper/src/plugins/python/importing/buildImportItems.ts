import * as path from 'path';
import { removeFileExt } from 'utlz';
import { window, TextEditor } from 'vscode';
import { RichQuickPickItem, ExportData } from '../../../types';
import { plugin } from '../../../plugins';

export function buildImportItems(exportData: ExportData): RichQuickPickItem[] {
    const { projectRoot } = plugin;
    const editor = window.activeTextEditor as TextEditor;
    const activeFilepath = editor.document.fileName;
    const items = [] as any[];
    const sortedKeys: string[] = Object.keys(exportData);
    for (const importPath of sortedKeys) {
        const data = exportData[importPath];
        const absImportPath = data.isExtraImport ? importPath : path.join(projectRoot, importPath);
        if (absImportPath === activeFilepath) continue;

        let dotPath;
        if (data.isExtraImport) {
            dotPath = importPath;
        } else {
            dotPath = removeFileExt(importPath).replace(/\//g, '.');
        }

        if (data.importEntirePackage) {
            items.push({
                label: importPath,
                isExtraImport: data.isExtraImport,
            });
        }

        if (!data.exports) continue;

        // Don't sort data.exports because they were already sorted when caching. See python `cacheFile`
        for (const exportName of data.exports) {
            items.push({
                label: exportName,
                description: dotPath,
                isExtraImport: data.isExtraImport,
            });
        }
    }
    const itemsUnique = [...new Map(items.map(item => [item.description || '', item])).values()];
    return itemsUnique;
}
