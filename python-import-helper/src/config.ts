const HIDDEN_FOLDERS_REGEX = /.*\/\..*/;
const sitePackgesFolders = /[\\,\/]site-packages[\\,\/]/g;

export default {
    excludePatterns: [sitePackgesFolders, HIDDEN_FOLDERS_REGEX] as RegExp[],
    includePaths: ['.'] as string[],
    maxImportLineLength: 100,
};
