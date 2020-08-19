import { CompletionItemKind } from 'vscode';
export type FileExports = {
    importEntirePackage?: boolean;
    exports?: { name: string; type: CompletionItemKind }[];
    cached?: number;
    isExtraImport?: true;
};
