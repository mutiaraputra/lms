/**
 * Pembacaan secret aplikasi dengan validasi fail-fast (Fase 9 — hardening).
 *
 * TIDAK ADA fallback hardcoded: bila secret wajib tidak diset, aplikasi
 * menolak untuk start (melempar error jelas) alih-alih diam-diam memakai
 * kunci lemah yang dapat ditebak. `docker-compose.prod.yml` juga memaksa
 * variabel ini lewat sintaks `:?`, tetapi validasi di sini melindungi
 * skenario menjalankan API di luar Compose.
 */

/** Ambil variabel env wajib; lempar bila kosong/tidak diset. */
export function requireEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(
      `[config] Variabel lingkungan ${name} wajib diisi dan tidak boleh kosong. ` +
        `Set ${name} (mis. hasil \`openssl rand -hex 32\`) sebelum menjalankan API.`,
    );
  }
  return value;
}

/** Secret penandatanganan JWT (access token). */
export function getJwtSecret(): string {
  return requireEnv('JWT_SECRET');
}

/**
 * Secret penandatanganan payload QR absensi.
 * Bila QR_SECRET tidak diset, jatuh ke JWT_SECRET (tetap secret nyata, bukan
 * string hardcoded) demi kompatibilitas konfigurasi minimal.
 */
export function getQrSecret(): string {
  const qr = (process.env.QR_SECRET ?? '').trim();
  return qr || getJwtSecret();
}
