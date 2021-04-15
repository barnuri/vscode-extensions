import { getWorkspacePath } from './fileHelper';
import { resolve } from 'path';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';
import { generate } from 'openapi-definition-to-editor';

export async function generateFromMyLib(item: SwaggerTreeItem) {
    const swaggerPath = item.swaggerConfig.swaggerPath;
    const generatorName = item.swaggerConfig.language || (item.swaggerConfig as any).clientLanguage || 'typescript-axios';
    const outputFolder = resolve(getWorkspacePath(), item.swaggerConfig.outputFolder);
    generate(swaggerPath, generatorName, outputFolder);
}
