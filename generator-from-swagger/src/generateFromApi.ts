import { makeDirIfNotExist, getFolders, getWorkspacePath } from './fileHelper';
import { appendFileSync, renameSync } from 'fs';
import { resolve } from 'path';
import rimraf = require('rimraf');
import unzip = require('extract-zip');
import Axios from 'axios';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';
import { getSwaggerJson } from './getSwaggerJson';

export async function generateFromApi(item: SwaggerTreeItem) {
    const swaggerJson = await getSwaggerJson(item);
    const body = { spec: swaggerJson } as any;

    item.swaggerConfig.language = item.swaggerConfig.language || (item.swaggerConfig as any).clientLanguage || 'typescript-axios';
    item.swaggerConfig.type = item.swaggerConfig.type !== 'client' && item.swaggerConfig.type !== 'server' ? 'client' : item.swaggerConfig.type;

    if (
        item.swaggerConfig.type === 'client' &&
        (item.swaggerConfig.language.indexOf('typescript') >= 0 || item.swaggerConfig.language.indexOf('javascript'))
    ) {
        body.options = {
            supportsES6: true,
            ...item.swaggerConfig.options,
        };
    }

    item.swaggerConfig.generator = item.swaggerConfig.generator || 'http://api.openapi-generator.tech/api/gen';

    const linkToZip = await Axios.post(`${item.swaggerConfig.generator}/${item.swaggerConfig.type}s/${item.swaggerConfig.language}`, body)
        .then(x => x.data.link)
        .catch(err => {
            throw err;
        });

    const zipFileBinary = await Axios.get(linkToZip, { responseType: 'arraybuffer' }).then(x => x.data);
    const outputFolder = resolve(getWorkspacePath(), item.swaggerConfig.outputFolder);
    const tmpFolder = outputFolder + 'tmp';
    const zipFilePath = tmpFolder + '/zipFile.zip';
    rimraf.sync(outputFolder);
    rimraf.sync(tmpFolder);
    makeDirIfNotExist(tmpFolder);
    appendFileSync(zipFilePath, new Uint8Array(zipFileBinary));
    await unzip(zipFilePath, { dir: tmpFolder }).catch(err => {
        if (err) {
            return;
        }
        rimraf.sync(zipFilePath);
        const folderToMove = getFolders(tmpFolder)[0];
        renameSync(folderToMove, outputFolder);
        rimraf.sync(tmpFolder);
    });
}
