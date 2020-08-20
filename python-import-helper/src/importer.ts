import { TextEditor, window } from 'vscode';
import * as _ from 'lodash';
import { doesImportExist, insertLine, preserveRenamedImports } from './utils';
import { parseImports } from './regex';
import { getImportPosition } from './getImportPosition';
import { ImportPositionPy } from './models/ImportPositionPy';
import { ParsedImport } from './models/ParsedImport';
import { getNewLine } from './getNewLine';
import { RichCompletionItem } from './models/RichCompletionItem';

export function insertImport(importSelection: RichCompletionItem, shouldApplyEdit = true) {
    const { label: exportName, isExtraImport } = importSelection;
    const importPath = importSelection.description || exportName;
    const editor = window.activeTextEditor as TextEditor;
    const fileText = editor.document.getText();
    const imports = parseImports(fileText);

    const importPosition = getImportPosition(importPath, isExtraImport, imports, fileText);
    const lineImports = getNewLineImports(importPosition, exportName);
    if (!lineImports) {
        return;
    }

    const lineImportPath = importPosition.indexModifier || !importPosition.match['path'] ? importPath : importPosition.match['path'];
    const newLine = getNewLine(lineImportPath, lineImports).replace(/[\\,\/]/g, '.');

    return insertLine(newLine, importPosition, shouldApplyEdit);
}

function getNewLineImports(importPosition: ImportPositionPy, newImport: string) {
    const { match, indexModifier, isFirstImport } = importPosition;
    if (indexModifier || isFirstImport) {
        return [newImport];
    }

    const { imports, renamed } = match as ParsedImport;
    if (!imports) {
        return [newImport];
    }
    if (doesImportExist(imports, newImport, renamed)) {
        return;
    }

    const newImports = preserveRenamedImports(imports, renamed);
    newImports.push(newImport);
    return newImports;
}
