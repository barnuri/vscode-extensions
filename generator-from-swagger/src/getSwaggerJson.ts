import { readFile } from './fileHelper';
import Axios from 'axios';
import { SwaggerTreeItem } from './models/SwaggerTreeItem';

export async function getSwaggerJson(item: SwaggerTreeItem) {
    let swaggerJson = {};
    if (item.swaggerConfig.swaggerPath.indexOf('http') === 0) {
        swaggerJson = await Axios.get(item.swaggerConfig.swaggerPath).then(res => res.data);
    } else {
        swaggerJson = JSON.parse(readFile(item.swaggerConfig.swaggerPath));
    }
    return swaggerJson;
}
