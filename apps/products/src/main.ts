import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT ?? 4102), '0.0.0.0');
}
bootstrap();
