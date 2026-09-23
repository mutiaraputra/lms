import { Controller, Get } from '@nestjs/common';
import { prisma } from '@lms/database';

/**
 * Health check untuk Docker healthcheck & reverse proxy.
 * - GET /api/health        → liveness (proses hidup)
 * - GET /api/health/ready  → readiness (DB terjangkau)
 * Tidak memerlukan autentikasi.
 */
@Controller('health')
export class HealthController {
  @Get()
  live() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      return { status: 'degraded', db: 'down' };
    }
  }
}
