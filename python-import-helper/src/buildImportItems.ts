import { FileExports } from './models/FileExports';
import * as path from 'path';
import { removeFileExt } from 'utlz';
import { window, TextEditor, CompletionItem, Position, CompletionItemKind,  MarkdownString } from 'vscode';
import { CompilationData } from './models/CompilationData';
import { RichCompletionItem } from './models/RichCompletionItem';
import { RichQuickPickItem } from './models/RichQuickPickItem';
import { getWorkspacePath } from './helpers';
import { cacheFileManager } from './cacher';

export function buildImportItems(CompilationData: CompilationData): RichQuickPickItem[] {
    const editor = window.activeTextEditor as TextEditor;
    const activeFilepath = editor.document.fileName;
    const items = [] as any[];
    const sortedKeys: string[] = Object.keys(CompilationData);
    for (const importPath of sortedKeys) {
        const data: FileExports = CompilationData[importPath];
        const absImportPath = data.isExtraImport ? importPath : path.join(getWorkspacePath(), importPath);
        if (absImportPath === activeFilepath) {
            continue;
        }

        let dotPath;
        if (data.isExtraImport) {
            dotPath = importPath;
        } else {
            dotPath = removeFileExt(importPath).replace(/[\/,\\]/g, '.');
        }

        if (data.importEntirePackage) {
            items.push({
                label: importPath,
                isExtraImport: data.isExtraImport,
            });
        }

        if (!data.exports) {
            continue;
        }

        // Don't sort data.exports because they were already sorted when caching. See python `cacheFile`
        for (const exportObj of data.exports) {
            items.push({
                label: exportObj.name || exportObj,
                description: dotPath,
                isExtraImport: data.isExtraImport,
            });
        }
    }
    const itemsUnique = [...new Map(items.map(item => [`${item.description}-${item.label}`, item])).values()];
    return itemsUnique;
}

export async function _mapItems(position: Position) {
    const CompilationData: CompilationData = await cacheFileManager();
    const defVal = [] as RichCompletionItem[];
    if (!CompilationData) {
        return defVal;
    }
    try {
        const mergedData: any = { ...CompilationData.imp, ...CompilationData.exp };
        if (Object.keys(mergedData).length <= 0) {
            return defVal;
        }
        const items = buildImportItems(mergedData);
        const compImtes = items.map(item => {
            const completionItem = new CompletionItem(item.label, item.type || CompletionItemKind.Class) as RichCompletionItem;
            completionItem.importItem = item;
            completionItem.position = position;
            completionItem.detail = item.description;
            const path = item.description?.replace(/[\/,\\]/g, '.');
            const importScript = `from ${path} import ${item.label}`;
            var md = new MarkdownString();
            md.appendCodeblock(importScript, 'python');
            completionItem.documentation = md;
            return completionItem;
        });
        return compImtes;
    } catch (error) {
        console.log(error);
        return defVal;
    }
}

export async function mapItems(position: Position) {
    const items = await _mapItems(position);
    return [...new Map(items.map(item => [item.detail || '', item])).values()];
}
