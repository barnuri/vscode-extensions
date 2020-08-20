import { FileExports } from './models/FileExports';
import * as path from 'path';
import { removeFileExt } from 'utlz';
import { window, TextEditor, CompletionItem, Position, CompletionItemKind, MarkdownString } from 'vscode';
import { CompilationData } from './models/CompilationData';
import { RichCompletionItem } from './models/RichCompletionItem';
import { getWorkspacePath } from './utils';
import { dataFileManager } from './data';

export async function buildCompletionItems(position: Position): Promise<RichCompletionItem[]> {
    const data: CompilationData = await dataFileManager();
    if (!data) {
        return [];
    }
    const mergedData = { ...data.imp, ...data.exp };
    if (Object.keys(mergedData).length <= 0) {
        return [];
    }
    const editor = window.activeTextEditor as TextEditor;
    const activeFilepath = editor.document.fileName;
    const items = [] as RichCompletionItem[];
    const sortedKeys: string[] = Object.keys(mergedData);
    const defItem = new CompletionItem('', CompletionItemKind.Class) as RichCompletionItem;

    for (const importPath of sortedKeys) {
        const data: FileExports = mergedData[importPath];
        const absImportPath = data.isExtraImport ? importPath : path.join(getWorkspacePath(), importPath);
        if (absImportPath === activeFilepath) {
            continue;
        }

        if (data.importEntirePackage) {
            items.push({
                ...defItem,
                label: importPath,
                isExtraImport: data.isExtraImport,
                importPath: importPath,
                type: CompletionItemKind.Class,
                description: importPath,
            });
        }

        if (!data.exports) {
            continue;
        }

        // Don't sort data.exports because they were already sorted when caching. See python `cacheFile`
        for (const exportObj of data.exports) {
            let dotPath;
            if (data.isExtraImport) {
                dotPath = importPath;
            } else {
                dotPath = removeFileExt(importPath).replace(/[\/,\\]/g, '.');
            }
            items.push({
                ...defItem,
                type: exportObj.type,
                importPath: dotPath,
                label: exportObj.name || (exportObj as any),
                description: dotPath,
                isExtraImport: data.isExtraImport,
                peekOfCode: exportObj.peekOfCode,
            });
        }
    }

    for (const item of items) {
        item.importPath = item.importPath.replace(/[\/,\\]/g, '.');
        item.description = item.importPath;
        item.type = item.type || CompletionItemKind.Class;
        item.detail = item.importPath;
        item.position = position;

        var md = new MarkdownString();
        md.appendCodeblock(`from ${item.importPath} import ${item.label}`, 'python');
        md.appendCodeblock(`\n`, 'python');
        md.appendCodeblock(item.peekOfCode, 'python');
        item.documentation = md;
    }

    const itemKey = (item: RichCompletionItem) => `${item.detail}-${item.type}-${item.description}`;
    return [...new Map(items.map(item => [itemKey(item), item])).values()];
}
