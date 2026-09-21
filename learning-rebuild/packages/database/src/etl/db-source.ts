import 'dotenv/config';
import mysql from 'mysql2/promise';

export async function createSourceConnection() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'learning',
    charset: 'utf8mb4'
  });
  return connection;
}

/**
 * Koneksi ke database sumber aplikasi Absensi (CodeIgniter 3).
 * Dipakai oleh ETL rekonsiliasi absen (run-etl-absen.ts).
 * Dump lama memakai charset campur latin1/utf8mb4; koneksi memaksa
 * utf8mb4 agar transcoding teks konsisten.
 */
export async function createAbsenSourceConnection() {
  const connection = await mysql.createConnection({
    host: process.env.ABSEN_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.ABSEN_MYSQL_PORT || process.env.MYSQL_PORT || 3306),
    user: process.env.ABSEN_MYSQL_USER || process.env.MYSQL_USER || 'root',
    password: process.env.ABSEN_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.ABSEN_MYSQL_DATABASE || 'absen',
    charset: 'utf8mb4'
  });
  return connection;
}
