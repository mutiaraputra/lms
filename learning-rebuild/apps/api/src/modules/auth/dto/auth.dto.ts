import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

/**
 * DTO endpoint autentikasi (Fase 9 — hardening).
 * Endpoint auth bersifat publik (tanpa JWT) sehingga menjadi permukaan
 * abuse utama; validasi ketat di sini menolak payload malformed/oversized
 * sebelum menyentuh logika service.
 */
export class LoginDto {
  /** NIS (siswa) atau email (guru/admin). */
  @IsString()
  @IsNotEmpty({ message: 'identifier wajib diisi' })
  @MaxLength(150)
  identifier!: string;

  @IsString()
  @IsNotEmpty({ message: 'password wajib diisi' })
  @MaxLength(200)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'refreshToken wajib diisi' })
  @MaxLength(512)
  refreshToken!: string;
}

export class RequestVerificationDto {
  @IsString()
  @IsNotEmpty({ message: 'identifier wajib diisi' })
  @MaxLength(150)
  identifier!: string;
}

export class ConfirmVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  token?: string;
}
