import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Sajikan berkas terunggah (bukti izin) secara statis di /uploads/*
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`\n🚀 LMS SMK Nagara Rebuild API berjalan pada http://localhost:${port}/api\n`);
}

bootstrap();
