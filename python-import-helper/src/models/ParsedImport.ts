export type ParsedImport = {
    path: string;
    start: number;
    end: number;
    imports: string[];
    renamed: { [originalName: string]: string; };
    isEntirePackage: boolean;
};
