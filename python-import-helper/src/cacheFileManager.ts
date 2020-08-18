import * as fs from 'fs';
import { isFile } from 'utlz';
import { plugin } from './plugins';
import { ExportData } from './types';

/**
 * Block access to the cache file until a previous accessor has finished its operations. This
 * prevents race conditions resulting in the last accessor overwriting prior ones' data.
 *
 * `cb` should return a promise (e.g. any file writing operations) so that it completes before the
 * next call to the cacheFileManager
 */
let fileAccess: Promise<any>;

export async function cacheFileManager(cb: (data: ExportData) => any) {
    if (fileAccess) {
        await fileAccess;
    }
    const data = isFile(plugin.cacheFilepath) ? JSON.parse(fs.readFileSync(plugin.cacheFilepath, 'utf8')) : {};
    return cb(data);
}
