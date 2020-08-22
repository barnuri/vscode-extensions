import { CompletionItemKind } from 'vscode';

export type FileData = {
    name: string;
    kind: CompletionItemKind;
    peekOfCode: string;
};
