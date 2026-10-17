const sitePackgesFolders = /[\\,\/]site-packages[\\,\/]/;

export default {
    excludePatterns: [sitePackgesFolders] as RegExp[],
    excludeFolders: ['site-packages', 'node_modules', '.git', '__pycache__', '.venv', 'venv', '.tox', '.nox', '.mypy_cache', '.pytest_cache'],
    includePaths: ['.'] as string[],
    maxImportLineLength: 100,
    rebuildDelayMs: 500,
    settingsSection: 'pythonImportHelper',
    pyprojectFileName: 'pyproject.toml',
};
