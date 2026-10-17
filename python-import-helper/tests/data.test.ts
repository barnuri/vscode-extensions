import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'path';
import { getDataFromPythonFile } from '../src/data';

const workspaceRoot = process.env.TEST_WORKSPACE_ROOT as string;
const filepath = path.join(workspaceRoot, 'pkg', 'game.py');

function exportedNames(fileText: string) {
    const data = getDataFromPythonFile(filepath, fileText);
    return (data.exp['pkg/game.py']?.exports ?? []).map(x => x.name);
}

test('exports classes, public functions and top-level constants', () => {
    const fileText = ['class Ball(object):', '    pass', 'def move(x):', '    return x', 'def _hidden():', '    pass', 'SPEED = 2'].join('\n');
    assert.deepEqual(exportedNames(fileText), ['Ball', 'move', 'SPEED']);
});

test('does not export attribute assignments as constants', () => {
    assert.deepEqual(exportedNames(['ball = Ball()', 'ball.dx = 2', 'ball.dy = 3'].join('\n')), ['ball']);
});

test('peekOfCode skips empty lines and holds at most 10 lines', () => {
    const body = Array.from({ length: 15 }, (_, i) => `    line${i} = ${i}`);
    const fileText = ['class Ball:', '', ...body].join('\n');
    const peek = getDataFromPythonFile(filepath, fileText).exp['pkg/game.py']?.exports?.[0].peekOfCode ?? '';
    assert.equal(peek.split('\n').length, 10);
    assert.ok(!peek.includes('\n\n'));
});

test('registers package imports as extra imports', () => {
    const data = getDataFromPythonFile(filepath, 'import numpy as np\nfrom os.path import join\n');
    assert.equal(data.imp['numpy'].importEntirePackage, true);
    assert.deepEqual(data.imp['os.path'].exports, ['join']);
});
