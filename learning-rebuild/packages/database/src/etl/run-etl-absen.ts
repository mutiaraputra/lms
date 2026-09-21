/**
 * ETL REKONSILIASI ABSENSI (Fase A1)
 * ----------------------------------
 * Melipat data aplikasi `absen/` (CodeIgniter 3) ke dalam platform
 * gabungan. Dijalankan SETELAH run-etl.ts (LMS) sehingga users/kelas/
 * jurusan hasil LMS menjadi basis identitas.
 *
 * Prinsip:
 *  - TIDAK menduplikasi user: cocokkan orang yang sama (siswa via NIS,
 *    guru via NIK, admin via email) ke User yang sudah ada. Hanya buat
 *    User baru bila benar-benar belum ada.
 *  - Password: utamakan bcrypt dari absen (lebih aman) → passwordHash;
 *    kosongkan legacyPasswordSha1 bila sebelumnya diisi ETL LMS.
 *  - Semua ketidakcocokan (email bentrok, hash non-bcrypt, orphan,
 *    tanggal invalid) dicatat ke laporan rekonsiliasi, bukan mematikan proses.
 *
 * Mode: `--dry-run` untuk simulasi tanpa menulis.
 *
 * Env yang dibaca (fallback ke MYSQL_* lalu default 'absen'):
 *   ABSEN_MYSQL_HOST / _PORT / _USER / _PASSWORD / _DATABASE
 */
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Gender,
  AttendanceType,
  AttendanceScope,
  AttendanceStatus,
  LeaveStatus,
  HolidayType,
  Weekday,
} from '@prisma/client';
import { createAbsenSourceConnection } from './db-source';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
let dryRunSeq = -1; // id sintetis untuk pemetaan saat dry-run (agar laporan orphan akurat)

// ---------------------------------------------------------------------------
// Akumulator laporan rekonsiliasi
// ---------------------------------------------------------------------------
const matchedUsers: string[] = [];        // orang yang cocok dengan user LMS
const createdUsers: string[] = [];        // user baru khusus absen
const emailConflicts: string[] = [];      // email dipakai identitas berbeda
const passwordNotices: string[] = [];     // hash non-bcrypt / kebijakan password
const orphanReports: string[] = [];       // nis/nik absen tak dapat dipetakan
const dataIssues: string[] = [];          // tanggal invalid, dsb.

let counters = {
  windows: 0,
  schedules: 0,
  holidays: 0,
  attendanceStudent: 0,
  attendanceTeacher: 0,
  leaveStudent: 0,
  leaveTeacher: 0,
};

// ---------------------------------------------------------------------------
// Peta identitas in-memory (dibangun dari PostgreSQL hasil ETL LMS)
// ---------------------------------------------------------------------------
const nisToUserId = new Map<string, number>();   // StudentProfile.nis -> User.id
const nikToUserId = new Map<string, number>();   // TeacherProfile.nik -> User.id
const emailToUserId = new Map<string, number>(); // User.email -> User.id
const usernameToUserId = new Map<string, number>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cleanDate(val: any): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str.startsWith('0000-00-00')) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Kolom MySQL TIME ('07:15:00') -> Date (porsi waktu untuk Prisma @db.Time). */
function parseTime(val: any): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  const m = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${m[2]}:${m[3] || '00'}Z`);
}

/** Gabung tanggal (date) + jam (time string) -> timestamp check-in/out. */
function combineDateTime(dateVal: any, timeVal: any): Date | null {
  const d = cleanDate(dateVal);
  if (!d) return null;
  const t = parseTime(timeVal);
  if (!t) return d;
  d.setUTCHours(t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), 0);
  return d;
}

function isBcrypt(hash: any): boolean {
  const h = String(hash || '');
  return h.startsWith('$2y$') || h.startsWith('$2a$') || h.startsWith('$2b$');
}

function mapGender(val: any): Gender | null {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'PRIA'].includes(s)) return Gender.L;
  if (['P', 'PEREMPUAN', 'WANITA'].includes(s)) return Gender.P;
  return null;
}

function mapWeekday(val: any): Weekday | null {
  const map: Record<string, Weekday> = {
    senin: Weekday.SENIN, selasa: Weekday.SELASA, rabu: Weekday.RABU,
    kamis: Weekday.KAMIS, jumat: Weekday.JUMAT, "jum'at": Weekday.JUMAT,
    sabtu: Weekday.SABTU, minggu: Weekday.MINGGU,
  };
  return map[String(val || '').trim().toLowerCase()] ?? null;
}

function mapLeaveStatus(val: any): LeaveStatus {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'diterima') return LeaveStatus.DITERIMA;
  if (s === 'ditolak') return LeaveStatus.DITOLAK;
  return LeaveStatus.MENUNGGU;
}

function mapHolidayType(val: any): HolidayType {
  return String(val || '').trim().toLowerCase() === 'weekend'
    ? HolidayType.WEEKEND
    : HolidayType.OTHER;
}

function mapAttendanceType(val: any): AttendanceType {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'keluar') return AttendanceType.KELUAR;
  if (s === 'terlambat') return AttendanceType.TERLAMBAT;
  return AttendanceType.MASUK;
}

/** Turunkan status kehadiran dari teks keterangan bila memungkinkan. */
function deriveStatus(keterangan: any): AttendanceStatus {
  const s = String(keterangan || '').trim().toLowerCase();
  if (s.includes('terlambat')) return AttendanceStatus.TERLAMBAT;
  if (s.includes('izin')) return AttendanceStatus.IZIN;
  if (s.includes('sakit')) return AttendanceStatus.SAKIT;
  if (s.includes('alpa') || s.includes('alfa') || s.includes('tanpa')) return AttendanceStatus.ALPA;
  return AttendanceStatus.HADIR;
}

// ---------------------------------------------------------------------------
// 0. Bangun peta identitas dari PostgreSQL (hasil ETL LMS)
// ---------------------------------------------------------------------------
async function buildIdentityMaps() {
  console.log('[0] Membangun peta identitas dari users LMS yang sudah ada...');
  const students = await prisma.studentProfile.findMany({ select: { nis: true, userId: true } });
  for (const s of students) if (s.nis) nisToUserId.set(String(s.nis).trim(), s.userId);

  const teachers = await prisma.teacherProfile.findMany({ select: { nik: true, userId: true } });
  for (const t of teachers) if (t.nik) nikToUserId.set(String(t.nik).trim(), t.userId);

  const users = await prisma.user.findMany({ select: { id: true, email: true, username: true } });
  for (const u of users) {
    if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
    if (u.username) usernameToUserId.set(u.username, u.id);
  }
  console.log(`    Peta: ${nisToUserId.size} NIS, ${nikToUserId.size} NIK, ${emailToUserId.size} email.`);
}

// ---------------------------------------------------------------------------
// 1. Rekonsiliasi SISWA (login_siswa + tabel_siswa)
// ---------------------------------------------------------------------------
async function reconcileStudents(conn: any) {
  console.log('[1] Rekonsiliasi siswa (login_siswa + tabel_siswa)...');
  const [loginRows]: any = await conn.query('SELECT * FROM login_siswa');
  const loginByNis = new Map<string, any>();
  const loginByEmail = new Map<string, any>();
  for (const l of loginRows) {
    if (l.nis_siswa) loginByNis.set(String(l.nis_siswa).trim(), l);
    if (l.email) loginByEmail.set(String(l.email).trim().toLowerCase(), l);
  }

  const [siswaRows]: any = await conn.query('SELECT * FROM tabel_siswa');
  for (const s of siswaRows) {
    const nis = s.nis ? String(s.nis).trim() : '';
    if (!nis || nis === '0') continue;
    const login = loginByNis.get(nis);
    const email = login?.email ? String(login.email).trim().toLowerCase() : null;
    const rawPwd = login?.password || null;

    let userId = nisToUserId.get(nis) ?? (email ? emailToUserId.get(email) : undefined);

    if (userId) {
      matchedUsers.push(`SISWA NIS ${nis} (${s.nama_siswa || ''}) → User #${userId} (cocok dengan LMS)`);
      await applyAbsenCredential(userId, rawPwd, email, `siswa NIS ${nis}`);
      continue;
    }

    // Siswa hanya ada di absen → buat baru
    createdUsers.push(`SISWA NIS ${nis} (${s.nama_siswa || ''}) → user baru dari absen`);
    if (isDryRun) { nisToUserId.set(nis, dryRunSeq--); if (email) emailToUserId.set(email, dryRunSeq); continue; }
    {
      const user = await prisma.user.upsert({
        where: { username: `siswa_${nis}` },
        create: {
          username: `siswa_${nis}`,
          email: email || undefined,
          name: (s.nama_siswa || `Siswa ${nis}`).trim(),
          passwordHash: isBcrypt(rawPwd) ? rawPwd : null,
          role: Role.SISWA,
          avatar: s.gambar || null,
          isActive: login ? login.is_active == 1 : true,
        },
        update: {},
      });
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          nis,
          birthDate: cleanDate(s.tgl_lahir),
          gender: mapGender(s.jenis_kelamin),
          address: s.alamat || null,
          phone: s.no_telepon ? String(s.no_telepon).trim() : null,
          classId: null,   // resolusi kode_kelas absen ditangani di Fase A3
          majorId: null,
        },
        update: {},
      });
      nisToUserId.set(nis, user.id);
      if (email) emailToUserId.set(email, user.id);
      if (!isBcrypt(rawPwd) && rawPwd) passwordNotices.push(`SISWA NIS ${nis}: hash password bukan bcrypt → perlu reset.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Rekonsiliasi GURU (login_guru + tabel_guru)
// ---------------------------------------------------------------------------
async function reconcileTeachers(conn: any) {
  console.log('[2] Rekonsiliasi guru (login_guru + tabel_guru)...');
  const [loginRows]: any = await conn.query('SELECT * FROM login_guru');
  const loginByNik = new Map<string, any>();
  const loginByEmail = new Map<string, any>();
  for (const l of loginRows) {
    if (l.nik_guru) loginByNik.set(String(l.nik_guru).trim(), l);
    if (l.email) loginByEmail.set(String(l.email).trim().toLowerCase(), l);
  }

  const [guruRows]: any = await conn.query('SELECT * FROM tabel_guru');
  for (const g of guruRows) {
    const nik = g.nik ? String(g.nik).trim() : '';
    const login = nik ? loginByNik.get(nik) : null;
    const email = login?.email ? String(login.email).trim().toLowerCase() : null;
    const rawPwd = login?.password || null;

    let userId = (nik ? nikToUserId.get(nik) : undefined) ?? (email ? emailToUserId.get(email) : undefined);

    if (userId) {
      matchedUsers.push(`GURU NIK ${nik || '-'} (${g.nama_guru || ''}) → User #${userId} (cocok dengan LMS)`);
      await applyAbsenCredential(userId, rawPwd, email, `guru NIK ${nik}`);
      continue;
    }

    const username = email || (nik ? `guru_${nik}` : `guru_absen_${g.id_guru}`);
    createdUsers.push(`GURU NIK ${nik || '-'} (${g.nama_guru || ''}) → user baru dari absen`);
    if (isDryRun) { if (nik) nikToUserId.set(nik, dryRunSeq--); if (email) emailToUserId.set(email, dryRunSeq); continue; }
    {
      const user = await prisma.user.upsert({
        where: { username },
        create: {
          username,
          email: email || undefined,
          name: (g.nama_guru || `Guru ${nik}`).trim(),
          passwordHash: isBcrypt(rawPwd) ? rawPwd : null,
          role: Role.GURU,
          avatar: g.gambar || null,
          isActive: login ? login.is_active == 1 : true,
        },
        update: {},
      });
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          nik: nik || `ABSEN_GURU_${g.id_guru}`,
          birthDate: cleanDate(g.tgl_lahir),
          gender: mapGender(g.jenis_kelamin),
          address: g.alamat || null,
          phone: g.no_telepon ? String(g.no_telepon).trim() : null,
        },
        update: {},
      });
      if (nik) nikToUserId.set(nik, user.id);
      if (email) emailToUserId.set(email, user.id);
      if (!isBcrypt(rawPwd) && rawPwd) passwordNotices.push(`GURU NIK ${nik}: hash password bukan bcrypt → perlu reset.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Rekonsiliasi ADMIN/OPERATOR (tabel_user)
// ---------------------------------------------------------------------------
async function reconcileAdmins(conn: any) {
  console.log('[3] Rekonsiliasi admin/operator (tabel_user)...');
  const [userRows]: any = await conn.query('SELECT * FROM tabel_user');
  for (const u of userRows) {
    const email = u.email ? String(u.email).trim().toLowerCase() : null;
    const rawPwd = u.password || null;
    const existingId = email ? emailToUserId.get(email) : undefined;

    if (existingId) {
      // Email absen sudah dipakai identitas lain → catat konflik (jangan timpa role).
      matchedUsers.push(`ADMIN ${email} → User #${existingId} (email sudah ada)`);
      await applyAbsenCredential(existingId, rawPwd, email, `admin ${email}`);
      continue;
    }

    const username = email || `admin_absen_${u.id}`;
    createdUsers.push(`ADMIN ${email || username} → user baru dari absen (role_id lama=${u.role_id})`);
    if (isDryRun) { if (email) emailToUserId.set(email, dryRunSeq--); continue; }
    {
      await prisma.user.upsert({
        where: { username },
        create: {
          username,
          email: email || undefined,
          name: (u.name || username).trim(),
          passwordHash: isBcrypt(rawPwd) ? rawPwd : null,
          role: Role.ADMIN,
          avatar: u.image || null,
          isActive: u.is_active == 1,
        },
        update: {},
      });
      if (email) emailToUserId.set(email, usernameToUserId.get(username) ?? 0);
      if (!isBcrypt(rawPwd) && rawPwd) passwordNotices.push(`ADMIN ${email}: hash password bukan bcrypt → perlu reset.`);
    }
  }
}

/**
 * Terapkan kredensial bcrypt absen ke user yang cocok, sesuai kebijakan
 * "utamakan bcrypt". Hanya menulis bila hash absen valid bcrypt.
 */
async function applyAbsenCredential(userId: number, rawPwd: any, email: string | null, label: string) {
  if (isBcrypt(rawPwd)) {
    if (!isDryRun) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: rawPwd, legacyPasswordSha1: null },
      });
    }
    passwordNotices.push(`${label}: password diselaraskan ke bcrypt dari absen (kebijakan "utamakan bcrypt").`);
  } else if (rawPwd) {
    passwordNotices.push(`${label}: hash absen bukan bcrypt, password LMS dipertahankan.`);
  }
}

// ---------------------------------------------------------------------------
// 4. Master data absen: kelas & jurusan yang belum ada
// ---------------------------------------------------------------------------
async function mergeMasterData(conn: any) {
  console.log('[4] Merge kelas & jurusan absen yang belum ada...');
  const [jurusanRows]: any = await conn.query('SELECT * FROM tabel_jurusan');
  for (const j of jurusanRows) {
    const name = String(j.jurusan || '').trim();
    if (!name) continue;
    if (!isDryRun) {
      const existing = await prisma.major.findUnique({ where: { name } });
      if (!existing) await prisma.major.create({ data: { name } });
    }
  }
  const [kelasRows]: any = await conn.query('SELECT * FROM tabel_kelas');
  for (const k of kelasRows) {
    const name = String(k.kelas || k.nama_kelas || '').trim();
    if (!name) continue;
    if (!isDryRun) {
      const existing = await prisma.class.findUnique({ where: { name } });
      if (!existing) await prisma.class.create({ data: { name } });
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Jendela jam absen (tabel_jam_absen) + jadwal guru (tabel_jam_absen_guru)
// ---------------------------------------------------------------------------
async function loadWindowsAndSchedules(conn: any) {
  console.log('[5] Migrasi jendela jam absen & jadwal guru...');
  const [jamRows]: any = await conn.query('SELECT * FROM tabel_jam_absen');
  for (const j of jamRows) {
    const start = parseTime(j.mulai);
    const end = parseTime(j.selesai);
    if (!start || !end) { dataIssues.push(`tabel_jam_absen #${j.id}: jam mulai/selesai invalid.`); continue; }
    counters.windows++;
    if (!isDryRun) {
      await prisma.attendanceWindow.upsert({
        where: { legacyId: j.id },
        create: { legacyId: j.id, type: mapAttendanceType(j.type), scope: AttendanceScope.SISWA, startTime: start, endTime: end },
        update: { type: mapAttendanceType(j.type), startTime: start, endTime: end },
      });
    }
  }

  const [jadwalRows]: any = await conn.query('SELECT * FROM tabel_jam_absen_guru');
  for (const g of jadwalRows) {
    const nik = String(g.nik || '').trim();
    const userId = nikToUserId.get(nik);
    const weekday = mapWeekday(g.hari);
    const start = parseTime(g.mulai);
    const end = parseTime(g.selesai);
    if (!userId) { orphanReports.push(`tabel_jam_absen_guru #${g.id}: NIK ${nik} tak ditemukan.`); continue; }
    if (!weekday || !start || !end) { dataIssues.push(`tabel_jam_absen_guru #${g.id}: hari/jam invalid.`); continue; }
    counters.schedules++;
    if (!isDryRun) {
      await prisma.teacherSchedule.upsert({
        where: { legacyId: g.id },
        create: { legacyId: g.id, teacherId: userId, weekday, startTime: start, endTime: end },
        update: { teacherId: userId, weekday, startTime: start, endTime: end },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Hari libur (tabel_libur) — tanggal varchar -> date
// ---------------------------------------------------------------------------
async function loadHolidays(conn: any) {
  console.log('[6] Migrasi hari libur...');
  const [rows]: any = await conn.query('SELECT * FROM tabel_libur');
  for (const h of rows) {
    const date = cleanDate(h.tanggal);
    if (!date) { dataIssues.push(`tabel_libur #${h.id}: tanggal tidak valid "${h.tanggal}".`); continue; }
    counters.holidays++;
    if (!isDryRun) {
      await prisma.holiday.upsert({
        where: { legacyId: h.id },
        create: {
          legacyId: h.id,
          type: mapHolidayType(h.type),
          date,
          description: h.keterangan || null,
          isActive: String(h.status || '').toLowerCase() === 'aktif',
        },
        update: {
          type: mapHolidayType(h.type),
          date,
          description: h.keterangan || null,
          isActive: String(h.status || '').toLowerCase() === 'aktif',
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Catatan kehadiran: siswa (tabel_detail_absen) + guru (tabel_detail_absen_guru)
//    Agregasi per (user, tanggal): masuk→checkInAt, keluar→checkOutAt.
// ---------------------------------------------------------------------------
async function loadAttendance(conn: any) {
  console.log('[7] Migrasi catatan kehadiran (siswa & guru)...');

  // 7a. Siswa
  const [detRows]: any = await conn.query('SELECT * FROM tabel_detail_absen ORDER BY tanggal_absen, jam_absen');
  const studentDaily = new Map<string, any>(); // key: userId|date
  for (const d of detRows) {
    const nis = String(d.nis || '').trim();
    const userId = nisToUserId.get(nis);
    const date = cleanDate(d.tanggal_absen);
    if (!userId) { orphanReports.push(`tabel_detail_absen #${d.id_detail}: NIS ${nis} tak ditemukan.`); continue; }
    if (!date) { dataIssues.push(`tabel_detail_absen #${d.id_detail}: tanggal invalid.`); continue; }
    const key = `${userId}|${date.toISOString().slice(0, 10)}`;
    const rec = studentDaily.get(key) || {
      userId, date, checkInAt: null, checkOutAt: null,
      status: deriveStatus(d.keterangan), note: d.keterangan || null,
      classId: null, majorId: null,
    };
    const ts = combineDateTime(d.tanggal_absen, d.jam_absen);
    if (d.masuk == 1 || mapAttendanceType(d.keterangan) === AttendanceType.MASUK) rec.checkInAt = rec.checkInAt || ts;
    if (d.keluar == 1) rec.checkOutAt = ts;
    if (!rec.checkInAt && !rec.checkOutAt) rec.checkInAt = ts;
    studentDaily.set(key, rec);
  }
  for (const rec of studentDaily.values()) {
    counters.attendanceStudent++;
    if (!isDryRun) {
      await prisma.attendanceRecord.upsert({
        where: { userId_date: { userId: rec.userId, date: rec.date } },
        create: rec,
        update: { checkInAt: rec.checkInAt, checkOutAt: rec.checkOutAt, status: rec.status, note: rec.note },
      });
    }
  }

  // 7b. Guru
  const [detGuruRows]: any = await conn.query('SELECT * FROM tabel_detail_absen_guru ORDER BY tanggal_absen, jam_absen');
  const teacherDaily = new Map<string, any>();
  for (const d of detGuruRows) {
    const nik = String(d.nik || '').trim();
    const userId = nikToUserId.get(nik);
    const date = cleanDate(d.tanggal_absen);
    if (!userId) { orphanReports.push(`tabel_detail_absen_guru #${d.id_detail}: NIK ${nik} tak ditemukan.`); continue; }
    if (!date) { dataIssues.push(`tabel_detail_absen_guru #${d.id_detail}: tanggal invalid.`); continue; }
    const key = `${userId}|${date.toISOString().slice(0, 10)}`;
    const rec = teacherDaily.get(key) || {
      userId, date, checkInAt: null, checkOutAt: null,
      status: deriveStatus(d.ket_absen || d.keterangan), note: d.keterangan || d.ket_absen || null,
      classId: null, majorId: null,
    };
    const ts = combineDateTime(d.tanggal_absen, d.jam_absen);
    if (d.masuk == 1) rec.checkInAt = rec.checkInAt || ts;
    if (d.keluar == 1) rec.checkOutAt = ts;
    if (!rec.checkInAt && !rec.checkOutAt) rec.checkInAt = ts;
    teacherDaily.set(key, rec);
  }
  for (const rec of teacherDaily.values()) {
    counters.attendanceTeacher++;
    if (!isDryRun) {
      await prisma.attendanceRecord.upsert({
        where: { userId_date: { userId: rec.userId, date: rec.date } },
        create: rec,
        update: { checkInAt: rec.checkInAt, checkOutAt: rec.checkOutAt, status: rec.status, note: rec.note },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Perizinan: siswa (tabel_izin) + guru (tabel_izin_guru)
// ---------------------------------------------------------------------------
async function loadLeaveRequests(conn: any) {
  console.log('[8] Migrasi perizinan (siswa & guru)...');

  const resolveApprover = (pemberi: any): { id: number | null; name: string | null } => {
    const raw = String(pemberi || '').trim();
    if (!raw) return { id: null, name: null };
    const byEmail = emailToUserId.get(raw.toLowerCase());
    if (byEmail) return { id: byEmail, name: raw };
    return { id: null, name: raw };
  };

  const [izinRows]: any = await conn.query('SELECT * FROM tabel_izin');
  for (const z of izinRows) {
    const nis = String(z.nis_siswa || '').trim();
    const userId = nisToUserId.get(nis);
    const date = cleanDate(z.tanggal_izin);
    if (!userId) { orphanReports.push(`tabel_izin #${z.id}: NIS ${nis} tak ditemukan.`); continue; }
    if (!date) { dataIssues.push(`tabel_izin #${z.id}: tanggal izin invalid.`); continue; }
    const approver = resolveApprover(z.pemberi_izin);
    counters.leaveStudent++;
    if (!isDryRun) {
      await prisma.leaveRequest.create({
        data: {
          userId, type: z.type || 'Izin', reason: z.keterangan || null,
          proofUrl: z.file_bukti || null, leaveDate: date, status: mapLeaveStatus(z.status),
          approverId: approver.id, approverName: approver.name,
        },
      });
    }
  }

  const [izinGuruRows]: any = await conn.query('SELECT * FROM tabel_izin_guru');
  for (const z of izinGuruRows) {
    const nik = String(z.nik_guru || '').trim();
    const userId = nikToUserId.get(nik);
    const date = cleanDate(z.tanggal_izin);
    if (!userId) { orphanReports.push(`tabel_izin_guru #${z.id}: NIK ${nik} tak ditemukan.`); continue; }
    if (!date) { dataIssues.push(`tabel_izin_guru #${z.id}: tanggal izin invalid.`); continue; }
    const approver = resolveApprover(z.pemberi_izin);
    counters.leaveTeacher++;
    if (!isDryRun) {
      await prisma.leaveRequest.create({
        data: {
          userId, type: z.type || 'Izin', reason: z.keterangan || null,
          proofUrl: z.file_bukti || null, leaveDate: date, status: mapLeaveStatus(z.status),
          approverId: approver.id, approverName: approver.name,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Tulis laporan rekonsiliasi
// ---------------------------------------------------------------------------
function writeReport() {
  console.log('[9] Menulis laporan rekonsiliasi...');
  const docsDir = path.resolve(__dirname, '../../../../docs');
  const reportPath = path.join(docsDir, '07-laporan-rekonsiliasi-absen.md');
  const section = (title: string, items: string[]) =>
    `## ${title} (${items.length})\n${items.length ? items.map(i => `- ${i}`).join('\n') : '_Tidak ada._'}\n`;

  const content = `# Laporan Rekonsiliasi Penggabungan Absensi (Fase A1)

- **Tanggal:** ${new Date().toISOString()}
- **Mode:** ${isDryRun ? 'DRY-RUN (Simulasi, tidak menulis)' : 'LIVE WRITE'}

## Ringkasan Jumlah
- Jendela jam absen: ${counters.windows}
- Jadwal guru: ${counters.schedules}
- Hari libur: ${counters.holidays}
- Kehadiran siswa (hari-orang): ${counters.attendanceStudent}
- Kehadiran guru (hari-orang): ${counters.attendanceTeacher}
- Izin siswa: ${counters.leaveStudent}
- Izin guru: ${counters.leaveTeacher}

${section('User Cocok dengan LMS (identitas disatukan)', matchedUsers)}
${section('User Baru Khusus Absen', createdUsers)}
${section('Konflik Email', emailConflicts)}
${section('Catatan Kebijakan Password', passwordNotices)}
${section('Data Yatim (Orphan) — nis/nik tak terpetakan', orphanReports)}
${section('Masalah Data (tanggal/jam invalid)', dataIssues)}
`;
  fs.writeFileSync(reportPath, content, 'utf-8');
  console.log(`    Laporan disimpan: ${reportPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== ETL REKONSILIASI ABSENSI (${isDryRun ? 'DRY-RUN' : 'LIVE WRITE'}) ===\n`);
  const conn = await createAbsenSourceConnection();
  try {
    await buildIdentityMaps();
    await reconcileStudents(conn);
    await reconcileTeachers(conn);
    await reconcileAdmins(conn);
    await mergeMasterData(conn);
    await loadWindowsAndSchedules(conn);
    await loadHolidays(conn);
    await loadAttendance(conn);
    await loadLeaveRequests(conn);
    writeReport();
    console.log('\n=== ETL REKONSILIASI ABSENSI SELESAI ===\n');
  } catch (err) {
    console.error('ETL Absen Error:', err);
    process.exit(1);
  } finally {
    await conn.end();
    await prisma.$disconnect();
  }
}

main();
