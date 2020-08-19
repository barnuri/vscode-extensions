import { CompletionItem, Position } from 'vscode';
import { RichQuickPickItem } from './RichQuickPickItem';

export type RichCompletionItem = CompletionItem & {
    importItem: RichQuickPickItem;
    position: Position;
};
