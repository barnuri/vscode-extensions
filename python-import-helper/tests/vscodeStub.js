const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');

const settings = { sourceRoots: [] };
const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'python-import-helper-'));
process.env.TEST_WORKSPACE_ROOT = workspaceRoot;

class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

const vscodeStub = {
    settings,
    CompletionItemKind: { Function: 2, Variable: 5, Class: 6 },
    CompletionItem: class {
        constructor(label, kind) {
            this.label = label;
            this.kind = kind;
        }
    },
    MarkdownString: class {
        constructor() {
            this.value = '';
        }
        appendCodeblock(code) {
            this.value += code;
            return this;
        }
    },
    Position,
    Range: class {},
    RelativePattern: class {},
    TextEdit: {},
    window: {},
    workspace: {
        workspaceFolders: [{ uri: { fsPath: workspaceRoot } }],
        getConfiguration: () => ({ get: key => settings[key] }),
    },
};

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
    return request === 'vscode' ? vscodeStub : originalLoad.call(this, request, ...rest);
};
