import { CompletionItemKind } from 'vscode';

export type FileData = {
    name: string;
    type: CompletionItemKind;
    peekOfCode: string;
};
