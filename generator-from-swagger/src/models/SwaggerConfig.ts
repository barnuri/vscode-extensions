export class SwaggerConfig {
    name!: string;
    swaggerPath!: string;
    outputFolder!: string;
    options: any;
    type!: 'client' | 'server';
    language!: string;
    generator!: 'openapi-toolkit' | 'http://api.openapi-generator.tech/api/gen' | 'https://generator.swagger.io/api/gen';
}
