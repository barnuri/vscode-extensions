import { afterEach, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { doesImportExist, getFilepathKey, getModulePath, ignoreThisFile, isPythonModuleFile, resetSourceRoots } from '../src/utils';

const workspaceRoot = process.env.TEST_WORKSPACE_ROOT as string;
const settings = require('vscode').settings as { sourceRoots: string[] };
const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');

afterEach(() => {
    settings.sourceRoots = [];
    fs.rmSync(pyprojectPath, { force: true });
    resetSourceRoots();
});

test('keeps the workspace-relative path without source roots', () => {
    assert.equal(getModulePath(path.join(workspaceRoot, 'src', 'mylib', 'foo.py')), 'src.mylib.foo');
});

test('strips a configured source root', () => {
    settings.sourceRoots = ['./src/'];
    assert.equal(getModulePath(path.join(workspaceRoot, 'src', 'mylib', 'foo.py')), 'mylib.foo');
    assert.equal(getFilepathKey(path.join(workspaceRoot, 'other', 'foo.py')), 'other/foo.py');
});

test('detects setuptools package-dir from pyproject.toml', () => {
    fs.writeFileSync(pyprojectPath, '[tool.setuptools]\npackage-dir = { "" = "src" }\n');
    assert.equal(getModulePath(path.join(workspaceRoot, 'src', 'package', 'etc.py')), 'package.etc');
});

test('detects setuptools find where from pyproject.toml', () => {
    fs.writeFileSync(pyprojectPath, '[tool.setuptools.packages.find]\nwhere = ["lib"]\n');
    assert.equal(getModulePath(path.join(workspaceRoot, 'lib', 'package', 'etc.py')), 'package.etc');
});

test('detects poetry packages from pyproject.toml', () => {
    fs.writeFileSync(pyprojectPath, '[tool.poetry]\npackages = [{ include = "mylib", from = "src" }]\n');
    assert.equal(getModulePath(path.join(workspaceRoot, 'src', 'mylib', 'foo.py')), 'mylib.foo');
});

test('ignores virtualenv, git and site-packages folders', () => {
    assert.ok(ignoreThisFile(path.join(workspaceRoot, '.venv', 'lib', 'x.py')));
    assert.ok(ignoreThisFile(path.join(workspaceRoot, 'myvenv', 'Lib', 'site-packages', 'x.py')));
    assert.ok(ignoreThisFile(path.join(workspaceRoot, '.git', 'hooks', 'x.py')));
    assert.ok(!ignoreThisFile(path.join(workspaceRoot, 'pkg', 'x.py')));
});

test('isPythonModuleFile skips dunder files and non python files', () => {
    assert.ok(isPythonModuleFile(path.join(workspaceRoot, 'pkg', 'x.py')));
    assert.ok(!isPythonModuleFile(path.join(workspaceRoot, 'pkg', '__init__.py')));
    assert.ok(!isPythonModuleFile(path.join(workspaceRoot, 'pkg', 'x.txt')));
});

test('doesImportExist matches the name and ignores the rename', () => {
    assert.ok(doesImportExist(['Foo'], 'Foo as Bar'));
    assert.ok(!doesImportExist(['Foo'], 'Baz'));
});
