import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const trustProxy = Number(config.get<string>('TRUST_PROXY', '0'));
  if (Number.isInteger(trustProxy) && trustProxy > 0) {
    const server = app.getHttpAdapter().getInstance() as unknown as {
      set(name: string, value: number): void;
    };
    server.set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  const allowedOrigins = config
    .get<string>('FRONTEND_URL', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();
  const port = Number(config.get<string>('PORT') ?? config.get<number>('API_PORT', 3001));
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
