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
