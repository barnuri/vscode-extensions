import { SwaggerConfig } from './models/SwaggerConfig';

export default [
    {
        name: 'exampleClient',
        generator: 'openapi-definition-to-editor',
        type: 'client',
        language: 'typescript-axios',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        outputFolder: './generatedClientFromSwagger',
        options: {
            namepsace: 'OpenapiDefinitionGenerate',
            modelsFolderName: 'models',
            modelNamePrefix: '',
            modelNameSuffix: '',
            controllersFolderName: 'controllers',
            controllerNamePrefix: '',
            controllerNameSuffix: 'Controller',
        },
    },
    {
        name: 'exampleServer',
        generator: 'http://api.openapi-generator.tech/api/gen',
        type: 'server',
        language: 'aspnetcore',
        swaggerPath: 'https://petstore.swagger.io/v2/swagger.json',
        options: { supportsES6: true, apiPackage: 'api', modelPackage: 'models', withSeparateModelsAndApi: true },
        outputFolder: './generatedServerFromSwagger',
    },
] as SwaggerConfig[];
