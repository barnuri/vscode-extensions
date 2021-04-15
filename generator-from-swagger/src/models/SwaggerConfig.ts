export class SwaggerConfig {
    name!: string;
    swaggerPath!: string;
    outputFolder!: string;
    options: any;
    type!: 'clients' | 'servers';
    language!: string;
    generator!: 'openapi-definition-to-editor' | 'http://api.openapi-generator.tech/api/gen' | 'https://generator.swagger.io/api/gen';
}
