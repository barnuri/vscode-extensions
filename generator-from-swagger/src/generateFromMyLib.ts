import { fixPath, getWorkspacePath } from './fileHelper';
import { resolve } from 'path';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';
import { generate } from 'openapi-toolkit';

export async function generateFromMyLib(item: SwaggerTreeItem) {
    const swaggerPath = item.swaggerConfig.swaggerPath.toLowerCase().startsWith('http')
        ? item.swaggerConfig.swaggerPath
        : fixPath(getWorkspacePath() + '/' + item.swaggerConfig.swaggerPath);

    const generatorName = item.swaggerConfig.language || (item.swaggerConfig as any).clientLanguage || 'typescript-axios';
    const outputFolder = resolve(getWorkspacePath(), item.swaggerConfig.outputFolder);
    const options = {
        ...item.swaggerConfig,
        ...(item.swaggerConfig || {}).options,
        generator: generatorName,
        type: item.swaggerConfig.type,
        output: outputFolder,
        pathOrUrl: swaggerPath,
    } as any;
    await generate(options);
}
