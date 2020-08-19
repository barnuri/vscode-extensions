import { CompletionItemKind } from 'vscode';

export type RichQuickPickItem = {
    type: CompletionItemKind;
    label: string;
    description?: string | undefined;
    isExtraImport: boolean | undefined;
};
