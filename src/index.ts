
import "reflect-metadata";
import { NestFactory } from '@nestjs/core';
import { Controller, Post, Get, HttpCode, Module } from '@nestjs/common';
import Inspekt from './core.js'; 
import InspektInterceptor from './adapters/nest.js';

// 1. Initialize the Core SDK
const inspekt = new Inspekt({
    apiKey: "ins_live_ttjthtjhthhtththhtjtjthnnjjjjjjj",
    analysisMode: "always",
    redactKeys: ["x-api-key"],
});

@Controller('test')
export class TestController {
    
    @Post()
    @HttpCode(200)
    async handleTest() {
        try {
            // Nest automatically handles the JSON conversion 
            // of whatever this function returns.
            const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
            const data = await response.json();
            
            return data; 
        } catch (err) {
            // If this throws, the Interceptor's 'error' block 
            // will still catch it and send it to your Railway server.
            throw err; 
        }
    }
}

// 2. Wrap it in a Module
@Module({
    controllers: [TestController],
})
class AppModule {}

// 3. Bootstrap the App
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    // 4. Register the Interceptor Globally
    // This is the "Nest Way" of doing app.use(middleware)
    app.useGlobalInterceptors(new InspektInterceptor(inspekt));
    
    await app.listen(4000);
    console.log("NestJS is listening on port 4000");
}

bootstrap();  