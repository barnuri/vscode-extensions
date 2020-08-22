import { CompletionItem, Position } from 'vscode';

export type RichCompletionItem = CompletionItem & {
    position: Position;
    label: string;
    description: string;
    isExtraImport: boolean | undefined;
    importPath: string;
    peekOfCode: string;
};
