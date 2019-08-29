import { SwaggerConfig } from './models/SwaggerConfig';

export default [
    {
        name: 'temp',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        outputFolder: './generatedClientFromSwagger',
        type: 'clients',
        language: 'typescript-axios',
        options: {
            supportsES6: true,
        },
    },
] as SwaggerConfig[];
