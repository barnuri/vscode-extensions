const sitePackgesFolders = /[\\,\/]site-packages[\\,\/]/g;

export default {
    excludePatterns: [sitePackgesFolders] as RegExp[],
    includePaths: ['.'] as string[],
    maxImportLineLength: 100,
};
