import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Di belakang reverse proxy (Nginx) pada deployment server lokal.
  app.set('trust proxy', 1);
  // Jangan bocorkan header framework.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Validasi input global (Fase 9 — hardening). Berlaku untuk endpoint yang
  // body-nya bertipe kelas DTO (mis. auth). `whitelist` membuang properti tak
  // dikenal; `transform` mengubah payload menjadi instance DTO + koersi tipe.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // CORS: default TERTUTUP (same-origin) karena web & API diakses satu-origin
  // via Nginx pada server lokal sekolah. Aktifkan lintas-origin hanya bila
  // CORS_ORIGINS diisi (mis. untuk aplikasi mobile) — daftar dipisah koma.
  const corsOrigins = (process.env.CORS_ORIGINS || '').trim();
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

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
