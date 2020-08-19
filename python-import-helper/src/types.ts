import { CompletionItem, Position } from 'vscode';

export type RichQuickPickItem = {
    label: string;
    description?: string | undefined;
    isExtraImport: boolean | undefined;
};

export type RichCompletionItem<Q = RichQuickPickItem> = CompletionItem & {
    importItem: Q;
    position: Position;
};

export enum ExportType {
    default = 0,
    named = 1,
    type = 2,
}

export type RichQuickPickItemJs = RichQuickPickItem & {
    absImportPath: string;
    exportType: ExportType;
    description: string;
};

export type FileExports = {
    importEntirePackage?: boolean;
    exports?: string[];
    cached?: number;
    isExtraImport?: true;
};

export type ReexportsToProcess = {
    fullModules: string[];
    selective: { [path: string]: string[] };
};

export type ExportData = {
    imp: FileExports;
    exp: FileExports;
};

export type CachingData = {
    exp: FileExports;
    imp: {
        [path: string]: FileExports;
    };
};
