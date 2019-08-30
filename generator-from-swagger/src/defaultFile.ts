import { SwaggerConfig } from './models/SwaggerConfig';

export default [
    {
        name: 'exampleClient',
        generator: 'http://api.openapi-generator.tech/api/gen',
        type: 'clients',
        language: 'typescript-axios',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        options: { supportsES6: true },
        outputFolder: './generatedClientFromSwagger',
    },
    {
        name: 'exampleServer',
        generator: 'http://api.openapi-generator.tech/api/gen',
        type: 'servers',
        language: 'aspnetcore',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        options: { supportsES6: true },
        outputFolder: './generatedServerFromSwagger',
    },
] as SwaggerConfig[];
