import { FileExports } from './models/FileExports';
import { CompletionItem, CompletionItemKind, MarkdownString } from 'vscode';
import { RichCompletionItem } from './models/RichCompletionItem';
import { CompilationData } from './models/CompilationData';
import { filepathKeyToModulePath } from './utils';

export function buildCompletionItems(data: CompilationData): RichCompletionItem[] {
    if (!data) {
        return [];
    }
    const mergedData = { ...data.imp, ...data.exp };
    if (Object.keys(mergedData).length <= 0) {
        return [];
    }
    const items = [] as RichCompletionItem[];
    const sortedKeys: string[] = Object.keys(mergedData);
    const defItem = new CompletionItem('', CompletionItemKind.Variable) as RichCompletionItem;

    for (const importPath of sortedKeys) {
        const data: FileExports = mergedData[importPath];

        if (data.importEntirePackage) {
            items.push({
                ...defItem,
                label: importPath,
                isExtraImport: data.isExtraImport,
                importPath: importPath,
                kind: CompletionItemKind.Class,
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
                dotPath = filepathKeyToModulePath(importPath);
            }
            items.push({
                ...defItem,
                kind: exportObj.kind,
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
        item.detail = item.importPath;
    }

    return items;
}

export function buildDocumentation(item: RichCompletionItem): MarkdownString {
    const md = new MarkdownString();
    if (item.isExtraImport) {
        md.appendCodeblock(`import ${item.importPath}`, 'python');
    } else {
        md.appendCodeblock(`from ${item.importPath} import ${item.label}`, 'python');
        md.appendCodeblock(`\n`, 'python');
        md.appendCodeblock(item.peekOfCode, 'python');
    }
    return md;
}
