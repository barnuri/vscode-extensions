import { CompletionItem, CompletionItemKind, Position } from 'vscode';

export type RichCompletionItem = CompletionItem & {
    position: Position;
    type: CompletionItemKind;
    label: string;
    description: string;
    isExtraImport: boolean | undefined;
    importPath: string;
    peekOfCode: string;
};
