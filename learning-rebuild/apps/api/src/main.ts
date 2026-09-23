import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Di belakang reverse proxy (Nginx) pada deployment server lokal.
  app.set('trust proxy', 1);
  // Jangan bocorkan header framework.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // CORS: default longgar untuk dev; di produksi batasi lewat CORS_ORIGINS
  // (daftar dipisah koma). Karena web diakses satu-origin via Nginx, umumnya
  // tidak diperlukan, tetapi tetap dapat dikonfigurasi.
  const corsOrigins = (process.env.CORS_ORIGINS || '').trim();
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Sajikan berkas terunggah (bukti izin, tugas) secara statis di /uploads/*.
  // Direktori dapat dipindah lewat UPLOADS_DIR (mis. volume Docker).
  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 LMS SMK Nagara Rebuild API berjalan pada port ${port} (prefix /api)\n`);
}

bootstrap();
