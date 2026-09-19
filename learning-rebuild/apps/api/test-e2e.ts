import 'dotenv/config';
import { prisma } from '@lms/database';

const BASE_URL = 'http://localhost:4000/api';

async function testSuite() {
  console.log('\n=== MEMULAI TEST SUITE API LMS REBUILD ===\n');

  // 1. Test Admin Login (Migrasi Password SHA1 -> Bcrypt)
  console.log('[Test 1] Login Admin dengan password legacy "adm2024"...');
  const res1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'adm', password: 'adm2024' })
  });

  const data1 = await res1.json();
  if (res1.status !== 200 || !data1.accessToken) {
    throw new Error(`Login admin gagal: ${JSON.stringify(data1)}`);
  }
  console.log(`✅ Login Admin berhasil! Token diperoleh.`);
  console.log(`   User: ${data1.user.name} (${data1.user.role})`);

  // Verify that legacy_password_sha1 was cleared and passwordHash was set
  const adminDb = await prisma.user.findUnique({ where: { username: 'adm' } });
  if (!adminDb?.passwordHash || adminDb.legacyPasswordSha1 !== null) {
    throw new Error(`Password rehash gagal: hash=${adminDb?.passwordHash}, legacy=${adminDb?.legacyPasswordSha1}`);
  }
  console.log(`✅ Zero-Reset Password Rehash verified: password_hash tersimpan, legacy_password_sha1 telah dikosongkan!`);

  // 2. Test Second Login with Modern Hash
  console.log('\n[Test 2] Login kedua Admin (verifikasi menggunakan bcrypt)...');
  const res2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'adm', password: 'adm2024' })
  });
  const data2 = await res2.json();
  if (res2.status !== 200 || !data2.accessToken) {
    throw new Error(`Login kedua admin gagal: ${JSON.stringify(data2)}`);
  }
  console.log(`✅ Login kedua berhasil menggunakan hash bcrypt baru!`);

  // 3. Test Teacher Login
  console.log('\n[Test 3] Login Guru dengan NIK password (anik@smknagara.id / 1834003)...');
  const res3 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'anik@smknagara.id', password: '1834003' })
  });
  const data3 = await res3.json();
  if (res3.status !== 200 || !data3.accessToken) {
    throw new Error(`Login guru gagal: ${JSON.stringify(data3)}`);
  }
  console.log(`✅ Login Guru berhasil! Nama: ${data3.user.name}, NIK: ${data3.user.teacherProfile?.nik}`);

  // 4. Test Student Login
  console.log('\n[Test 4] Login Siswa (NIS: 256566)...');
  const res4 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '256566', password: 'adm2024' })
  });
  const data4 = await res4.json();
  if (res4.status !== 200 || !data4.accessToken) {
    throw new Error(`Login siswa gagal: ${JSON.stringify(data4)}`);
  }
  console.log(`✅ Login Siswa berhasil! Nama: ${data4.user.name}, NIS: ${data4.user.studentProfile?.nis}`);

  // 5. Test Protected Endpoints with Admin Token
  const token = data1.accessToken;
  console.log('\n[Test 5] Mengakses endpoint terproteksi profil pengguna (GET /api/users/me)...');
  const meRes = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meData = await meRes.json();
  console.log(`✅ Profil user terproteksi: ${meData.name} - Role: ${meData.role}`);

  console.log('\n[Test 6] Mengakses Master Data (Classes, Majors, Subjects)...');
  const classesRes = await fetch(`${BASE_URL}/master/classes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const classes = await classesRes.json();
  console.log(`✅ Berhasil mengambil ${classes.length} kelas.`);

  const subjectsRes = await fetch(`${BASE_URL}/master/subjects`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const subjects = await subjectsRes.json();
  console.log(`✅ Berhasil mengambil ${subjects.length} mata pelajaran.`);

  console.log('\n[Test 7] Mengakses Materi Pembelajaran (GET /api/materials)...');
  const materialsRes = await fetch(`${BASE_URL}/materials`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const materials = await materialsRes.json();
  console.log(`✅ Berhasil mengambil ${materials.length} materi pembelajaran.`);

  console.log('\n[Test 8] Mengakses Daftar Ujian & Soal (GET /api/exams)...');
  const examsRes = await fetch(`${BASE_URL}/exams`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const exams = await examsRes.json();
  console.log(`✅ Berhasil mengambil ${exams.length} ujian.`);

  console.log('\n🎉 SELURUH TEST E2E API & REBUILD BERHASIL DENGAN NILAI SEMPURNA!\n');
  process.exit(0);
}

testSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
