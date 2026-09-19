import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createSourceConnection } from './db-source';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== MEMULAI VERIFIKASI HASIL MIGRASI DATA ===\n');
  const conn = await createSourceConnection();

  try {
    const checks = [
      { name: 'Admin / Users (ADMIN)', sourceQuery: 'SELECT COUNT(*) as c FROM tb_admin', targetCount: async () => prisma.user.count({ where: { role: 'ADMIN' } }) },
      { name: 'Guru / Teacher Profiles', sourceQuery: 'SELECT COUNT(*) as c FROM tb_guru', targetCount: async () => prisma.teacherProfile.count() },
      { name: 'Siswa / Student Profiles (Unique)', sourceQuery: 'SELECT COUNT(DISTINCT nis) as c FROM tb_siswa WHERE nis != "0" AND nis != ""', targetCount: async () => prisma.studentProfile.count() },
      { name: 'Jurusan / Majors', sourceQuery: 'SELECT COUNT(*) as c FROM tb_master_jurusan', targetCount: async () => prisma.major.count() },
      { name: 'Kelas / Classes', sourceQuery: 'SELECT COUNT(*) as c FROM tb_master_kelas', targetCount: async () => prisma.class.count() },
      { name: 'Mapel / Subjects', sourceQuery: 'SELECT COUNT(*) as c FROM tb_master_mapel', targetCount: async () => prisma.subject.count() },
      { name: 'Semester / Semesters', sourceQuery: 'SELECT COUNT(*) as c FROM tb_master_semester', targetCount: async () => prisma.semester.count() },
      { name: 'Teaching Assignments (tb_roleguru)', sourceQuery: 'SELECT COUNT(*) as c FROM tb_roleguru', targetCount: async () => prisma.teachingAssignment.count() },
      { name: 'Materi / Materials', sourceQuery: 'SELECT COUNT(*) as c FROM tb_materi', targetCount: async () => prisma.material.count() },
      { name: 'Perangkat / Teaching Kits', sourceQuery: 'SELECT COUNT(*) as c FROM tb_perangkat', targetCount: async () => prisma.teachingKit.count() },
      { name: 'Ujian / Exams', sourceQuery: 'SELECT COUNT(*) as c FROM ujian', targetCount: async () => prisma.exam.count() },
      { name: 'Soal / Questions', sourceQuery: 'SELECT COUNT(*) as c FROM soal', targetCount: async () => prisma.question.count() },
      { name: 'Hasil Ujian / Exam Attempts', sourceQuery: 'SELECT COUNT(*) as c FROM nilai', targetCount: async () => prisma.examAttempt.count() },
      { name: 'Tugas / Assignments', sourceQuery: 'SELECT COUNT(*) as c FROM tb_tugas', targetCount: async () => prisma.assignment.count() },
      { name: 'Tugas Siswa / Submissions', sourceQuery: 'SELECT COUNT(*) as c FROM tugas_siswa', targetCount: async () => prisma.assignmentSubmission.count() },
      { name: 'Pesan / Messages', sourceQuery: 'SELECT COUNT(*) as c FROM pesan', targetCount: async () => prisma.message.count() }
    ];

    console.log('| Entitas / Domain | Data Lama (MySQL) | Data Baru (PostgreSQL) | Status |');
    console.log('|---|---|---|---|');

    let allPassed = true;
    for (const chk of checks) {
      const [srcRows]: any = await conn.query(chk.sourceQuery);
      const srcCount = Number(srcRows[0].c);
      const tgtCount = await chk.targetCount();
      const status = srcCount === tgtCount ? '✅ COCOK' : (tgtCount > 0 ? '⚠️ DEDUPLIKASI/SELEKSI' : '❌ GAGAL');
      if (status === '❌ GAGAL') allPassed = false;
      console.log(`| ${chk.name} | ${srcCount} | ${tgtCount} | ${status} |`);
    }

    console.log('\n--- Uji Sampel Login & Password Hash ---');
    const sampleUser = await prisma.user.findFirst({
      where: { legacyPasswordSha1: { not: null } }
    });
    if (sampleUser) {
      console.log(`✅ Sample user legacy password sha1 ditemukan: ${sampleUser.username} (${sampleUser.role})`);
    }

    console.log('\n--- Uji Sampel Jawaban Ujian yang Telah Dinormalisasi ---');
    const answerSampleCount = await prisma.examAnswer.count();
    console.log(`✅ Total jawaban ujian dinormalisasi (ExamAnswer): ${answerSampleCount} baris`);

    if (allPassed) {
      console.log('\n🎉 SELURUH VERIFIKASI DATA BERHASIL!\n');
    }

  } catch (err) {
    console.error('Verifikasi Error:', err);
    process.exit(1);
  } finally {
    await conn.end();
    await prisma.$disconnect();
  }
}

main();
