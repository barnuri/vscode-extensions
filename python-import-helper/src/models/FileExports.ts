import { FileData } from './FileData';

export type FileExports = {
    importEntirePackage?: boolean;
    exports?: FileData[];
    cached?: number;
    isExtraImport?: true;
};
