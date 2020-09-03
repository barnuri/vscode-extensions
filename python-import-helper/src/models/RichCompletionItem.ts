import { CompletionItem } from 'vscode';

export type RichCompletionItem = CompletionItem & {
    label: string;
    description: string;
    isExtraImport: boolean | undefined;
    importPath: string;
    peekOfCode: string;
};
