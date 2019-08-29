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
    item.swaggerConfig.type = item.swaggerConfig.type !== 'clients' && item.swaggerConfig.type !== 'servers' ? 'clients' : item.swaggerConfig.type;

    if (
        item.swaggerConfig.type === 'clients' &&
        (item.swaggerConfig.language.indexOf('typescript') >= 0 || item.swaggerConfig.language.indexOf('javascript'))
    ) {
        body.options = {
            supportsES6: true,
            ...item.swaggerConfig.options,
        };
    }

    // https://generator.swagger.io/api/gen/clients
    const linkToZip = await Axios.post(`http://api.openapi-generator.tech/api/gen/clients/${item.swaggerConfig.language}`, body)
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
    appendFileSync(zipFilePath, new Buffer(zipFileBinary));
    unzip(zipFilePath, { dir: tmpFolder }, (err: any) => {
        if (err) {
            return;
        }
        rimraf.sync(zipFilePath);
        const folderToMove = getFolders(tmpFolder)[0];
        renameSync(folderToMove, outputFolder);
        rimraf.sync(tmpFolder);
    });
}
