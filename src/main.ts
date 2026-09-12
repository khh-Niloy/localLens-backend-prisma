import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './utils/transform/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe()); // that happens before our controller
  app.useGlobalInterceptors(new TransformInterceptor()); // that happens after our controller

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
