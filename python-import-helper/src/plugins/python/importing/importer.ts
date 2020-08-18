import * as _ from 'lodash';
import { window, TextEditor } from 'vscode';
import { doesImportExist, insertLine, preserveRenamedImports } from '../../../utils';
import { parseImports, ParsedImportPy } from '../regex';
import { getImportPosition, ImportPositionPy } from './getImportPosition';
import { RichQuickPickItem } from '../../../types';
import { getNewLine } from './getNewLine';

export function insertImport(importSelection: RichQuickPickItem, shouldApplyEdit = true) {
    const { label: exportName, isExtraImport } = importSelection;
    const isPackageImport = !importSelection.description;
    const importPath = importSelection.description || exportName;
    const editor = window.activeTextEditor as TextEditor;

    const fileText = editor.document.getText();
    const imports = parseImports(fileText);
    const importPosition = getImportPosition( importPath, isExtraImport, imports, fileText);

    // Make sure we aren't importing a full package when it already has a partial import, or vice versa
    if (!importPosition.indexModifier && !importPosition.isFirstImport) {
        // We have an exact line match for position
        if (isPackageImport) {
            if (!importPosition.match['isEntirePackage']) {
                // partial imports exist
                window.showErrorMessage("Can't import entire package when parts of the package are already being imported.");
            }
            return;
        } else if (importPosition.match['isEntirePackage']) {
            // partial imports don't exist
            window.showErrorMessage("Can't import part of a package when the entire package is already being imported.");
            return;
        }
    }

    const lineImports = getNewLineImports(importPosition, exportName);
    if (!lineImports) return;

    let newLine: string;
    if (isPackageImport) {
        newLine = `import ${exportName}`;
    } else {
        // If we're adding to an existing line, re-use its path from `importPosition.match.path` in case it is a relative one
        const lineImportPath = importPosition.indexModifier || !importPosition.match['path'] ? importPath : importPosition.match['path'];
        newLine = getNewLine(lineImportPath, lineImports);
    }

    // Import groups
    // If indexModifier is 0, we're adding to a pre-existing line so no need to worry about groups
    return insertLine(newLine, importPosition, shouldApplyEdit);
}

function getNewLineImports(importPosition: ImportPositionPy, newImport: string) {
    const { match, indexModifier, isFirstImport } = importPosition;
    if (indexModifier || isFirstImport) return [newImport];

    const { imports, renamed } = match as ParsedImportPy;
    if (!imports) return [newImport];
    if (doesImportExist(imports, newImport, renamed)) return;

    const newImports = preserveRenamedImports(imports, renamed);
    newImports.push(newImport);
    return newImports;
}
