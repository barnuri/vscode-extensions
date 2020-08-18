import { strUntil } from '../../utils';
import { plugin } from '../../plugins';

export function isPathPackage(importPath: string) {
    if (importPath.startsWith('.')) return false;
    const pathStart = strUntil(importPath, '.');
    return !plugin.includePaths.some(p => {
        const relativePath = p.slice(plugin.projectRoot.length + 1);
        return strUntil(relativePath, '/') === pathStart;
    });
}
