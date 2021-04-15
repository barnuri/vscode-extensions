import { SwaggerConfig } from './models/SwaggerConfig';

export default [
    {
        name: 'exampleClient',
        generator: 'openapi-definition-to-editor',
        type: 'clients',
        language: 'typescript-axios',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        outputFolder: './generatedClientFromSwagger',
    },
    {
        name: 'exampleServer',
        generator: 'http://api.openapi-generator.tech/api/gen',
        type: 'servers',
        language: 'aspnetcore',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        options: { supportsES6: true, apiPackage: 'api', modelPackage: 'models', withSeparateModelsAndApi: true },
        outputFolder: './generatedServerFromSwagger',
    },
] as SwaggerConfig[];
